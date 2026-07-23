/**
 * app.tsx — 应用入口
 * 职责：启动时初始化用户会话（读取本地 token）、应用主题（跟随系统/深/浅）。
 */
import { PropsWithChildren } from 'react';
import { useLaunch } from '@tarojs/taro';
import { useUserStore } from '@/stores/userStore';
import { useSettingsStore } from '@/stores/settingsStore';
import './app.scss';

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    // 恢复登录态 + 应用主题
    useUserStore.getState().restore();
    useSettingsStore.getState().applyTheme();
  });

  return children;
}

export default App;
