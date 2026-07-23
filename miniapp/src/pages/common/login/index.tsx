/**
 * pages/common/login — A-01 登录/微信授权
 * 调 userStore.login()（wx.login 取 code → 后端换 token；后端自动建默认档案）。
 * mock 模式：后端 WX_LOGIN_MODE=mock，任意 code 均可登录，便于联调。
 */
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';
import Icon from '@/components/Icon';

export default function Login() {
  const login = useUserStore((s) => s.login);
  const night = useNight();
  const [agreed, setAgreed] = useState(false);

  const doLogin = async () => {
    if (!agreed) {
      Taro.showToast({ title: '请先阅读并同意协议与儿童信息规则', icon: 'none' });
      return;
    }
    try {
      await login();
      Taro.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/story/index/index' })), 800);
    } catch (e) {
      Taro.showToast({ title: '登录失败', icon: 'none' });
    }
  };

  return (
    <View className={`center ${night}`}>
      <Icon name="book" size={112} color="#FF8C42" />
      <Text style={{ fontSize: '44px', fontWeight: 800, display: 'block', margin: '8px 0' }}>酷酷儿童故事</Text>
      <Text className="muted" style={{ marginBottom: '48px' }}>听故事 · 唱儿歌 · 学知识</Text>
      <View className="btn-green" style={{ width: '440px' }} onClick={doLogin}>微信一键登录</View>
      <View
        className="btn-ghost"
        style={{ width: '440px', marginTop: '20px', opacity: 0.55 }}
        onClick={() => Taro.showToast({ title: '手机号登录尚未开放', icon: 'none' })}
      >
        手机号登录（尚未开放）
      </View>
      <View style={{ marginTop: '36px', textAlign: 'center' }}>
        <Text className={`chip ${agreed ? 'on' : ''}`} onClick={() => setAgreed((value) => !value)}>
          {agreed ? '✓ 已同意' : '○ 请勾选同意'}
        </Text>
        <View style={{ marginTop: '16px' }}>
          <Text className="muted" style={{ fontSize: '22px' }}>我已阅读并同意</Text>
          <Text style={{ color: 'var(--color-primary)', fontSize: '22px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=user' })}>《用户协议》</Text>
          <Text style={{ color: 'var(--color-primary)', fontSize: '22px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=privacy' })}>《隐私政策》</Text>
          <Text style={{ color: 'var(--color-primary)', fontSize: '22px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=children' })}>《儿童信息规则》</Text>
        </View>
      </View>
    </View>
  );
}
