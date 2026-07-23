/**
 * pages/growth/index — G-01 成长首页（v4 朋友收集册：进度条 + 四级图例 + 三学科统计）
 * 数据 GET /progress/summary（四级朋友统计）。徽章墙个体在收集册页展开。
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { useTabStore } from '@/stores/tabStore';

interface Summary {
  overall_stats: { total_words_learned: number; total_words_mastered: number; total_words_friends?: number };
  subject_progress: { subject: string; learned: number; tested: number; mastered: number }[];
}

const SUBJECTS = [
  { name: '识字', color: 'var(--color-primary)' },
  { name: '英语', color: 'var(--color-blue)' },
  { name: '拼音', color: 'var(--color-green)' },
];

export default function GrowthHome() {
  const [sum, setSum] = useState<Summary | null>(null);
  const { selectedChildId, isLogin } = useUserStore();
  const night = useNight();

  const load = () => {
    if (!isLogin || !selectedChildId) return;
    api.get<Summary>(`/progress/summary?child_id=${selectedChildId}`)
      .then(setSum)
      .catch((error) => console.warn('加载成长概览失败', error));
  };
  useEffect(load, [selectedChildId, isLogin]);
  useDidShow(() => { useTabStore.getState().setTab('growth'); load(); });

  const learned = sum?.overall_stats.total_words_learned ?? 0;
  const friends = sum?.overall_stats.total_words_friends ?? 0;
  const mastered = sum?.overall_stats.total_words_mastered ?? 0;
  const total = learned + friends + mastered;
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '0%');

  return (
    <ScrollView scrollY className={`page-v4 has-tab ${night}`}>
      <View style={{ textAlign: 'center', padding: '10px 20px 4px' }}>
        <Text style={{ fontSize: '20px', letterSpacing: '4px', color: 'var(--color-text-secondary)', fontWeight: 800, display: 'block' }}>FRIENDS COLLECTION</Text>
        <Text className="serif" style={{ fontSize: '38px', fontWeight: 800, marginTop: '8px', display: 'block' }}>我的朋友收集册</Text>
      </View>

      {!isLogin && (
        <View className="frow" style={{ marginTop: '12px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>
          <Text style={{ color: 'var(--color-primary)' }}>登录后记录你的朋友收集进度 →</Text>
        </View>
      )}

      {/* 四级进度卡 */}
      <View className="gcard" style={{ marginTop: '12px' }}>
        <Text style={{ fontSize: '26px', fontWeight: 800, display: 'block' }}>
          已遇见 <Text style={{ color: 'var(--color-primary)' }}>{total}</Text> 位朋友 · 其中 <Text style={{ color: '#57B83E' }}>{mastered}</Text> 位好伙伴
        </Text>
        <View className="gbar">
          <View style={{ width: pct(learned), background: 'var(--stage-1)' }} />
          <View style={{ width: pct(friends), background: 'var(--stage-2)' }} />
          <View style={{ width: pct(mastered), background: 'var(--stage-3)' }} />
        </View>
        <View className="glegend">
          <Text><Text className="dot" style={{ background: 'var(--stage-1)' }} />已相识 {learned}</Text>
          <Text><Text className="dot" style={{ background: 'var(--stage-2)' }} />好朋友 {friends}</Text>
          <Text><Text className="dot" style={{ background: 'var(--stage-3)' }} />好伙伴 {mastered}</Text>
        </View>
      </View>

      {/* 三学科统计 */}
      <View className="grow3" style={{ margin: '18px 0' }}>
        {SUBJECTS.map((s) => {
          const p = sum?.subject_progress.find((x) => x.subject === s.name);
          const c = (p?.learned ?? 0) + (p?.tested ?? 0) + (p?.mastered ?? 0);
          return (
            <View key={s.name} className="gstat" onClick={() => Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent(s.name)}` })}>
              <Text className="v" style={{ color: s.color }}>{c}</Text>
              <Text className="k">{s.name}</Text>
            </View>
          );
        })}
      </View>

      {/* 入口 */}
      <View className="frow" onClick={() => Taro.navigateTo({ url: '/pages/growth/collection/index' })}>
        <View className="fi" style={{ background: 'var(--color-primary-soft)' }}><Icon name="star" size={34} color="#FF8C42" /></View>朋友收集册<Text className="rt">查看全部 ›</Text>
      </View>
      <View className="frow" onClick={() => Taro.navigateTo({ url: '/pages/growth/comprehensive/index?subject=识字' })}>
        <View className="fi" style={{ background: '#FFF0C4' }}><Icon name="crown" size={34} color="#B8860B" /></View>综合挑战<Text className="rt">攒满 10 好朋友 → 好伙伴 ›</Text>
      </View>
      <MiniPlayer />
    </ScrollView>
  );
}
