/**
 * pages/parent/index — C-01 家长中心（v4 轻奢磨砂：孩子卡 + 本周统计 + 功能行 + 鎏金入口）
 * 展示孩子/本周成长（GET /parent/progress/weekly）+ 收藏/历史/定时/会员/设置入口。
 */
import { useState } from 'react';
import { View, Text, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import TabBarV4 from '@/components/TabBarV4';
import avatarImg from '@/assets/avatar.jpg';
import iconFav from '@/assets/icon_fav.png';
import iconHistory from '@/assets/icon_history.png';
import iconChildren from '@/assets/icon_children.png';
import iconSettings from '@/assets/icon_settings.png';
import iconMember from '@/assets/icon_member.png';
import { useNight } from '@/hooks/useNight';
import { useTabStore } from '@/stores/tabStore';
import { shareCard } from '@/utils/share';

interface Weekly { weekly_stats: { new_acquainted: number; new_friends: number; new_buddies: number } }

// 功能行插画图标（素材库压缩产物 96px）；隐私注销暂无专属图，复用设置图降透明区分
const ENTRIES: { img: string; label: string; url: string; rt: string }[] = [
  { img: iconFav, label: '收藏管理', url: '/pages/common/favorites/index', rt: '我的收藏 ›' },
  { img: iconHistory, label: '播放历史', url: '/pages/common/history/index', rt: '最近 100 条 ›' },
  { img: iconChildren, label: '孩子档案', url: '/pages/common/children/index', rt: '管理 ›' },
  { img: iconSettings, label: '账号设置', url: '/pages/common/settings/index', rt: '›' },
  { img: iconChildren, label: '隐私与账号注销', url: '/pages/common/account-delete/index', rt: '管理 ›' },
];

export default function ParentCenter() {
  const isLogin = useUserStore((s) => s.isLogin);
  const nickname = useUserStore((s) => s.nickname);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const logout = useUserStore((s) => s.logout);
  const [weekly, setWeekly] = useState<Weekly | null>(null);
  const night = useNight();

  useDidShow(() => {
    useTabStore.getState().setTab('parent');
    if (isLogin && selectedChildId) {
      api.get<Weekly>(`/parent/progress/weekly?child_id=${selectedChildId}`)
        .then(setWeekly)
        .catch((error) => console.warn('加载家长周报失败', error));
    }
  });
  const nav = (url: string) => Taro.navigateTo({ url });
  const w = weekly?.weekly_stats;
  // 分享拉新：家长之间互推（P01 家长中心卡面）
  useShareAppMessage(() => ({
    title: '酷酷儿童故事 — 孩子的故事与成长伙伴',
    path: '/pages/story/index/index',
    imageUrl: shareCard('P01_家长中心'),
  }));

  return (
    <ScrollView scrollY className={`page-v4 has-tab ${night}`}>
      <Text className="serif" style={{ fontSize: '34px', fontWeight: 800, textAlign: 'center', padding: '10px 0 16px', display: 'block', color: 'var(--color-text)' }}>家长中心</Text>

      {/* 孩子磨砂卡 */}
      <View className="kid">
        <Image className="avatar" src={avatarImg} mode="aspectFill" ariaLabel="小听众头像" />
        <View className="flex-1">
          <Text style={{ fontSize: '30px', fontWeight: 800, display: 'block', color: 'var(--color-text)' }}>{isLogin ? (nickname || '宝宝') : '未登录'}</Text>
          <Text style={{ fontSize: '21px', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'block' }}>{isLogin ? '陪伴成长中' : '点击登录记录成长'}</Text>
        </View>
        <Text style={{ fontSize: '22px', color: 'var(--color-primary)', fontWeight: 800 }} onClick={() => nav(isLogin ? '/pages/common/children/index' : '/pages/common/login/index')}>{isLogin ? '管理 ›' : '登录 ›'}</Text>
      </View>

      {/* 本周成长统计 */}
      {w && (
        <View className="grow3" style={{ margin: '18px 0' }}>
          <View className="gstat"><Text className="v" style={{ color: 'var(--stage-1)' }}>{w.new_acquainted}</Text><Text className="k">新相识</Text></View>
          <View className="gstat"><Text className="v" style={{ color: 'var(--stage-2)' }}>{w.new_friends}</Text><Text className="k">新好朋友</Text></View>
          <View className="gstat"><Text className="v" style={{ color: '#57B83E' }}>{w.new_buddies}</Text><Text className="k">新好伙伴</Text></View>
        </View>
      )}

      {/* 功能行（插画图标） */}
      {ENTRIES.map((e) => (
        <View key={e.url} className="frow" onClick={() => nav(e.url)}>
          <View className="fi"><Image className="im" src={e.img} mode="aspectFill" ariaLabel={`${e.label}图标`} /></View>{e.label}
          <Text className="rt">{e.rt}</Text>
        </View>
      ))}
      {/* 鎏金入口 */}
      <View className="frow" style={{ background: 'linear-gradient(135deg,#FFF8E1,#FFEFC4)', border: '1px solid #FFE3A3' }} onClick={() => nav('/pages/common/member/index')}>
        <View className="fi"><Image className="im" src={iconMember} mode="aspectFill" ariaLabel="会员订阅图标" /></View>鎏金故事书匣
        <Text className="rt" style={{ color: '#B8860B' }}>升级解锁全部 ›</Text>
      </View>

      {/* ★分享拉新：醍目真按钮 */}
      <Button className="share-bar" openType="share">📤 把酷酷推荐给其他家长</Button>

      {isLogin && (
        <View className="frow" style={{ justifyContent: 'center' }} onClick={logout}>
          <Text style={{ color: '#E4572E' }}>退出登录</Text>
        </View>
      )}
      <View style={{ textAlign: 'center', padding: '12px 0 24px' }}>
        <Text style={{ fontSize: '19px', color: 'var(--color-text-secondary)' }}>v4.0.0 · </Text>
        <Text style={{ fontSize: '19px', color: 'var(--color-primary)' }} onClick={() => nav('/pages/common/agreement/index?type=user')}>用户协议</Text>
        <Text style={{ fontSize: '19px', color: 'var(--color-text-secondary)' }}> · </Text>
        <Text style={{ fontSize: '19px', color: 'var(--color-primary)' }} onClick={() => nav('/pages/common/agreement/index?type=privacy')}>隐私政策</Text>
      </View>
      {process.env.TARO_ENV === 'h5' && <TabBarV4 />}
    </ScrollView>
  );
}
