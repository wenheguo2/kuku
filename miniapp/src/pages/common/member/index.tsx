/**
 * pages/common/member — A-03 会员中心（v4 鎏金故事书匣）
 * 三档套餐（月¥9.9/季¥26/年¥88 主推）；下单 POST /orders（stub 直接开通）。
 */
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import Icon from '@/components/Icon';
import { tracker } from '@/services/tracker';
import { useNight } from '@/hooks/useNight';

interface Plan { key: 'monthly' | 'quarterly' | 'yearly'; name: string; price: number; per: string; tip?: string }
const PLANS: Plan[] = [
  { key: 'monthly', name: '月度', price: 9.9, per: '每月' },
  { key: 'quarterly', name: '季度', price: 26, per: '¥8.7/月' },
  { key: 'yearly', name: '年度 ★最受欢迎', price: 88, per: '¥7.3/月', tip: 'on' },
];
export default function Member() {
  const night = useNight();
  const {
    isLogin,
    selectedChildId,
    nickname,
    membershipStatus,
    membershipEndDate,
    refreshProfile,
  } = useUserStore();

  const loadMem = () => {
    if (isLogin) void refreshProfile().catch((error) => console.warn('刷新会员状态失败', error));
  };
  useDidShow(loadMem);

  const buy = async (plan: Plan) => {
    if (!isLogin) { Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
    try {
      void tracker.track('pay_click', { plan_type: plan.key }, selectedChildId);
      const r = await api.post<{ status: string }>('/orders', { plan_type: plan.key });
      Taro.showToast({ title: r.status === 'paid' ? '开通成功' : '已下单', icon: 'none' });
      await refreshProfile();
    } catch (error) {
      console.warn('创建订单失败', error);
    }
  };

  return (
    <ScrollView scrollY className={`gold-scr ${night}`}>
      <View style={{ textAlign: 'center', padding: '14px 20px 0' }}>
        <Text style={{ fontSize: '18px', letterSpacing: '6px', opacity: 0.6, fontWeight: 800, display: 'block' }}>STORY PREMIUM</Text>
        <Text className="serif" style={{ fontSize: '40px', fontWeight: 800, marginTop: '8px', color: '#FFE9A8', display: 'block' }}>鎏金故事书匣</Text>
        <Text style={{ fontSize: '21px', opacity: 0.65, marginTop: '10px', display: 'block' }}>全馆 800+ 故事 · 每晚新故事 · 无广告纯净</Text>
      </View>

      {/* 专属书匣卡 */}
      <View style={{ margin: '24px 0 8px', background: 'linear-gradient(135deg,rgba(255,233,168,.14),rgba(255,201,60,.06))', border: '1px solid rgba(255,201,60,.4)', borderRadius: '32px', padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <View className="avatar" style={{ borderColor: '#FFE9A8' }} />
        <View className="flex-1">
          <Text style={{ fontSize: '26px', fontWeight: 800, display: 'block' }}>{isLogin ? `${nickname || '小听众'}的专属书匣` : '开启你的专属书匣'}</Text>
          <Text style={{ fontSize: '20px', opacity: 0.6, marginTop: '6px', display: 'block' }}>{membershipStatus === 'active' ? `会员有效期至 ${membershipEndDate}` : '尚未开通'}</Text>
        </View>
        <Icon name="crown" size={44} color="#FFE9A8" />
      </View>

      <View className="goldrow"><Icon name="book" size={38} color="#FFE9A8" /> 名著全集 · 三国/水浒/西游随意听</View>
      <View className="goldrow"><Icon name="moon" size={38} color="#FFE9A8" /> 哄睡专辑 · 睡前故事灯专属曲目</View>
      <View className="goldrow"><Icon name="star" size={38} color="#FFE9A8" /> 学习 2/3 解锁 · 跟读与场景运用</View>

      <View className="sec-h" style={{ margin: '20px 4px 14px' }}>
        <Text className="t" style={{ color: '#F5E6C8' }}>选择书匣</Text><Text className="m" style={{ color: '#FFC93C' }}>年省 ¥40</Text>
      </View>
      <View className="plangrid">
        {PLANS.map((p) => (
          <View key={p.key} className={`plan ${p.tip ? 'on' : ''}`} onClick={() => buy(p)}>
            <Text style={{ fontSize: '20px', fontWeight: 800, display: 'block' }}>{p.name}</Text>
            <Text className="pr">¥{p.price}</Text>
            <Text className="pd">{p.per}</Text>
          </View>
        ))}
      </View>
      <View className="btn-gold" style={{ marginTop: '28px' }} onClick={() => buy(PLANS[2])}>开启鎏金书匣</View>
      <Text style={{ textAlign: 'center', fontSize: '18px', opacity: 0.5, padding: '18px 0', display: 'block' }}>到期不自动续费 · 随时可取消</Text>
    </ScrollView>
  );
}
