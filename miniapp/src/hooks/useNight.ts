/**
 * useNight — 全局睡前/夜间模式 hook（所有页面通用）
 * 每次页面显示重算（定时模式下可能刚过 20:00 睡前点），返回根节点应加的类名，
 * 并同步小程序原生 page 背景色，避免根 View 外沿露白/闪白。
 * 用法：const night = useNight(); <View className={`page-v4 ${night}`}>...
 */
import Taro, { useDidShow } from '@tarojs/taro';
import { useSettingsStore } from '@/stores/settingsStore';

export function useNight(): string {
  const applyTheme = useSettingsStore((s) => s.applyTheme);
  const isNight = useSettingsStore((s) => s.isNight);
  useDidShow((): void => {
    applyTheme();
    const night = useSettingsStore.getState().isNight;
    void Taro.setBackgroundColor({
      backgroundColor: night ? '#171D33' : '#FFF9F0',
      backgroundColorTop: night ? '#171D33' : '#FFF9F0',
      backgroundColorBottom: night ? '#171D33' : '#FFF9F0',
    }).catch((error: unknown): void => console.warn('同步页面背景色失败', error));
  });
  return isNight ? 'theme-dark' : '';
}
