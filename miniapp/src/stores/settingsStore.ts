/**
 * settingsStore.ts — 设置状态（主题 + 睡前模式 + 睡眠定时）
 * 主题：system/light/dark（决策 D-06）。
 * ★ 睡前模式 = 全局夜间（绘本夜灯蓝），所有页面生效：定时触发(默认 20:00~6:00)或手动。
 * isNight = 深色主题 或 睡前模式激活；页面根节点据此加 .theme-dark 切换 CSS 变量。
 */
import { create } from 'zustand';
import Taro from '@tarojs/taro';
import { SleepTimerStore, ThemeStore } from '@/services/storage';
import { player } from '@/services/audioPlayer';
import { usePlayerStore } from './playerStore';

export type ThemeMode = 'system' | 'light' | 'dark';
export type SleepMode = 'timed' | 'manual';

interface SettingsState {
  theme: ThemeMode;
  timerMinutes: number;
  timerDeadline: number | null;
  isDark: boolean;
  sleepMode: SleepMode; // 睡前模式触发方式
  sleepManualOn: boolean; // 手动模式下的开关
  isNight: boolean; // ★ 最终夜间标志（全局所有页面读它）
  setTheme: (t: ThemeMode) => void;
  applyTheme: () => void;
  setTimer: (m: number) => void;
  setSleepMode: (m: SleepMode) => void;
  toggleSleep: () => void;
}

/** 计算最终是否深色（system 时读系统） */
function resolveDark(theme: ThemeMode): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  try {
    return Taro.getSystemInfoSync().theme === 'dark';
  } catch {
    return false;
  }
}

/** 定时睡前时段：20:00 ~ 次日 6:00 */
function isSleepHour(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

const storedTimerDeadline = SleepTimerStore.get();
const activeTimerDeadline = storedTimerDeadline && storedTimerDeadline > Date.now() ? storedTimerDeadline : null;
if (!activeTimerDeadline) SleepTimerStore.clear();

/** 计算全局夜间：深色主题 或 睡前模式激活 */
function resolveNight(s: { theme: ThemeMode; sleepMode: SleepMode; sleepManualOn: boolean }): boolean {
  if (resolveDark(s.theme)) return true;
  return s.sleepMode === 'manual' ? s.sleepManualOn : isSleepHour();
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  theme: ThemeStore.get() ?? 'system',
  timerMinutes: 30,
  timerDeadline: activeTimerDeadline,
  isDark: false,
  sleepMode: 'timed',
  sleepManualOn: false,
  isNight: false,

  setTheme: (t) => {
    ThemeStore.set(t);
    set({ theme: t, isDark: resolveDark(t), isNight: resolveNight({ ...get(), theme: t }) });
  },

  /** 应用主题/夜间（启动 + 每次页面显示时调用，仅在变化时 set 以避免重渲染循环）。 */
  applyTheme: () => {
    const s = get();
    const dark = resolveDark(s.theme);
    const night = resolveNight(s);
    if (dark !== s.isDark || night !== s.isNight) set({ isDark: dark, isNight: night });
  },

  setTimer: (m) => {
    if (m <= 0) {
      SleepTimerStore.clear();
      player.setSleepDeadline(null);
      set({ timerMinutes: 0, timerDeadline: null });
      return;
    }
    const deadline = Date.now() + m * 60_000;
    SleepTimerStore.set(deadline);
    player.setSleepDeadline(deadline);
    set({ timerMinutes: m, timerDeadline: deadline });
  },

  setSleepMode: (m) => set((s) => ({ sleepMode: m, isNight: resolveNight({ ...s, sleepMode: m }) })),

  toggleSleep: () => set((s) => {
    const on = !s.sleepManualOn;
    return { sleepMode: 'manual', sleepManualOn: on, isNight: resolveNight({ ...s, sleepMode: 'manual', sleepManualOn: on }) };
  }),
}));

if (activeTimerDeadline) player.setSleepDeadline(activeTimerDeadline);

// ★ 睡眠定时到点：复位播放态 + 清空定时（store+缓存），避免设置页 chip 仍高亮、UI 显示过期定时
player.setSleepHandler(() => {
  usePlayerStore.getState().setPlaying(false);
  useSettingsStore.getState().setTimer(0);
});
