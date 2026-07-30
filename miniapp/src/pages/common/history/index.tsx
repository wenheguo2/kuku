/**
 * pages/common/history — C-04 播放历史（★ 按 child_id 隔离）
 * GET /history?child_id=；DELETE /history?child_id= 清空。加载/空/错误态用 StateView。
 */
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Hist { history_id: string; content_type: string; content_id: string; title: string | null; played_at: string }

export default function History() {
  const isLogin = useUserStore((s) => s.isLogin);
  const selectedChildId = useUserStore((s) => s.selectedChildId);
  const [list, setList] = useState<Hist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    if (!isLogin || !selectedChildId) { setLoading(false); return; }
    setLoading(true); setError(false);
    api.get<{ list: Hist[] }>(`/history?child_id=${selectedChildId}`)
      .then((d) => setList(d.list))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useDidShow(load);

  const clear = async () => {
    const res = await Taro.showModal({ title: '清空历史', content: '确定清空宝宝的全部播放记录？' });
    if (!res.confirm) return;
    try {
      await api.del(`/history?child_id=${selectedChildId}`);
      setList([]);
    } catch (error) {
      console.warn('清空历史失败', error);
      Taro.showToast({ title: '清空失败，请重试', icon: 'none' });
    }
  };

  /** 点历史条目→对应播放器续播（story→故事灯，song→歌曲） */
  const openHist = (h: Hist) => {
    if (h.content_type === 'song') {
      Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(h.content_id)}&title=${encodeURIComponent(h.title || h.content_id)}` });
    } else {
      Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(h.content_id)}&title=${encodeURIComponent(h.title || h.content_id)}` });
    }
  };

  /** ★ md/09 C-04：按 今天/昨天/更早 分组展示 */
  const groupOf = (iso: string) => {
    const d = new Date(iso); const now = new Date();
    const day = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
    if (day(d) === day(now)) return '今天';
    const y = new Date(now); y.setDate(now.getDate() - 1);
    return day(d) === day(y) ? '昨天' : '更早';
  };
  const groups = ['今天', '昨天', '更早'].map((g) => ({ g, items: list.filter((h) => groupOf(h.played_at) === g) })).filter((x) => x.items.length);

  if (!isLogin) return (
    <View className={`center ${night}`}>
      <Text className="emoji-xl">🕒</Text>
      <Text className="muted" style={{ marginBottom: '28px' }}>登录后查看宝宝的播放历史</Text>
      <View className="btn-primary" style={{ width: '360px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>去登录</View>
    </View>
  );

  return (
    <View className={`page-container ${night}`}>
      <View className="row" style={{ margin: '8px 4px 16px' }}>
        <Text className="flex-1" style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--color-text)' }}>🕒 播放历史</Text>
        {list.length > 0 && <Text className="chip" style={{ color: '#E4572E', borderColor: '#F3C6BC' }} onClick={clear}>🗑 清空</Text>}
      </View>
      <StateView loading={loading} error={error} empty={list.length === 0}
        emptyText="暂无播放记录" emptyIcon="clock" onRetry={load}>
        {groups.map(({ g, items }) => (
          <View key={g}>
            <View className="sec-h"><Text className="t">{g}</Text></View>
            {items.map((h) => (
              <View key={h.history_id} className="list-row" onClick={() => openHist(h)}>
                <View className="thumb">{h.content_type === 'song' ? '🎵' : '📖'}</View>
                <View className="gr">
                  <Text className="nm">{h.title || h.content_id}</Text>
                  <Text className="ds">{new Date(h.played_at).toLocaleString()}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </StateView>
    </View>
  );
}
