/**
 * pages/common/favorites — C-03 我的收藏（账号共享）
 * GET /favorites；DELETE /favorites/:id 取消。加载/空/错误态统一用 StateView。
 * ★ 故事 / 歌曲分段展示；歌曲段可「循环播放全部收藏歌曲」（设歌单队列 + 列表循环）。
 */
import { useState } from 'react';
import { View, Text } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { usePlayerStore } from '@/stores/playerStore';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Fav { favorite_id: string; content_type: string; content_id: string; title: string | null }
type Tab = 'story' | 'song';

export default function Favorites() {
  const isLogin = useUserStore((s) => s.isLogin);
  const [list, setList] = useState<Fav[]>([]);
  const [tab, setTab] = useState<Tab>('story');
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

  const stories = list.filter((f) => f.content_type === 'story');
  const songs = list.filter((f) => f.content_type === 'song');
  const shown = tab === 'story' ? stories : songs;

  const openStory = (f: Fav) =>
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(f.content_id)}&title=${encodeURIComponent(f.title || f.content_id)}` });

  /** 从某首收藏歌曲开始播放全部收藏歌曲（设歌单队列，播放由播放器起播）。 */
  const playSongsFrom = (index: number) => {
    const i = Math.max(0, index);
    const queue = songs.map((s) => ({ type: 'song' as const, id: s.content_id, title: s.title || s.content_id }));
    usePlayerStore.getState().setQueue(queue, i);
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(queue[i].id)}&title=${encodeURIComponent(queue[i].title)}` });
  };

  /** 循环播放全部收藏歌曲：列表循环 + 从第 1 首起。 */
  const loopAllSongs = () => {
    if (songs.length === 0) return;
    usePlayerStore.getState().setPlayMode('repeat-all');
    playSongsFrom(0);
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

      {/* 故事 / 歌曲 分段 */}
      <View style={{ display: 'flex', gap: '12px', margin: '4px 0 16px' }}>
        <View className={`chip ${tab === 'story' ? 'on' : ''}`} onClick={() => setTab('story')}>📖 故事 {stories.length}</View>
        <View className={`chip ${tab === 'song' ? 'on' : ''}`} onClick={() => setTab('song')}>🎵 歌曲 {songs.length}</View>
      </View>

      {/* 歌曲段：循环播放全部 */}
      {tab === 'song' && songs.length > 0 && (
        <View className="btn-green" style={{ marginBottom: '16px' }} onClick={loopAllSongs}>🔁 循环播放全部收藏歌曲</View>
      )}

      <StateView loading={loading} error={error} empty={shown.length === 0}
        emptyText={tab === 'story' ? '还没有收藏故事～' : '还没有收藏歌曲～'} emptyIcon="star" onRetry={load}>
        {shown.map((f, i) => (
          <View key={f.favorite_id} className="list-row" onClick={() => (tab === 'story' ? openStory(f) : playSongsFrom(i))}>
            <View className="thumb">{tab === 'song' ? '🎵' : '📖'}</View>
            <View className="gr"><Text className="nm">{f.title || f.content_id}</Text></View>
            <Text className="chip" style={{ color: '#E4572E', borderColor: '#F3C6BC' }} onClick={(e) => { e.stopPropagation(); void remove(f.favorite_id); }}>取消</Text>
          </View>
        ))}
      </StateView>
    </View>
  );
}
