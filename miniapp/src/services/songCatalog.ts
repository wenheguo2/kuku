/**
 * songCatalog.ts — 歌曲目录服务（真实索引接入，2026-07-29 歌曲内容就位）
 * 物理结构：generated_stories/瞎编的歌曲/{分类43个}/{语言子类:中文歌曲|双语歌曲|中文|英文|双语}/{歌名}.mp3 + {歌名}.txt(歌词)
 * 封面：covers/generated/瞎编的歌曲/{分类}/{分类}.jpg（分类级）、{…}/{语言子类}.jpg、{…}/{歌名}/{歌名}_1.jpg（单曲级），索引已带。
 * 索引：index/generated_stories/瞎编的歌曲/_index.json(subject) → {分类}/_index.json(语言子类 categories) → {子类}/_index.json(entries)。
 * USE_MOCK=true 时返回内置 mock（脱离后端跑 UI）。
 */
import { indexLoader } from './indexLoader';
import { CONFIG } from './config';
import { buildAssetUrl, buildCoverUrl } from '@/utils/path';
import { CategoryIndex, SubjectIndex } from '@/types/content';

export interface SongCategory {
  id: string;
  name: string;
  path: string;       // 如 瞎编的歌曲/世界名人
  coverUrl: string;   // 完整 URL（buildCoverUrl 产物），空串=无封面
  count?: number;
}

export interface SongEntry {
  path: string;         // 如 瞎编的歌曲/世界名人/中文歌曲/中文-丁肇中（队列 id）
  title: string;        // 原始标题（中文-丁肇中）
  displayTitle: string; // 展示标题（丁肇中）
  coverUrl: string;     // 完整 URL
  audioUrl: string;     // 完整 URL（generated_stories/{path}.mp3）
  lrcUrl: string;       // 完整 URL（generated_stories/{path}.txt，纯文本歌词）
}

export const SONG_SUBJECT = '瞎编的歌曲';

/** 展示标题清洗：去「中文-/英文-/双语-」语言前缀（物理文件名保留原名） */
export function cleanSongTitle(title?: string | null): string {
  if (!title) return '';
  return title.replace(/^(中文|英文|双语)\s*[-－]\s*/, '');
}

const MOCK_CATEGORIES: SongCategory[] = [
  { id: '摇篮曲', name: '摇篮曲', path: `${SONG_SUBJECT}/摇篮曲`, coverUrl: '', count: 3 },
  { id: '童话故事', name: '童话故事', path: `${SONG_SUBJECT}/童话故事`, coverUrl: '', count: 2 },
  { id: '动物世界', name: '动物世界', path: `${SONG_SUBJECT}/动物世界`, coverUrl: '', count: 3 },
  { id: '神话故事', name: '神话故事', path: `${SONG_SUBJECT}/神话故事`, coverUrl: '', count: 2 },
];
const MOCK_SONGS: SongEntry[] = [
  { path: 'mock/两只老虎', title: '两只老虎', displayTitle: '两只老虎', coverUrl: '', audioUrl: '', lrcUrl: '' },
  { path: 'mock/小星星', title: '小星星', displayTitle: '小星星', coverUrl: '', audioUrl: '', lrcUrl: '' },
  { path: 'mock/数鸭子', title: '数鸭子', displayTitle: '数鸭子', coverUrl: '', audioUrl: '', lrcUrl: '' },
];

/** 歌曲学科下 43 个分类（含封面/数量） */
export async function loadSongCategories(): Promise<SongCategory[]> {
  if (CONFIG.USE_MOCK) return MOCK_CATEGORIES;
  const idx = (await indexLoader.loadIndexByPath(SONG_SUBJECT)) as SubjectIndex;
  return (idx.categories ?? []).map((c) => ({
    id: c.id || c.name,
    name: c.name,
    path: `${SONG_SUBJECT}/${c.id || c.name}`,
    coverUrl: buildCoverUrl(c.cover?.cover_image_url),
    count: c.entry_count,
  }));
}

/** 任意歌曲目录层级：返回子分类（语言子类，分类层索引用 sub_categories）或歌曲清单（二者其一非空） */
export async function loadSongLevel(path: string): Promise<{ subs: SongCategory[]; songs: SongEntry[] }> {
  if (CONFIG.USE_MOCK) return { subs: [], songs: MOCK_SONGS };
  const idx = (await indexLoader.loadIndexByPath(path)) as CategoryIndex & SubjectIndex;
  const rawSubs = (idx as SubjectIndex).categories ?? (idx as CategoryIndex).sub_categories ?? [];
  const subs: SongCategory[] = rawSubs.map((c) => ({
    id: c.id || c.name,
    name: c.name,
    path: `${path}/${c.id || c.name}`,
    coverUrl: buildCoverUrl(c.cover?.cover_image_url),
    count: c.entry_count,
  }));
  const songs: SongEntry[] = ((idx as CategoryIndex).entries ?? []).map((e) => ({
    path: e.path,
    title: e.title,
    displayTitle: cleanSongTitle(e.title),
    coverUrl: buildCoverUrl(e.cover?.cover_image_url),
    audioUrl: buildAssetUrl(`generated_stories/${e.path}.mp3`),
    lrcUrl: buildAssetUrl(`generated_stories/${e.path}.txt`),
  }));
  return { subs, songs };
}
