/**
 * pages/common/login — A-01 登录/微信授权（全屏插画版）
 * 主视觉：载入插画全屏铺底 + 底部暖色渐变面板承载按钮/协议（用户定：用载入1插画美化）。
 * 调 userStore.login()（wx.login 取 code → 后端换 token；后端自动建默认档案）。
 * mock 模式：后端 WX_LOGIN_MODE=mock，任意 code 均可登录，便于联调。
 */
import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/stores/userStore';
import loginHero from '@/assets/login_hero.jpg';

export default function Login() {
  const login = useUserStore((s) => s.login);
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
    <View className="login-scr">
      {/* 全屏插画铺底（魔法之门） */}
      <Image className="login-bg" src={loginHero} mode="aspectFill" ariaLabel="酷酷儿童故事欢迎插画" />
      {/* 顶部品牌字（压在插画上，白字+暖色描影） */}
      <View className="login-brand">
        <Text className="t serif">酷酷儿童故事</Text>
        <Text className="s">听故事 · 唱儿歌 · 学知识</Text>
      </View>
      {/* 底部渐变面板：按钮 + 协议 */}
      <View className="login-sheet">
        <View className="btn-green login-btn" onClick={doLogin}>微信一键登录</View>
        <View
          className="btn-ghost login-btn ghost"
          onClick={() => Taro.showToast({ title: '手机号登录尚未开放', icon: 'none' })}
        >
          手机号登录（尚未开放）
        </View>
        <View className="login-agree">
          <Text className={`chip ${agreed ? 'on' : ''}`} onClick={() => setAgreed((value) => !value)}>
            {agreed ? '✓ 已同意' : '○ 请勾选同意'}
          </Text>
          <View style={{ marginTop: '12px' }}>
            {/* 协议行走类样式：inline px 不被 pxtransform 转 rpx，会比设计稿大一倍 */}
            <Text className="agree-t dim">我已阅读并同意</Text>
            <Text className="agree-t link" onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=user' })}>《用户协议》</Text>
            <Text className="agree-t link" onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=privacy' })}>《隐私政策》</Text>
            <Text className="agree-t link" onClick={() => Taro.navigateTo({ url: '/pages/common/agreement/index?type=children' })}>《儿童信息规则》</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
