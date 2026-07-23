/**
 * playerStore.ts — 播放器全局状态（供迷你播放栏跨页展示 + 故事集自动续播队列）
 */
import { create } from 'zustand';

export interface NowPlaying {
  type: 'story' | 'song' | 'lesson';
  id: string;
  title: string;
  coverUrl?: string;
}

/** 队列项（故事集自动续播用） */
export interface QueueItem {
  path: string;
  title: string;
}

interface PlayerState {
  current: NowPlaying | null;
  isPlaying: boolean;
  currentSec: number;
  durationSec: number;
  /** 播放队列（如一个分类下的故事列表） */
  queue: QueueItem[];
  queueIndex: number;
  setCurrent: (n: NowPlaying) => void;
  setPlaying: (p: boolean) => void;
  setTime: (cur: number, dur: number) => void;
  /** 设置队列并定位到起始项 */
  setQueue: (list: QueueItem[], index: number) => void;
  /** 取下一项（无则 null）；副作用推进 queueIndex */
  nextInQueue: () => QueueItem | null;
  reset: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  current: null,
  isPlaying: false,
  currentSec: 0,
  durationSec: 0,
  queue: [],
  queueIndex: 0,
  setCurrent: (n) => set({ current: n }),
  setPlaying: (p) => set({ isPlaying: p }),
  setTime: (cur, dur) => set({ currentSec: cur, durationSec: dur }),
  setQueue: (list, index) => set({ queue: list, queueIndex: index }),
  nextInQueue: () => {
    const { queue, queueIndex } = get();
    const next = queueIndex + 1;
    if (next < queue.length) {
      set({ queueIndex: next });
      return queue[next];
    }
    return null;
  },
  reset: () => set({
    current: null,
    isPlaying: false,
    currentSec: 0,
    durationSec: 0,
    queue: [],
    queueIndex: 0,
  }),
}));
