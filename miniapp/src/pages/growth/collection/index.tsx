/**
 * pages/growth/collection — 朋友收集册可视化
 * GET /achievements/:child_id/collection（各学科四级分布）+ /achievements/:child_id（成就贴纸）。
 * 纯展示型正反馈（md/13），四级颜色对齐设计令牌 stage-0/1/2/3。
 */
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

interface CollectionItem { subject: string; acquainted: number; friends: number; buddies: number; total: number }
interface Sticker { key: string; name: string; subject: string | null }

export default function Collection() {
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [locked, setLocked] = useState(false);
  const night = useNight();

  useDidShow(() => {
    if (!selectedChildId) return;
    api.get<{ collection: CollectionItem[] }>(`/achievements/${selectedChildId}/collection`)
      .then((d) => setItems(d.collection))
      .catch((e: { code?: number }) => { if (e?.code === 403) setLocked(true); });
    api.get<{ list: Sticker[] }>(`/achievements/${selectedChildId}`)
      .then((d) => setStickers(d.list))
      .catch((e: { code?: number }) => { if (e?.code === 403) setLocked(true); });
  });

  if (!selectedChildId) return <View className="page-container"><View className="btn-primary" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>请先登录</View></View>;

  if (locked) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">👑</Text>
        <Text style={{ fontSize: '38px', fontWeight: 800, display: 'block', margin: '8px 0' }}>朋友收集册是会员专属</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>开通会员查看完整收集册与成就贴纸</Text>
        <View className="btn-primary" style={{ width: '360px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/member/index' })}>去开通会员</View>
      </View>
    );
  }

  const Bar = ({ label, n, color }: { label: string; n: number; color: string }) => (
    <View style={{ textAlign: 'center' }}>
      <View style={{ width: '72px', height: '72px', borderRadius: '50%', background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto' }}>{n}</View>
      <Text className="text-secondary" style={{ display: 'block', fontSize: '22px', marginTop: '6px' }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>📓 朋友收集册</Text>
      {items.map((it) => (
        <View key={it.subject} className="card">
          <Text style={{ fontSize: '32px', fontWeight: 'bold' }}>{it.subject}</Text>
          <View className="row" style={{ justifyContent: 'space-around', marginTop: '16px' }}>
            <Bar label="已相识" n={it.acquainted} color="var(--stage-1)" />
            <Bar label="好朋友" n={it.friends} color="var(--stage-2)" />
            <Bar label="好伙伴" n={it.buddies} color="var(--stage-3)" />
          </View>
        </View>
      ))}

      <View className="card">
        <Text style={{ fontSize: '32px', fontWeight: 'bold' }}>🏅 成就贴纸</Text>
        {stickers.length === 0 && <Text className="muted" style={{ display: 'block', marginTop: '12px' }}>收集更多好伙伴，解锁专属贴纸～</Text>}
        <View className="row" style={{ flexWrap: 'wrap', marginTop: '12px' }}>
          {stickers.map((s) => (
            <Text key={s.key} className="chip on" style={{ background: 'var(--stage-3)', borderColor: 'var(--stage-3)' }}>🏅 {s.name}</Text>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
