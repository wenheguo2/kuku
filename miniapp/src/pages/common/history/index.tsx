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
  const { isLogin, selectedChildId } = useUserStore();
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
    await api.del(`/history?child_id=${selectedChildId}`);
    setList([]);
  };

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
        <Text className="flex-1" style={{ fontSize: '40px', fontWeight: 'bold' }}>🕒 播放历史</Text>
        {list.length > 0 && <Text className="chip" style={{ color: '#E4572E', borderColor: '#F3C6BC' }} onClick={clear}>🗑 清空</Text>}
      </View>
      <StateView loading={loading} error={error} empty={list.length === 0}
        emptyText="暂无播放记录" emptyIcon="clock" onRetry={load}>
        {list.map((h) => (
          <View key={h.history_id} className="list-row">
            <View className="thumb">{h.content_type === 'song' ? '🎵' : '📖'}</View>
            <View className="gr">
              <Text className="nm">{h.title || h.content_id}</Text>
              <Text className="ds">{new Date(h.played_at).toLocaleString()}</Text>
            </View>
          </View>
        ))}
      </StateView>
    </View>
  );
}
