/**
 * app.tsx — 应用入口
 * 职责：启动时初始化用户会话（读取本地 token）、应用主题（跟随系统/深/浅）；
 *       全局错误边界兜底渲染期异常，避免白屏（修 FE-H03）。
 */
import { Component, PropsWithChildren, ReactNode } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useLaunch } from '@tarojs/taro';
import { useUserStore } from '@/stores/userStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { initPlaybackQueue } from '@/services/playbackQueue';
import './app.scss';

/** 全局错误边界：捕获渲染期异常，展示温柔兜底 + “回首页”自救，避免整屏白屏。 */
class ErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    // 仅入控制台（生产可接入监控）；不向孩子暴露技术细节
    console.error('[全局错误边界] 渲染异常', error);
  }

  private handleBack = (): void => {
    this.setState({ hasError: false });
    Taro.reLaunch({ url: '/pages/story/index/index' }).catch(() => {});
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={{ padding: '160rpx 48rpx', textAlign: 'center' }}>
          <View style={{ width: '120rpx', height: '120rpx', borderRadius: '50%', background: '#FFE0C2', margin: '0 auto' }} />
          <Text style={{ display: 'block', margin: '32rpx 0 8rpx', fontSize: '34rpx', color: '#2D3142' }}>呀，出了点小状况</Text>
          <Text style={{ display: 'block', marginBottom: '40rpx', fontSize: '28rpx', color: '#8B8D9E' }}>点下面回到首页继续玩吧</Text>
          <View
            onClick={this.handleBack}
            style={{ display: 'inline-block', padding: '20rpx 64rpx', background: '#FF8C42', color: '#fff', borderRadius: '999rpx', fontSize: '30rpx' }}
          >
            回到首页
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

function App({ children }: PropsWithChildren) {
  useLaunch((options) => {
    // ★拉新：从分享链接 launch query 捕获邀请人（?inviter=xxx），登录时上报（仅对新用户首次注册生效）
    const inviter = options?.query?.inviter;
    if (inviter) useUserStore.getState().setPendingInviter(String(inviter));
    // 恢复登录态 + 应用主题
    useUserStore.getState().restore();
    useSettingsStore.getState().applyTheme();
    // ★ App 级注册一次：故事集自动续播驱动（与播放页存活无关，修 M-4）
    initPlaybackQueue();
  });

  return <ErrorBoundary>{children}</ErrorBoundary>;
}

export default App;
