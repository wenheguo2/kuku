/**
 * pages/growth/collection — 朋友收集册可视化
 * GET /achievements/:child_id/collection（各学科四级分布）+ /achievements/:child_id（成就贴纸）。
 * ★ 加"未遇见"数量（总词库 - 已遇见）+ 点击某级别跳转词表页带筛选（用户定：要看具体字列表）。
 */
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { useNight } from '@/hooks/useNight';

interface CollectionItem { subject: string; acquainted: number; friends: number; buddies: number; total: number }
interface Sticker { key: string; name: string; subject: string | null }

/** 各学科词库总数（与 lessonCatalog 索引一致；收集册只是展示，硬编码避免额外拉取） */
const TOTAL_WORDS: Record<string, number> = { '识字': 3499, '英语': 3910, '拼音': 100 };

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

  if (!selectedChildId) return <View className="page-container"><View className="pill-orange" style={{ marginTop: '80px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>请先登录</View></View>;

  if (locked) {
    return (
      <View className={`center ${night}`}>
        <Text className="emoji-xl">👑</Text>
        <Text style={{ fontSize: '38px', fontWeight: 800, display: 'block', margin: '8px 0', color: 'var(--color-text)' }}>朋友收集册是会员专属</Text>
        <Text className="muted" style={{ marginBottom: '28px' }}>开通会员查看完整收集册与成就贴纸</Text>
        <View className="pill-orange" onClick={() => Taro.navigateTo({ url: '/pages/common/member/index' })}>去开通会员</View>
      </View>
    );
  }

  /** 点击某学科某级别 → 跳转词表页带 stage 筛选（用户定：点击能看到具体字列表） */
  const goStage = (subject: string, stage: number) => {
    Taro.navigateTo({ url: `/pages/growth/lesson/index?subject=${encodeURIComponent(subject)}&stage=${stage}` });
  };

  const Badge = ({ label, n, color, subject, stage }: { label: string; n: number; color: string; subject: string; stage: number }) => (
    <View style={{ textAlign: 'center' }} onClick={() => n > 0 && goStage(subject, stage)}>
      <View style={{ width: '72px', height: '72px', borderRadius: '50%', background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', margin: '0 auto' }}>{n}</View>
      <Text className="text-secondary" style={{ display: 'block', fontSize: '22px', marginTop: '6px' }}>{label}</Text>
    </View>
  );

  const totalAll = items.reduce((s, it) => s + it.total, 0);

  return (
    <ScrollView scrollY className={`page-container ${night}`}>
      <Text className="brand-title" style={{ color: '#7FC96A' }}>📓 朋友收集册</Text>

      {totalAll === 0 && (
        <View className="center" style={{ padding: '40px 0' }}>
          <Text className="emoji-xl">🌱</Text>
          <Text style={{ fontSize: '32px', fontWeight: 800, display: 'block', margin: '12px 0', color: 'var(--color-text)' }}>还没有遇见任何朋友</Text>
          <Text className="muted" style={{ marginBottom: '24px' }}>去听课、学习字/词→交到新朋友！</Text>
          <View className="pill-green" onClick={() => Taro.switchTab({ url: '/pages/growth/index/index' })}>去学习交朋友</View>
        </View>
      )}

      {items.map((it) => {
        const unmet = Math.max(0, (TOTAL_WORDS[it.subject] ?? 0) - it.total);
        return (
          <View key={it.subject} className="card">
            <Text style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-text)' }}>{it.subject}</Text>
            <Text className="muted" style={{ display: 'block', marginTop: '4px', fontSize: '22px' }}>
              词库共 {TOTAL_WORDS[it.subject] ?? '?'} 个 · 未遇见 {unmet} 个
            </Text>
            <View className="row" style={{ justifyContent: 'space-around', marginTop: '16px' }}>
              <Badge label="未遇见" n={unmet} color="var(--stage-0, #C4C4C4)" subject={it.subject} stage={0} />
              <Badge label="已相识" n={it.acquainted} color="var(--stage-1)" subject={it.subject} stage={1} />
              <Badge label="好朋友" n={it.friends} color="var(--stage-2)" subject={it.subject} stage={2} />
              <Badge label="好伙伴" n={it.buddies} color="var(--stage-3)" subject={it.subject} stage={3} />
            </View>
            <Text className="muted" style={{ display: 'block', textAlign: 'center', marginTop: '10px', fontSize: '20px' }}>点击圆圈查看具体字/词</Text>
          </View>
        );
      })}

      <View className="card">
        <Text style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--color-text)' }}>🏅 成就贴纸</Text>
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
