/**
 * pages/common/favorites — C-03 我的收藏（账号共享）
 * GET /favorites；DELETE /favorites/:id 取消。加载/空/错误态统一用 StateView。
 * ★ 故事 / 歌曲分段展示；歌曲段可「循环播放全部收藏歌曲」（设歌单队列 + 列表循环）。
 */
import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { usePlayerStore } from '@/stores/playerStore';
import { buildAssetUrl, buildCoverUrl, guessCoverFromPath, guessCoverChain } from '@/utils/path';
import iconStory from '@/assets/icon_fav_story.jpg';
import iconSong from '@/assets/icon_fav_song.jpg';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';

interface Fav { favorite_id: string; content_type: string; content_id: string; title: string | null }
type Tab = 'story' | 'song';

/** 歌曲单曲封面按路径规则：covers/generated/{path}/{歌名}_1.jpg */
const songCoverFromPath = (p: string) => {
  const name = p.split('/').filter(Boolean).pop();
  return name ? buildCoverUrl(`covers/generated/${p}/${name}_1.jpg`) : '';
};

export default function Favorites() {
  const router = useRouter();
  const isLogin = useUserStore((s) => s.isLogin);
  const [list, setList] = useState<Fav[]>([]);
  // 入口可指定段（音乐厅“你的播放列表”直达歌曲段）
  const [tab, setTab] = useState<Tab>(router.params.tab === 'song' ? 'song' : 'story');
  // ★章回章节无专属封面：候选链游标 onError 逐级上溯，全失败回退插画（与历史页同套）
  const [coverIdx, setCoverIdx] = useState<Record<string, number>>({});
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

  /** 点单篇收藏故事：★设整个收藏为锁定队列并定位到该篇，下一首=下一个收藏（不串到原目录） */
  const openStory = (index: number) => {
    const i = Math.max(0, index);
    const queue = stories.map((f) => ({ type: 'story' as const, id: f.content_id, title: f.title || f.content_id, coverUrl: guessCoverFromPath(f.content_id) || undefined }));
    usePlayerStore.getState().setQueue(queue, i, true); // locked=true 防被 expandQueueFromDir 换成原目录
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(queue[i].id)}&title=${encodeURIComponent(queue[i].title)}` });
  };

  /** ★连播全部收藏故事（用户定：直接播收藏列表）：整列表设锁定队列从第 1 篇起 */
  const playStoriesAll = () => {
    if (stories.length === 0) return;
    usePlayerStore.getState().setQueue(
      stories.map((f) => ({ type: 'story' as const, id: f.content_id, title: f.title || f.content_id, coverUrl: guessCoverFromPath(f.content_id) || undefined })),
      0,
      true,
    );
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(stories[0].content_id)}&title=${encodeURIComponent(stories[0].title || stories[0].content_id)}` });
  };

  /** 从某首收藏歌曲开始播全部收藏歌曲；队列项按路径规则补真实音频/歌词/封面（修：原只有 id 无声） */
  const playSongsFrom = (index: number) => {
    const i = Math.max(0, index);
    const queue = songs.map((s) => ({
      type: 'song' as const,
      id: s.content_id,
      title: s.title || s.content_id,
      audioUrl: buildAssetUrl(`generated_stories/${s.content_id}.mp3`),
      lrcUrl: buildAssetUrl(`generated_stories/${s.content_id}.txt`),
      coverUrl: songCoverFromPath(s.content_id) || undefined,
    }));
    usePlayerStore.getState().setQueue(queue, i, true); // ★locked=true：收藏为封闭队列，下一首只在收藏内
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
      <View className="pill-orange" onClick={() => Taro.navigateTo({ url: '/pages/common/login/index' })}>去登录</View>
    </View>
  );

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title">⭐ 我的收藏</Text>

      {/* 故事 / 歌曲 分段：卡片式带封面图 Tab */}
      <View style={{ display: 'flex', gap: '16px', margin: '4px 0 20px' }}>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'story' ? '0 6px 18px rgba(255,140,66,.35)' : 'none', border: tab === 'story' ? '3px solid var(--color-primary)' : '2px solid var(--color-border)' }} onClick={() => setTab('story')}>
          <Image src={iconStory} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'story' ? 1 : 0.5 }} />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>故事 {stories.length}</Text>
        </View>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'song' ? '0 6px 18px rgba(63,197,188,.35)' : 'none', border: tab === 'song' ? '3px solid #3FC5BC' : '2px solid var(--color-border)' }} onClick={() => setTab('song')}>
          <Image src={iconSong} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'song' ? 1 : 0.5 }} />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>歌曲 {songs.length}</Text>
        </View>
      </View>

      {/* 歌曲段：循环播放全部；故事段：连播全部（用户定） */}
      {tab === 'song' && songs.length > 0 && (
        <View className="load-more-pill" style={{ marginBottom: '16px' }} onClick={loopAllSongs}>
          <Text>🔁 循环播放全部收藏歌曲</Text>
        </View>
      )}
      {tab === 'story' && stories.length > 0 && (
        <View className="load-more-pill" style={{ marginBottom: '16px' }} onClick={playStoriesAll}>
          <Text>▶ 连播全部收藏故事</Text>
        </View>
      )}

      <StateView loading={loading} error={error} empty={shown.length === 0}
        emptyText={tab === 'story' ? '还没有收藏故事～' : '还没有收藏歌曲～'} emptyIcon="star" onRetry={load}>
        {shown.map((f, i) => {
          const chain = tab === 'song' ? [songCoverFromPath(f.content_id)] : guessCoverChain(f.content_id);
          const src = chain[coverIdx[f.favorite_id] ?? 0] || (tab === 'song' ? iconSong : iconStory);
          return (
            <View key={f.favorite_id} className="list-row" onClick={() => (tab === 'story' ? openStory(i) : playSongsFrom(i))}>
              <Image className="cvr" lazyLoad src={src} mode="aspectFill" onError={() => setCoverIdx((m) => ({ ...m, [f.favorite_id]: (m[f.favorite_id] ?? 0) + 1 }))} ariaLabel={`${f.title}封面`} />
              <View className="gr"><Text className="nm">{f.title || f.content_id}</Text></View>
              <View className="load-more-pill" style={{ padding: '8px 18px', margin: 0, fontSize: '22px', color: '#E4572E', borderColor: '#F3C6BC' }} onClick={(e) => { e.stopPropagation(); void remove(f.favorite_id); }}>取消</View>
            </View>
          );
        })}
      </StateView>
    </View>
  );
}
