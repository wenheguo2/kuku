/**
 * storage.ts — 本地缓存封装
 * 小程序无 localStorage，统一用 Taro.setStorageSync/getStorageSync（底层 wx.setStorage）。
 */
import Taro from '@tarojs/taro';

const TOKEN_KEY = 'kuku_token';
const CHILD_KEY = 'kuku_selected_child';
const THEME_KEY = 'kuku_theme';
const SLEEP_TIMER_DEADLINE_KEY = 'kuku_sleep_timer_deadline';
const PLAYBACK_RATE_KEY = 'kuku_playback_rate';

export const storage = {
  get<T = unknown>(key: string): T | null {
    try {
      const v = Taro.getStorageSync(key);
      return (v ?? null) as T | null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      Taro.setStorageSync(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    try {
      Taro.removeStorageSync(key);
    } catch {
      /* ignore */
    }
  },
};

export const TokenStore = {
  get: () => storage.get<string>(TOKEN_KEY),
  set: (t: string) => storage.set(TOKEN_KEY, t),
  clear: () => storage.remove(TOKEN_KEY),
};

export const ChildStore = {
  get: () => storage.get<string>(CHILD_KEY),
  set: (id: string) => storage.set(CHILD_KEY, id),
  clear: () => storage.remove(CHILD_KEY),
};

export const ThemeStore = {
  get: () => storage.get<'system' | 'light' | 'dark'>(THEME_KEY),
  set: (t: 'system' | 'light' | 'dark') => storage.set(THEME_KEY, t),
};

export const SleepTimerStore = {
  get: () => storage.get<number>(SLEEP_TIMER_DEADLINE_KEY),
  set: (deadline: number) => storage.set(SLEEP_TIMER_DEADLINE_KEY, deadline),
  clear: () => storage.remove(SLEEP_TIMER_DEADLINE_KEY),
};

/** 播放倍速持久化（用户偏好，重启保持） */
export const RateStore = {
  get: () => storage.get<number>(PLAYBACK_RATE_KEY),
  set: (rate: number) => storage.set(PLAYBACK_RATE_KEY, rate),
};
