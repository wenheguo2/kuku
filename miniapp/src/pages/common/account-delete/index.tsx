/**
 * pages/common/account-delete — A-05 账号注销与数据删除
 * 二次确认后调用 DELETE /user；成功时彻底清理本地会话、孩子上下文和播放器状态。
 */
import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { api } from '@/services/api';
import { useNight } from '@/hooks/useNight';
import { useUserStore } from '@/stores/userStore';

export default function AccountDelete() {
  const isLogin = useUserStore((state) => state.isLogin);
  const logout = useUserStore((state) => state.logout);
  const night = useNight();

  const removeAccount = async () => {
    if (!isLogin) {
      Taro.navigateTo({ url: '/pages/common/login/index' });
      return;
    }
    const first = await Taro.showModal({
      title: '确认注销账号？',
      content: '注销后，账号、孩子档案、播放历史、成长进度、收藏、会员与订单数据将删除且不可恢复。',
      confirmText: '继续注销',
      confirmColor: '#E4572E',
    });
    if (!first.confirm) return;
    const second = await Taro.showModal({
      title: '最后确认',
      content: '请确认你已了解数据删除不可撤销。',
      confirmText: '删除全部数据',
      confirmColor: '#E4572E',
    });
    if (!second.confirm) return;

    try {
      await api.del('/user', { confirm: true });
      logout();
      Taro.showToast({ title: '账号已注销', icon: 'success' });
      setTimeout(() => Taro.reLaunch({ url: '/pages/story/index/index' }), 600);
    } catch (error) {
      console.warn('注销账号失败', error);
      Taro.showToast({ title: '注销失败，请稍后重试', icon: 'none' });
    }
  };

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title">账号注销与数据删除</Text>
      <View className="card">
        <Text className="nm" style={{ display: 'block', marginBottom: '12px' }}>注销前请确认</Text>
        <Text className="ds" style={{ lineHeight: 1.8 }}>
          注销将删除账号及名下全部孩子档案、播放历史、成长进度、挑战记录、成就、收藏、会员和订单信息。操作完成后无法恢复。
        </Text>
      </View>
      <View className="btn-ghost" style={{ marginTop: '24px', color: '#E4572E' }} onClick={removeAccount}>
        {isLogin ? '注销账号并删除全部数据' : '请先登录'}
      </View>
    </View>
  );
}
