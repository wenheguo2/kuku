/**
 * pages/common/favorites — C-03 我的收藏（账号共享）
 * GET /favorites；DELETE /favorites/:id 取消。加载/空/错误态统一用 StateView。
 */
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Fav { favorite_id: string; content_type: string; content_id: string; title: string | null }

export default function Favorites() {
  const { isLogin } = useUserStore();
  const [list, setList] = useState<Fav[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const night = useNight();

  const load = () => {
    if (!isLogin) { setLoading(false); return; }
    setLoading(true); setError(false);
    api.get<{ list: Fav[] }>('/favorites')
      .then((d) => setList(d.list))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };
  useDidShow(load);

  const remove = async (id: string) => {
    await api.del(`/favorites/${id}`);
    setList((l) => l.filter((f) => f.favorite_id !== id));
  };

  if (!isLogin) return (
    <View className={`center ${night}`}>
      <Text className="emoji-xl">⭐</Text>
      <Text className="muted" style={{ marginBottom: '28px' }}>登录后查看你收藏的内容</Text>
      <View className="btn-primary" style={{ width: '360px' }} onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>去登录</View>
    </View>
  );

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title">⭐ 我的收藏</Text>
      <StateView loading={loading} error={error} empty={list.length === 0}
        emptyText="还没有收藏，去发现喜欢的内容吧～" emptyIcon="star" onRetry={load}>
        {list.map((f) => (
          <View key={f.favorite_id} className="list-row">
            <View className="thumb">{f.content_type === 'song' ? '🎵' : f.content_type === 'story' ? '📖' : '🎧'}</View>
            <View className="gr"><Text className="nm">{f.title || f.content_id}</Text></View>
            <Text className="chip" style={{ color: '#E4572E', borderColor: '#F3C6BC' }} onClick={() => remove(f.favorite_id)}>取消</Text>
          </View>
        ))}
      </StateView>
    </View>
  );
}
