import { assetUrl, coverUrl, encodePath, indexUrl, CONFIG } from '@/config';
import type { DirectoryIndex, FreePool, GlobalIndex, HomeIndex, LessonEntry, SearchItem, Segments, Track } from '@/types';

let freePoolPromise: Promise<FreePool> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`内容加载失败（${response.status}）`);
    return await response.json() as T;
  } finally {
    clearTimeout(timeout);
  }
}

export const content = {
  home: () => fetchJson<HomeIndex>(indexUrl('_home.json')),
  global: () => fetchJson<GlobalIndex>(indexUrl('_global.json')),
  search: (kind: 'story' | 'song') => fetchJson<{ list: SearchItem[] }>(indexUrl(`_search_${kind}.json`)),
  freePool: async () => {
    freePoolPromise ??= fetchJson<FreePool>(indexUrl('_free_pool.json'));
    return freePoolPromise;
  },
  async isFree(kind: 'story' | 'song', path: string): Promise<boolean> {
    freePoolPromise ??= fetchJson<FreePool>(indexUrl('_free_pool.json'));
    const pool = await freePoolPromise;
    return (kind === 'story' ? pool.stories : pool.songs).some((item) => item.p === path);
  },
  directory: (path: string) => fetchJson<DirectoryIndex>(indexUrl(`${path}/_index.json`)),
  songRoot: () => fetchJson<DirectoryIndex>(indexUrl('瞎编的歌曲/_index.json')),
  async lessons(subject: '识字' | '英语'): Promise<LessonEntry[]> {
    const dir = subject === '识字' ? 'F1识字' : 'F2英语';
    const idx = await fetchJson<DirectoryIndex>(indexUrl(`学科启蒙/${dir}/_index.json`));
    const list: LessonEntry[] = [];
    for (const entry of idx.entries ?? []) {
      const match = subject === '识字' ? entry.title.match(/学写'(.+?)'字/) : entry.title.match(/单词(.+)$/);
      const seq = Number(entry.title.match(/(\d+)/)?.[1] ?? 0);
      const text = match?.[1]?.trim();
      if (text) list.push({ id: entry.entry_id, text, path: entry.path, seq });
    }
    return list.sort((a, b) => a.seq - b.seq);
  },
  lesson(entry: LessonEntry, subject: '识字' | '英语'): Track {
    const studyDir = subject === '英语' ? '英语初阶/学习1' : '学习1';
    return {
      id: `${entry.path}/${studyDir}`,
      title: subject === '识字' ? `和“${entry.text}”交朋友` : `Learn ${entry.text}`,
      audioUrl: assetUrl(`audio/${entry.path}/${studyDir}/full.mp3`),
      lessonText: entry.text,
      subject,
      kind: 'lesson',
    };
  },
  async story(path: string, title: string, fallbackCover?: string): Promise<Track> {
    const seg = await fetchJson<Segments>(`${CONFIG.staticBaseUrl}/generated_stories/${encodePath(path)}/segments.json`);
    const audioUrl = seg.full_audio_url
      ? assetUrl(seg.full_audio_url)
      : `${CONFIG.staticBaseUrl}/audio/${encodePath(path)}/full.mp3`;
    return { id: path, title: seg.title || title, audioUrl, coverUrl: coverUrl(seg.cover_url) || fallbackCover, kind: 'story' };
  },
  song(entry: { path: string; title: string; cover?: { cover_image_url?: string } }): Track {
    return {
      id: entry.path,
      title: entry.title.replace(/^(中文|英文|双语)\s*[-－]\s*/, ''),
      audioUrl: assetUrl(`generated_stories/${entry.path}.mp3`),
      coverUrl: coverUrl(entry.cover?.cover_image_url),
      lyricsUrl: assetUrl(`generated_stories/${entry.path}.txt`),
      kind: 'song',
    };
  },
};

export function storyCoverFromPath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const name = clean.split('/').filter(Boolean).pop();
  return name ? coverUrl(`covers/generated/${clean}/${name}.jpg`) : '';
}

export function songCoverFromPath(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const name = clean.split('/').filter(Boolean).pop();
  return name ? coverUrl(`covers/generated/${clean}/${name}_1.jpg`) : '';
}
