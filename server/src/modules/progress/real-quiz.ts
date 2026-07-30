/**
 * real-quiz.ts — 真实题库加载（production 习题目录）
 * 物理结构：{contentRoot}/generated_stories/学科启蒙/{F1识字|F2英语}/{课=word_id}/习题/编号XX/verify.json
 * verify.json：{ type, prompt, options:[{label}], answer:索引 }（题目与答案同文件，仅服务端读取，答案不下发）。
 * 拼音无习题目录；读不到/坏文件时返回空数组，调用方回退合成题（保证功能可用）。
 */
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { SecretQuestion } from './quiz.util';

const OPTION_IDS = ['A', 'B', 'C', 'D'];
const SUBJECT_DIR: Record<string, string> = { 识字: 'F1识字', 英语: 'F2英语' };

interface VerifyJson {
  type?: string;
  prompt?: string;
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
 * 按课取真实习题。
 * 英语强制组合：编号10-19(一道 1X) + 20-29(一道 2X) + 30+(两道 3-9X 完型) = 4 道。
 * 识字：随机 take 道（实测编号分布已合理）。
 * wordId 即课目录名（词表 LessonEntry.id = 课 title，如「识字0：学写'的'字」）。
 */
export async function loadRealQuiz(contentRoot: string, subject: string, wordId: string, take = 4): Promise<SecretQuestion[]> {
  const dir = SUBJECT_DIR[subject];
  if (!dir) return [];
  const base = join(contentRoot, 'generated_stories', '学科启蒙', dir, wordId, '习题');
  let nums: string[] = [];
  try {
    nums = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name);
  } catch {
    return []; // 无习题目录 → 回退合成题
  }

  let picked: string[];
  if (subject === '英语') {
    // 英语强制组合：1X(编号10-19) + 2X(编号20-29) + 2道完型(编号30+)
    const g1 = shuffle(nums.filter((n) => { const v = parseInt(n.replace(/\D/g, ''), 10); return v >= 10 && v < 20; }));
    const g2 = shuffle(nums.filter((n) => { const v = parseInt(n.replace(/\D/g, ''), 10); return v >= 20 && v < 30; }));
    const g3 = shuffle(nums.filter((n) => { const v = parseInt(n.replace(/\D/g, ''), 10); return v >= 30; }));
    picked = [...g1.slice(0, 1), ...g2.slice(0, 1), ...g3.slice(0, 2)];
    if (picked.length < 4) picked = shuffle(nums).slice(0, take); // 兑底
  } else {
    picked = shuffle(nums).slice(0, take);
  }
  const out: SecretQuestion[] = [];
  for (const n of picked) {
    try {
      const v = JSON.parse(await readFile(join(base, n, 'verify.json'), 'utf8')) as VerifyJson;
      const opts = (v.options ?? []).slice(0, 4);
      if (!v.prompt || opts.length < 2 || typeof v.answer !== 'number' || v.answer < 0 || v.answer >= opts.length) continue;
      out.push({
        question_id: `real_${n}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: (v.type || 'recognition') as SecretQuestion['type'],
        stem: v.prompt,
        options: opts.map((o, i) => ({ option_id: OPTION_IDS[i], text: o.label || '' })),
        correct_option: OPTION_IDS[v.answer],
      });
    } catch {
      /* 单题坏文件跳过 */
    }
  }
  return out;
}
