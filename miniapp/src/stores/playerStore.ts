/**
 * playerStore.ts — 播放器全局状态（迷你播放栏跨页展示 + 故事集/歌单续播队列 + 播放模式）
 * 队列项泛化：同时支持故事(type:'story', id=索引 path)与歌曲(type:'song', id=歌曲 id + 真实音频字段)。
 * 播放模式：order 顺序播完停 / repeat-one 单曲循环 / repeat-all 列表循环。
 */
import { create } from 'zustand';
import { RateStore } from '@/services/storage';

export type PlayMode = 'order' | 'repeat-one' | 'repeat-all';

/** ★产品固定倍速挡位（仅此 5 挡，不做其他）；循环切换顺序按数组顺序 | 单一来源 */
export const PLAYBACK_RATES = [0.8, 0.9, 1.0, 1.1, 1.2] as const;

/** 持久化倍速合法化：不在 5 挡内（历史脏值）一律回退 1.0 */
function sanitizeRate(value: number | null): number {
  return value !== null && (PLAYBACK_RATES as readonly number[]).includes(value) ? value : 1.0;
}

export interface NowPlaying {
  type: 'story' | 'song' | 'lesson';
  id: string;
  title: string;
  coverUrl?: string;
}

/** 队列项（故事集/歌单续播用） */
export interface QueueItem {
  type: 'story' | 'song';
  id: string; // story: 索引 path；song: 歌曲 id
  title: string;
  audioUrl?: string; // song 真实播放音频直链
  lrcUrl?: string; // song 歌词
  coverUrl?: string;
}

interface PlayerState {
  current: NowPlaying | null;
  isPlaying: boolean;
  currentSec: number;
  durationSec: number;
  queue: QueueItem[];
  queueIndex: number;
  playMode: PlayMode;
  /** ★锁定队列（免费专区专用）：true 时禁止任何自动扩展队列（如 story/player 拉父目录整列表），
   *  保证只在池内条目间流转，绝不串播到池外付费内容。 */
  queueLocked: boolean;
  /** 播放倍速（展示态；实际变速由 audioPlayer.setRate 应用并回写这里） */
  playbackRate: number;
  setCurrent: (n: NowPlaying) => void;
  setPlaying: (p: boolean) => void;
  setTime: (cur: number, dur: number) => void;
  /** 设置队列并定位到起始项（locked=true 锁定为封闭队列，禁止自动扩展） */
  setQueue: (list: QueueItem[], index: number, locked?: boolean) => void;
  setPlayMode: (mode: PlayMode) => void;
  setPlaybackRate: (rate: number) => void;
  /** 循环切换播放模式：order → repeat-all → repeat-one → order */
  cyclePlayMode: () => PlayMode;
  /** 曲终自动推进：repeat-one 返回当前项(不动索引)；repeat-all 到底回卷；order 到底返回 null */
  queueAdvance: () => QueueItem | null;
  /** 手动上一首/下一首（dir=-1/1）：repeat-all 环绕，其余在边界钳制 */
  queueSkip: (dir: 1 | -1) => QueueItem | null;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  isPlaying: false,
  currentSec: 0,
  durationSec: 0,
  queue: [],
  queueIndex: 0,
  playMode: 'order',
  queueLocked: false,
  playbackRate: sanitizeRate(RateStore.get()),
  setCurrent: (n) => set({ current: n }),
  setPlaying: (p) => set({ isPlaying: p }),
  setTime: (cur, dur) => set({ currentSec: cur, durationSec: dur }),
  setQueue: (list, index, locked = false) => set({ queue: list, queueIndex: index, queueLocked: locked }),
  setPlayMode: (mode) => set({ playMode: mode }),
  setPlaybackRate: (rate) => set({ playbackRate: sanitizeRate(rate) }),
  cyclePlayMode: () => {
    const order: PlayMode[] = ['order', 'repeat-all', 'repeat-one'];
    const next = order[(order.indexOf(get().playMode) + 1) % order.length];
    set({ playMode: next });
    return next;
  },
  queueAdvance: () => {
    const { queue, queueIndex, playMode } = get();
    if (queue.length === 0) return null;
    if (playMode === 'repeat-one') return queue[queueIndex] ?? null; // 单曲循环：同一首重播
    const next = queueIndex + 1;
    if (next < queue.length) {
      set({ queueIndex: next });
      return queue[next];
    }
    if (playMode === 'repeat-all') {
      set({ queueIndex: 0 });
      return queue[0];
    }
    return null; // 顺序播放到底停止
  },
  queueSkip: (dir) => {
    const { queue, queueIndex, playMode } = get();
    if (queue.length === 0) return null;
    let i = queueIndex + dir;
    if (i < 0) i = playMode === 'repeat-all' ? queue.length - 1 : 0;
    if (i >= queue.length) i = playMode === 'repeat-all' ? 0 : queue.length - 1;
    set({ queueIndex: i });
    return queue[i] ?? null;
  },
  reset: () => set({
    current: null,
    isPlaying: false,
    currentSec: 0,
    durationSec: 0,
    queue: [],
    queueIndex: 0,
    playMode: 'order',
    queueLocked: false,
  }),
}));
