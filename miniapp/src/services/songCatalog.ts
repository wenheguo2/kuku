/**
 * songCatalog.ts — 歌曲 mock 目录（真实歌曲索引接入前的占位）。
 * song/list 与 搜索(song scope) 共用，避免重复维护；真实态由 indexLoader 拉取后替换。
 */
export interface SongItem { id: string; title: string; meta: string; }
export interface SongWithCat extends SongItem { category: string; }

export const SONG_CATEGORIES: Record<string, SongItem[]> = {
  摇篮曲: [
    { id: 'L001_摇篮曲', title: '摇篮曲', meta: '舒伯特 · 2分10秒' },
    { id: 'L002_小宝贝快睡觉', title: '小宝贝快睡觉', meta: '轻音乐 · 1分50秒' },
    { id: 'L003_月亮船', title: '月亮船', meta: '安眠曲 · 2分30秒' },
  ],
  童话故事: [
    { id: 'T001_丑小鸭', title: '丑小鸭', meta: '童话儿歌 · 3分00秒' },
    { id: 'T002_白雪公主', title: '白雪公主', meta: '童话儿歌 · 3分20秒' },
  ],
  动物世界: [
    { id: 'A001_两只老虎', title: '两只老虎', meta: '经典儿歌 · 1分12秒' },
    { id: 'A002_小毛驴', title: '小毛驴', meta: '经典儿歌 · 1分30秒' },
    { id: 'A003_数鸭子', title: '数鸭子', meta: '经典儿歌 · 1分40秒' },
  ],
  神话故事: [
    { id: 'M001_嫦娥奔月', title: '嫦娥奔月', meta: '神话儿歌 · 2分40秒' },
    { id: 'M002_夸父追日', title: '夸父追日', meta: '神话儿歌 · 2分20秒' },
  ],
};

/** 扁平化全部歌曲（带分类），供搜索按标题匹配。 */
export const ALL_SONGS: SongWithCat[] = Object.entries(SONG_CATEGORIES)
  .flatMap(([category, list]) => list.map((s) => ({ ...s, category })));
