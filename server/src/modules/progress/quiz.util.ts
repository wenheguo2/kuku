/**
 * quiz.util.ts — 挑战题目生成与判分（服务端权威）
 * 权威口径：md/00 §4.3、md/04 §3.3、md/11 §5。
 *
 * 题型（普通挑战随机 4 题 = 1 听音选字 + 1 看字选拼音 + 2 看字选组词）：
 *  - recognition   听音选字（1X）
 *  - pinyin        看字选拼音（2X）
 *  - word_formation看字选组词（3-9X，2 道）
 *
 * 普通挑战通过标准（按学科区分）：
 *  - 识字：recognition 对 且 word_formation 至少 1 道对（pinyin 可错）
 *  - 英语：recognition 对 且 pinyin 对 且 word_formation 至少 1 道对
 *  - 拼音：无习题（不走普通挑战判分，靠学习完成晋级）
 *
 * ⚠️ 题库来源：当前无独立词库/题库表，选项为服务端合成（占位干扰项）。
 *    真实词库接入后替换 buildOptions() 即可，判分管线与接口契约不变（记为 TODO，见 开发文档/server/progress.md）。
 */
import { Subject } from '../../entities/learning-progress.entity';

export type QuestionType = 'recognition' | 'pinyin' | 'word_formation';

/** 下发给前端的题目（★ 不含 correct，正确答案仅存服务端） */
export interface PublicQuestion {
  question_id: string;
  type: QuestionType;
  audio_url?: string;
  stem?: string;
  options: { option_id: string; text: string }[];
}

/** 服务端保存的题目（含正确答案） */
export interface SecretQuestion extends PublicQuestion {
  correct_option: string;
}

const OPTION_IDS = ['A', 'B', 'C', 'D'];

/** 合成一道题的干扰项（占位；真实词库到位后替换） */
function buildOptions(correctText: string, pool: string[]): { options: { option_id: string; text: string }[]; correct: string } {
  const distractors = pool.filter((p) => p !== correctText).slice(0, 3);
  const texts = [correctText, ...distractors].slice(0, 4);
  // 洗牌
  for (let i = texts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [texts[i], texts[j]] = [texts[j], texts[i]];
  }
  const options = texts.map((t, i) => ({ option_id: OPTION_IDS[i], text: t }));
  const correct = options.find((o) => o.text === correctText)!.option_id;
  return { options, correct };
}

/**
 * 生成一次普通挑战的 4 道题（含正确答案，供服务端保存）
 * @param wordId 目标字/词 id
 * @param wordText 目标字/词文本
 */
export function generateNormalQuiz(wordId: string, wordText: string): SecretQuestion[] {
  const charPool = ['的', '是', '和', '有', '在', '人', '这', '中', '大', '来'];
  const pinyinPool = ['de', 'shì', 'hé', 'yǒu', 'zài', 'rén', 'zhè', 'zhōng'];
  const wordPool = [`${wordText}子`, `${wordText}儿`, `小${wordText}`, `大${wordText}`, '朋友', '快乐'];

  const q1 = buildOptions(wordText, charPool);
  const q2 = buildOptions('pīn', pinyinPool.concat('pīn'));
  const q3 = buildOptions(`${wordText}子`, wordPool);
  const q4 = buildOptions(`小${wordText}`, wordPool);

  return [
    { question_id: `${wordId}_q1`, type: 'recognition', audio_url: `/audio/学科启蒙/挑战/${wordId}_test.mp3`, options: q1.options, correct_option: q1.correct },
    { question_id: `${wordId}_q2`, type: 'pinyin', stem: wordText, options: q2.options, correct_option: q2.correct },
    { question_id: `${wordId}_q3`, type: 'word_formation', stem: wordText, options: q3.options, correct_option: q3.correct },
    { question_id: `${wordId}_q4`, type: 'word_formation', stem: wordText, options: q4.options, correct_option: q4.correct },
  ];
}

/** 去掉正确答案，得到可下发前端的题目 */
export function toPublic(questions: SecretQuestion[]): PublicQuestion[] {
  return questions.map(({ correct_option, ...pub }) => pub);
}

export interface JudgedItem {
  question_id: string;
  type: QuestionType;
  is_correct: boolean;
  correct_option: string;
}

/** 逐题判分 */
export function judgeAnswers(
  questions: SecretQuestion[],
  answers: { question_id: string; selected_option: string }[],
): JudgedItem[] {
  const pick = new Map(answers.map((a) => [a.question_id, a.selected_option]));
  return questions.map((q) => ({
    question_id: q.question_id,
    type: q.type,
    is_correct: pick.get(q.question_id) === q.correct_option,
    correct_option: q.correct_option,
  }));
}

/** 按学科判定普通挑战是否通过 */
export function isNormalPassed(subject: Subject, judged: JudgedItem[]): boolean {
  const recognition = judged.find((j) => j.type === 'recognition')?.is_correct ?? false;
  const pinyin = judged.find((j) => j.type === 'pinyin')?.is_correct ?? false;
  const wordCorrect = judged.filter((j) => j.type === 'word_formation' && j.is_correct).length;

  if (subject === '识字') return recognition && wordCorrect >= 1;
  if (subject === '英语') return recognition && pinyin && wordCorrect >= 1;
  // 拼音无习题，不应走到此处
  return recognition;
}
