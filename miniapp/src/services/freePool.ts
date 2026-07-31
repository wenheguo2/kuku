/**
 * freePool.ts — 固定免费池服务（非会员/免费期外可免费听的封闭内容集合）
 * 数据源：/static/index/generated_stories/_free_pool.json（脚本从真实索引筛，已校验磁盘可播）。
 * ★ 核心约束：免费池点播必须用「锁定队列」（setQueue(list, idx, true)）+ order 模式，
 *   配合 story/player 的 queueLocked 判断，保证播完即停、绝不串播到池外付费内容。
 */
import Taro from '@tarojs/taro';
import { buildIndexUrl, buildAssetUrl, buildCoverUrl, guessCoverFromPath } from '@/utils/path';
import type { QueueItem } from '@/stores/playerStore';

export interface FreeStory { p: string; t: string; s: string }
export interface FreeSong { p: string; t: string; s: string }
export interface FreePool { version: string; stories: FreeStory[]; songs: FreeSong[] }

/** 歌曲单曲封面按路径规则（与音乐厅/收藏一致）：covers/generated/{path}/{末段}_1.jpg */
export function freeSongCover(p: string): string {
  const name = p.split('/').filter(Boolean).pop();
  return name ? buildCoverUrl(`covers/generated/${p}/${name}_1.jpg`) : '';
}

/** 歌名清洗：去「中文-/英文-/双语-」语言前缀 */
export function cleanFreeSongTitle(t: string): string {
  return t.replace(/^(中文|英文|双语)\s*[-－]\s*/, '');
}

let cache: FreePool | null = null;

/** 拉取免费池（带内存缓存）。失败返回空池，调用方自行降级。 */
export async function loadFreePool(): Promise<FreePool> {
  if (cache) return cache;
  try {
    const res = await Taro.request({ url: buildIndexUrl('_free_pool.json'), method: 'GET', timeout: 10_000 });
    const data = (typeof res.data === 'string' ? JSON.parse(res.data) : res.data) as FreePool;
    cache = { version: data.version, stories: data.stories ?? [], songs: data.songs ?? [] };
  } catch (error) {
    console.warn('加载免费池失败', error);
    cache = { version: '', stories: [], songs: [] };
  }
  return cache;
}

/** 免费池故事 → 锁定队列项（封面走 path 推导 + 播放器 onError 上溯链兜底） */
export function freeStoriesToQueue(stories: FreeStory[]): QueueItem[] {
  return stories.map((s) => ({
    type: 'story' as const,
    id: s.p,
    title: s.t,
    coverUrl: guessCoverFromPath(s.p) || undefined,
  }));
}

/** 免费池歌曲 → 锁定队列项（音频/歌词/封面按路径规则构造） */
export function freeSongsToQueue(songs: FreeSong[]): QueueItem[] {
  return songs.map((s) => ({
    type: 'song' as const,
    id: s.p,
    title: cleanFreeSongTitle(s.t),
    audioUrl: buildAssetUrl(`generated_stories/${s.p}.mp3`),
    lrcUrl: buildAssetUrl(`generated_stories/${s.p}.txt`),
    coverUrl: freeSongCover(s.p) || undefined,
  }));
}

/** 判断某故事 path 是否在免费池内（会员门控用） */
export function isFreeStory(pool: FreePool, path: string): boolean {
  return pool.stories.some((s) => s.p === path);
}

/** 判断某歌曲 path 是否在免费池内 */
export function isFreeSong(pool: FreePool, path: string): boolean {
  return pool.songs.some((s) => s.p === path);
}
