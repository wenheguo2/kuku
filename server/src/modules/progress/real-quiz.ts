/**
 * real-quiz.ts — 真实题库加载（production 习题目录）
 * 物理结构：
 *   题面：{contentRoot}/generated_stories/学科启蒙/{F1识字|F2英语}/{课=word_id}/习题/编号XX/verify.json
 *   配音：{contentRoot}/audio/学科启蒙/{F1识字|F2英语}/{课=word_id}/习题/编号XX/{audio_ref}.mp3
 *         → 对外 URL：/static/audio/…（ServeStaticModule 把 production 映射到 /static）
 *
 * ★ verify.json 字段完整消费（2026-07-30 修正，此前只读了 type/prompt/options/answer 导致三处缺陷）：
 *   - `prompt`             题干；**含「选项A xx 选项B xx」尾巴是给 TTS 念的**，展示前必须剥掉
 *   - `word`               目标单词/字 → word_to_meaning 等题型需大字展示
 *   - `sentence_blank`     完型题的真句子（含 ____）→ sentence_fill 的 stem 必须用它，不能用 prompt
 *   - `prompt_audio_ref` / `sentence_audio_ref` / `word_audio_ref` → 题目音频（第二题原来没声音的根因）
 *   - `explanation` + `explanation_audio_ref` → 讲解文字/配音，判分后随结果下发
 *
 * ★ 题组配方（用户定，见 QUIZ_PLAN）：
 *   识字 = 1X 听音选字×1 + 2X 看字选拼音×1 + 3X+ 看字选组词×2
 *   英语 = 1X×1 + 3X+ 完型×3（**已彻底取消 2X 听发音选单词**）
 * 拼音无习题目录；读不到/坏文件时返回空数组，调用方回退合成题（保证功能可用）。
 */
import { readdir, readFile, access } from 'fs/promises';
import { join } from 'path';
import { SecretQuestion, QuestionType } from './quiz.util';

const OPTION_IDS = ['A', 'B', 'C', 'D'];
const SUBJECT_DIR: Record<string, string> = { 识字: 'F1识字', 英语: 'F2英语' };

/**
 * ★只能听的题型（stem 是给 TTS 的原文，下发即泄题）：
 *  - sound_to_char：听“能组词‘目的’…”选字 → prompt 含答案，绝对不能显
 *  - word_to_sound：听发音选单词 → prompt 含目标词，不能显
 *  - recognition  ：合成题的听音选字
 * ★ char_to_sound（看字选拼音）与 char_to_word（看字选组词）**不属于此类**：
 *   它们必须把目标字展示出来，否则“这个字怎么读”无指代对象（实测反馈的缺陷）。
 */
const AUDIO_ONLY_TYPES = new Set<QuestionType>(['recognition', 'sound_to_char', 'word_to_sound']);

/**
 * ★看字类题型：必须展示目标字/词；且**不下发音频**
 * （这两类的 prompt_audio 只是干巴巴念题干“这个字怎么读？”，无教学价值，白占一个播放按钮）
 */
const SHOW_WORD_NO_AUDIO_TYPES = new Set<QuestionType>(['char_to_sound', 'char_to_word']);

/**
 * ★按学科的题组配方（编号前缀 = 题组），用户定：
 *  - 识字：1X 听音选字 ×1 + 2X 看字选拼音 ×1 + 3X+ 看字选组词 ×2
 *  - 英语：**彻底取消 2X（听发音选单词）**，改为 1X ×1 + 3X+ 完型 ×3
 *    该约束在本函数统一兑现，因此普通挑战与综合挑战（只取 [0]）任何路径都不可能抽到英语 2X
 */
const QUIZ_PLAN: Record<string, { g1: number; g2: number; g3: number }> = {
  识字: { g1: 1, g2: 1, g3: 2 },
  英语: { g1: 1, g2: 0, g3: 3 },
};
const DEFAULT_PLAN = { g1: 1, g2: 1, g3: 2 };

