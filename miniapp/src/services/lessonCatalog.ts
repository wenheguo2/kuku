/**
 * services/lessonCatalog — F1 真实课程目录（学科启蒙/F1识字·F2英语·F3拼音）
 * 词表来源=课程索引 entries，课名即词：
 *  - 识字N：学写'X'字 → X    - 英语N：单词word → word    - 拼音N：a → a
 * 课内资源（约定目录）：
 *  - 讲解文本  /static/generated_stories/{path}/学习1|2|3/segments.json
 *  - 讲解音频  /static/audio/{path}/学习1|2|3/full.mp3
 * USE_MOCK 时返回内置小词表（结构同真实）。
 */
import { indexLoader } from './indexLoader';
import { CONFIG } from './config';

export interface LessonEntry {
  /** 唯一 id（=课 title，进度/挑战用） */
  id: string;
  /** 词/字/字母本体 */
  text: string;
  /** 课目录 path（学科启蒙/F1识字/识字0：学写'的'字） */
  path: string;
  /** 课序号（按课名内编号排序） */
  seq: number;
}

const SUBJECT_DIR: Record<string, string> = { 识字: 'F1识字', 英语: 'F2英语', 拼音: 'F3拼音' };

const MOCK_WORDS: Record<string, LessonEntry[]> = {
  识字: [
    { id: '的_001', text: '的', path: '', seq: 0 },
    { id: '是_001', text: '是', path: '', seq: 1 },
    { id: '有_001', text: '有', path: '', seq: 2 },
  ],
  英语: [
    { id: 'apple_001', text: 'apple', path: '', seq: 0 },
    { id: 'cat_001', text: 'cat', path: '', seq: 1 },
  ],
  拼音: [
    { id: 'a_001', text: 'ā', path: '', seq: 0 },
    { id: 'o_001', text: 'ō', path: '', seq: 1 },
  ],
};

function parseWord(subject: string, title: string): string | null {
  if (subject === '识字') { const m = title.match(/学写'(.+?)'字/); return m ? m[1] : null; }
  if (subject === '英语') { const m = title.match(/单词(.+)$/); return m ? m[1].trim() : null; }
  if (subject === '拼音') { const m = title.match(/[:：](.+)$/); return m ? m[1].trim() : null; }
  return null;
}
const parseSeq = (title: string) => { const m = title.match(/(\d+)/); return m ? Number(m[1]) : 0; };

interface RawEntry { title?: string; path?: string }

/** 拉某学科完整词表（识字 3499/英语 3910/拼音 100），按课号排序；解析失败的条目跳过 */
export async function loadLessonEntries(subject: string): Promise<LessonEntry[]> {
  if (CONFIG.USE_MOCK) return MOCK_WORDS[subject] ?? [];
  const dir = SUBJECT_DIR[subject];
  if (!dir) return [];
  const idx = await indexLoader.loadIndexByPath(`学科启蒙/${dir}`) as { entries?: RawEntry[] };
  const list: LessonEntry[] = [];
  (idx.entries ?? []).forEach((e) => {
    const title = e.title || '';
    const text = parseWord(subject, title);
    if (text && e.path) list.push({ id: title, text, path: e.path, seq: parseSeq(title) });
  });
  list.sort((a, b) => a.seq - b.seq);
  return list;
}

/** 学习挡位 → 课内目录名 */
export const STUDY_DIR: Record<string, string> = { study1: '学习1', study2: '学习2', study3: '学习3' };

/**
 * 按学科解析学习目录相对路径（实测物理结构，2026-07-29 按实际目录修正）：
 *  - 识字：{课}/学习1|2|3；拼音：{课}/学习1|2
 *  - 英语：{课}/英语初阶(学习1|2) | 英语中阶(学习1|2|3) | 英语高阶(学习1)——各难度学习数不同
 */
export function resolveStudyDir(subject: string, studyType: string, enLevel: 1 | 2 | 3 = 1): string {
  const study = STUDY_DIR[studyType] || '学习1';
  if (subject === '英语') {
    const level = enLevel === 3 ? '英语高阶' : enLevel === 2 ? '英语中阶' : '英语初阶';
    return `${level}/${study}`;
  }
  return study;
}

/** 英语各难度的学习挡数（实测目录：初阶2、中阶3、高阶1） */
export const EN_LEVEL_STUDIES: Record<1 | 2 | 3, number> = { 1: 2, 2: 3, 3: 1 };

/** 各学科可用学习挡（实测目录：识字 3 挡、拼音 2 挡、英语按难度 初2/中3/高1） */
export function studyOptions(subject: string, enLevel: 1 | 2 | 3 = 1): { key: string; label: string }[] {
  const make = (n: number) => Array.from({ length: n }, (_, i) => ({ key: `study${i + 1}`, label: `学习${i + 1}` }));
  if (subject === '英语') return make(EN_LEVEL_STUDIES[enLevel]);
  if (subject === '拼音') return make(2);
  return make(3);
}
