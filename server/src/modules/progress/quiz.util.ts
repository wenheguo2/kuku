/**
 * quiz.util.ts — 挑战题目生成与判分（服务端权威）
 * 权威口径：md/00 §4.3、md/04 §3.3、md/11 §5。
 *
 * 题型（普通挑战 4 题）：
 *  - ★实际走真实题库（real-quiz.ts），题组配方见其 QUIZ_PLAN：
 *      识字 = 1X 听音选字 + 2X 看字选拼音 + 3X+ 看字选组词×2
 *      英语 = 1X + 3X+ 完型×3（**已取消 2X 听发音选单词**）
 *  - 下方合成题仅作无题/坏文件时的回退：
 *      recognition   听音选字（1X）
 *      pinyin        看字选拼音（2X）
 *      word_formation看字选组词（3-9X，2 道）
 *
 * 普通挑战通过标准：
 *  - ★真实题库（当前默认）：答对 ≥ 75%（4 题对 3），不分学科
 *  - 回退合成题：识字/英语均为 recognition 对 且 word_formation 至少 1 道对
 *    （英语原本额外要求 pinyin 对，因 2X 题组已取消而去除）
 *  - 拼音：无习题（不走普通挑战判分，靠学习完成晋级）
 *
 * ⚠️ 题库来源：★真实题库已接入（real-quiz.ts 读 production 习题 verify.json，2026-07-29），本文件合成题仅作无题/坏文件时的回退。
 */
import { Subject } from '../../entities/learning-progress.entity';

export type QuestionType =
  | 'recognition' | 'pinyin' | 'word_formation'
  // ★真实题库题型（production 习题 verify.json，2026-07-29 接入）
  | 'sound_to_char' | 'char_to_sound' | 'char_to_word'
  | 'word_to_meaning' | 'word_to_sound' | 'sentence_fill';

/** 下发给前端的题目（★ 不含 correct/explanation，正确答案与讲解仅存服务端，判分后才回传讲解） */
export interface PublicQuestion {
  question_id: string;
  type: QuestionType;
  /** 题目音频（听力题的发音 / 完型题的句子朗读）；real-quiz 按 *_audio_ref 拼 /static 实文件 */
  audio_url?: string;
  stem?: string;
  /** ★目标单词/字（word_to_meaning 等题型需大字展示，否则“这个单词什么意思”无主语） */
  word?: string;
  options: { option_id: string; text: string }[];
}

/** 服务端保存的题目（含正确答案与讲解） */
export interface SecretQuestion extends PublicQuestion {
  correct_option: string;
  /** ★讲解文字（来自 verify.json explanation），仅在提交判分后随结果下发 */
  explanation?: string;
  /** ★讲解配音 URL（来自 explanation_audio_ref） */
  explanation_audio_url?: string;
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

/** 去掉正确答案与讲解，得到可下发前端的题目（★explanation 会直接泄题，必须剔除） */
export function toPublic(questions: SecretQuestion[]): PublicQuestion[] {
  return questions.map(({ correct_option, explanation, explanation_audio_url, ...pub }) => pub);
}

export interface JudgedItem {
  question_id: string;
  type: QuestionType;
  is_correct: boolean;
  correct_option: string;
  /** ★判分后回传：错题讲解文字与配音（教育价值最高的部分，不能丢） */
  explanation?: string;
  explanation_audio_url?: string;
}

/** 逐题判分（同时带回讲解，供结果页展示） */
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
    explanation: q.explanation,
    explanation_audio_url: q.explanation_audio_url,
  }));
}

/** 按学科判定普通挑战是否通过 */
export function isNormalPassed(subject: Subject, judged: JudgedItem[]): boolean {
  // ★真实题库（question_id 以 real_ 开头）：统一标准—答对 ≥ 75%（4 题对 3）
  if (judged.some((j) => j.question_id.startsWith('real_'))) {
    const correct = judged.filter((j) => j.is_correct).length;
    return correct >= Math.ceil(judged.length * 0.75);
  }
  const recognition = judged.find((j) => j.type === 'recognition')?.is_correct ?? false;
  const pinyin = judged.find((j) => j.type === 'pinyin')?.is_correct ?? false;
  const wordCorrect = judged.filter((j) => j.type === 'word_formation' && j.is_correct).length;

  if (subject === '识字') return recognition && wordCorrect >= 1;
  // ★英语：题组已取消 2X（听发音选单词 / pinyin 位），不再把 pinyin 当必要条件，
  //   否则回退合成题路径下英语永远无法通过；口径与识字对齐
  if (subject === '英语') return recognition && wordCorrect >= 1;
  // 拼音无习题，不应走到此处
  return recognition;
}