interface VerifyJson {
  type?: string;
  prompt?: string;
  word?: string;
  word_audio_ref?: string;
  sentence_blank?: string;
  sentence_audio_ref?: string;
  explanation?: string;
  explanation_audio_ref?: string;
  prompt_audio_ref?: string;
  options?: { label?: string }[];
  answer?: number;
}

/** 洗牌（Fisher-Yates） */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * ★从课名提取目标字/词（识字题库 verify.json 没有 word 字段，必须从这里拿）
 *  识字：「识字0：学写'的'字」 → 的（引号内，兼容直/弯引号）
 *  英语：「英语0：单词animal」 → animal
 *  拼音/其他：取冒号后尾段兼容
 */
function extractTargetWord(wordId: string): string {
  const quoted = wordId.match(/['‘’「“]([^'‘’」”]+)['‘’」”]/);
  if (quoted?.[1]) return quoted[1];
  const en = wordId.match(/单词\s*([A-Za-z][A-Za-z\-' ]*)/);
  if (en?.[1]) return en[1].trim();
  const tail = wordId.split(/[:：]/).pop() || '';
  return tail.replace(/^\s*(学写|单词|认读)\s*/, '').replace(/字$/, '').trim();
}

/** /static 下的音频地址（逐段 encodeURIComponent，目录含中文与全角冒号） */
function audioUrl(subjectDir: string, wordId: string, numDir: string, ref: string): string {
  const segs = ['audio', '学科启蒙', subjectDir, wordId, '习题', numDir, `${ref}.mp3`];
  return `/static/${segs.map(encodeURIComponent).join('/')}`;
}

/** 音频文件是否真实存在（避免下发 404 让前端播放器空转） */
async function exists(p: string): Promise<boolean> {
  try { await access(p); return true; } catch { return false; }
}

/**
 * 剥掉 prompt 尾部给 TTS 念的选项串。
 * 例：「听句子，选正确的单词填空 选项A animal 选项B fish 选项C dog 选项D cat」→「听句子，选正确的单词填空」
 */
function stripOptionTail(prompt: string): string {
  return prompt.replace(/\s*选项\s*[A-Da-d][\s\S]*$/, '').trim();
}

/**
 * 按课取真实习题。
 * 英语强制组合：编号10-19(一道 1X) + 20-29(一道 2X) + 30+(两道 3-9X 完型) = 4 道。
 * 识字：随机 take 道（实测编号分布已合理）。
 * wordId 即课目录名（词表 LessonEntry.id = 课 title，如「识字0：学写'的'字」）。
 */
export async function loadRealQuiz(contentRoot: string, subject: string, wordId: string, take = 4): Promise<SecretQuestion[]> {
  const dir = SUBJECT_DIR[subject];
  if (!dir) return [];
  const base = join(contentRoot, 'generated_stories', '学科启蒙', dir, wordId, '习题');
  const audioBase = join(contentRoot, 'audio', '学科启蒙', dir, wordId, '习题');
  let nums: string[] = [];
  try {
    nums = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return []; // 无习题目录 → 回退合成题
  }

  let picked: string[];
  // ★按学科配方组题（见 QUIZ_PLAN）：识字 1X+2X+3X×2；英语 1X+3X×3（已取消 2X）
  const plan = QUIZ_PLAN[subject] ?? DEFAULT_PLAN;
  const numOf = (n: string) => parseInt(n.replace(/\D/g, ''), 10);
  const inG2 = (n: string) => { const v = numOf(n); return v >= 20 && v < 30; };
  const g1 = shuffle(nums.filter((n) => { const v = numOf(n); return v >= 10 && v < 20; }));
  const g2 = plan.g2 > 0 ? shuffle(nums.filter(inG2)) : [];
  // 3X+ 内部优先取 30-39：实测只有 30-34 配了句子朗读 mp3，40-49 仅有讲解音，优先他们能多一个“听句子”
  const g3a = shuffle(nums.filter((n) => { const v = numOf(n); return v >= 30 && v < 40; }));
  const g3b = shuffle(nums.filter((n) => { const v = numOf(n); return v >= 40; }));
  const g3 = [...g3a, ...g3b];
  picked = [...g1.slice(0, plan.g1), ...g2.slice(0, plan.g2), ...g3.slice(0, plan.g3)];
  // 缺组兼容（旧目录/编号不全）：随机补齐，但**英语仍绝不含 2X**
  if (picked.length < Math.min(take, nums.length)) {
    const pool = plan.g2 > 0 ? nums : nums.filter((n) => !inG2(n));
    picked = shuffle(pool).slice(0, take);
  }

  const out: SecretQuestion[] = [];
  const targetWord = extractTargetWord(wordId); // 课名里的目标字/词（识字题库无 word 字段，靠此兜底）
  for (const n of picked) {
    try {
      const v = JSON.parse(await readFile(join(base, n, 'verify.json'), 'utf8')) as VerifyJson;
      const opts = (v.options ?? []).slice(0, 4);
      if (!v.prompt || opts.length < 2 || typeof v.answer !== 'number' || v.answer < 0 || v.answer >= opts.length) continue;
      const type = (v.type || 'recognition') as QuestionType;
      const showWordOnly = SHOW_WORD_NO_AUDIO_TYPES.has(type);

      // ---- 题目音频：句子题优先句子朗读；看字类不给音频（念题干无意义）；仅下发真存在的文件 ----
      let audio: string | undefined;
      if (!showWordOnly) {
        const refs = type === 'sentence_fill'
          ? [v.sentence_audio_ref, v.prompt_audio_ref, v.word_audio_ref]
          : [v.prompt_audio_ref, v.word_audio_ref, v.sentence_audio_ref];
        for (const ref of refs) {
          if (!ref) continue;
          if (await exists(join(audioBase, n, `${ref}.mp3`))) { audio = audioUrl(dir, wordId, n, ref); break; }
        }
      }

      // ---- 题面：完型用真句子；只听题不给 stem（防泄题）；其余用剔掉选项串的 prompt ----
      let stem: string | undefined;
      if (type === 'sentence_fill') {
        stem = (v.sentence_blank || '').trim() || stripOptionTail(v.prompt);
      } else if (!AUDIO_ONLY_TYPES.has(type)) {
        stem = stripOptionTail(v.prompt);
        // 编号22 这类 prompt 本身就是目标字（剔完选项串后只剩“的”），与大字 word 重复 → 改回标准问法
        if (stem && targetWord && stem === targetWord) stem = type === 'char_to_sound' ? '这个字怎么读？' : '哪个是这个字的组词？';
      }

      // ---- 讲解配音（仅存在才给） ----
      let expAudio: string | undefined;
      if (v.explanation_audio_ref && await exists(join(audioBase, n, `${v.explanation_audio_ref}.mp3`))) {
        expAudio = audioUrl(dir, wordId, n, v.explanation_audio_ref);
      }

      out.push({
        question_id: `real_${n}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        stem,
        // ★目标字/词：verify.json 优先，没有则用课名提取。两类题型必须不给，否则直接送答案：
        //   1) 只听题（听音选字/听音选词）——答案就是目标字词
        //   2) 完型填空——目标词往往正是要填的空（实测：“A lion is a wild ____.” 答案 animal），
        //      且完型题靠句子作答，本来不需要展示目标词
        word: (AUDIO_ONLY_TYPES.has(type) || type === 'sentence_fill')
          ? undefined
          : (v.word || targetWord || undefined),
        audio_url: audio,
        options: opts.map((o, i) => ({ option_id: OPTION_IDS[i], text: o.label || '' })),
        correct_option: OPTION_IDS[v.answer],
        explanation: (v.explanation || '').trim() || undefined,
        explanation_audio_url: expAudio,
      });
    } catch {
      /* 单题坏文件跳过 */
    }
  }
  return out;
}
