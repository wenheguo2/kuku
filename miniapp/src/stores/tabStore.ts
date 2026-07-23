/**
 * tabStore.ts — 当前 Tab 状态（自定义 TabBar 高亮用）
 * 各 tab 页在 useDidShow 里 setTab；custom-tab-bar 订阅它渲染高亮。
 */
import { create } from 'zustand';

export type TabKey = 'story' | 'song' | 'growth' | 'parent';

interface TabState {
  tab: TabKey;
  setTab: (t: TabKey) => void;
}

export const useTabStore = create<TabState>((set) => ({
  tab: 'story',
  setTab: (t) => set({ tab: t }),
}));
