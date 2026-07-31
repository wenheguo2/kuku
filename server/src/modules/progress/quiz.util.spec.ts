/**
 * quiz.util.spec.ts — 挑战判分规则单元测试
 * 验证 md/00 §4.3 / md/04 §3.3 的按学科通过标准与服务端判分正确性。
 */
import { generateNormalQuiz, isNormalPassed, judgeAnswers, JudgedItem, SecretQuestion } from './quiz.util';

/** 构造一组判定结果 */
function judged(recognition: boolean, pinyin: boolean, word1: boolean, word2: boolean): JudgedItem[] {
  return [
    { question_id: 'q1', type: 'recognition', is_correct: recognition, correct_option: 'A' },
    { question_id: 'q2', type: 'pinyin', is_correct: pinyin, correct_option: 'A' },
    { question_id: 'q3', type: 'word_formation', is_correct: word1, correct_option: 'A' },
    { question_id: 'q4', type: 'word_formation', is_correct: word2, correct_option: 'A' },
  ];
}

describe('isNormalPassed — 识字', () => {
  it('听音对 + 组词≥1对（拼音可错）→ 通过', () => {
    expect(isNormalPassed('识字', judged(true, false, true, false))).toBe(true);
  });
  it('听音错 → 不通过', () => {
    expect(isNormalPassed('识字', judged(false, true, true, true))).toBe(false);
  });
  it('听音对但组词全错 → 不通过', () => {
    expect(isNormalPassed('识字', judged(true, true, false, false))).toBe(false);
  });
});

describe('isNormalPassed — 英语', () => {
  // ★ 2026-07-30：英语题组已取消 2X（听发音选单词 / pinyin 位），
  //   回退合成题口径与识字对齐：听音对 + 组词至少 1 道对，拼音不再是必要条件
  it('听音对 且 组词≥1对 → 通过', () => {
    expect(isNormalPassed('英语', judged(true, true, false, true))).toBe(true);
  });
  it('拼音错但听音对且组词对 → 仍通过（2X 已取消，不再要求拼音）', () => {
    expect(isNormalPassed('英语', judged(true, false, true, true))).toBe(true);
  });
  it('听音错 → 不通过', () => {
    expect(isNormalPassed('英语', judged(false, true, true, true))).toBe(false);
  });
  it('听音对但组词全错 → 不通过', () => {
    expect(isNormalPassed('英语', judged(true, true, false, false))).toBe(false);
  });
});

describe('judgeAnswers — 服务端判分', () => {
  const questions: SecretQuestion[] = [
    { question_id: 'w_q1', type: 'recognition', options: [{ option_id: 'A', text: '的' }, { option_id: 'B', text: '得' }], correct_option: 'A' },
    { question_id: 'w_q2', type: 'pinyin', options: [{ option_id: 'A', text: 'de' }, { option_id: 'B', text: 'dí' }], correct_option: 'B' },
  ];
  it('按存储的正确项逐题判对错', () => {
    const r = judgeAnswers(questions, [
      { question_id: 'w_q1', selected_option: 'A' },
      { question_id: 'w_q2', selected_option: 'A' },
    ]);
    expect(r[0].is_correct).toBe(true);
    expect(r[1].is_correct).toBe(false);
    expect(r[1].correct_option).toBe('B');
  });
});

describe('generateNormalQuiz — 出题结构', () => {
  it('生成 4 题：1 听音 + 1 拼音 + 2 组词，且都带正确答案', () => {
    const qs = generateNormalQuiz('的_001', '的');
    expect(qs).toHaveLength(4);
    expect(qs.filter((q) => q.type === 'recognition')).toHaveLength(1);
    expect(qs.filter((q) => q.type === 'pinyin')).toHaveLength(1);
    expect(qs.filter((q) => q.type === 'word_formation')).toHaveLength(2);
    qs.forEach((q) => expect(q.correct_option).toBeTruthy());
  });
});
