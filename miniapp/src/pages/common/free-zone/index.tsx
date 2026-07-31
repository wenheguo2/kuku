/**
 * pages/common/free-zone — 免费专区（固定免费池：50 故事 + 100 歌曲）
 * ★ 核心约束：点播用「锁定队列」setQueue(list, idx, true) + order 模式，
 *   配合 story/player 的 queueLocked 判断 → 播完即停、上一首/下一首只在池内环绕，绝不串播到池外付费内容。
 * 故事/歌曲两段 Tab（复用收藏/历史同款插画卡 Tab + list-row 行卡）。
 */
import { useState } from 'react';
import { View, Text, Image } from '@tarojs/components';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { usePlayerStore } from '@/stores/playerStore';
import {
  loadFreePool, freeStoriesToQueue, freeSongsToQueue,
  cleanFreeSongTitle, freeSongCover, type FreePool,
} from '@/services/freePool';
import { guessCoverChain } from '@/utils/path';
import iconFreeStory from '@/assets/icon_free_story.png';
import iconFreeSong from '@/assets/icon_free_song.png';
import StateView from '@/components/StateView';
import MiniPlayer from '@/components/MiniPlayer';
import { useNight } from '@/hooks/useNight';

type Tab = 'story' | 'song';

export default function FreeZone() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(router.params.tab === 'song' ? 'song' : 'story');
  const [pool, setPool] = useState<FreePool | null>(null);
  const [loading, setLoading] = useState(true);
  const [coverIdx, setCoverIdx] = useState<Record<string, number>>({});
  const night = useNight();

  useDidShow(() => {
    setLoading(true);
    loadFreePool().then((p) => setPool(p)).finally(() => setLoading(false));
  });

  const stories = pool?.stories ?? [];
  const songs = pool?.songs ?? [];

  /** ★播免费故事：整池设为锁定队列（order 模式），导航后由播放器挂载负责加载（与收藏页同一安全模式，避免 resume 竞态）；播完即停不串播 */
  const playStoryAt = (index: number) => {
    const queue = freeStoriesToQueue(stories);
    usePlayerStore.getState().setPlayMode('order');
    usePlayerStore.getState().setQueue(queue, index, true); // locked=true
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(queue[index].id)}&title=${encodeURIComponent(queue[index].title)}` });
  };

  /** ★播免费歌曲：整池设为锁定队列（order 模式），导航后由播放器挂载负责起播 */
  const playSongAt = (index: number) => {
    const queue = freeSongsToQueue(songs);
    usePlayerStore.getState().setPlayMode('order');
    usePlayerStore.getState().setQueue(queue, index, true); // locked=true
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(queue[index].id)}&title=${encodeURIComponent(queue[index].title)}` });
  };

  /** ★循环播放全部免费故事：repeat-all + 锁定队列→只在免费池内循环，绝不循环到非免费内容 */
  const loopStoriesAll = () => {
    if (stories.length === 0) return;
    const queue = freeStoriesToQueue(stories);
    usePlayerStore.getState().setPlayMode('repeat-all');
    usePlayerStore.getState().setQueue(queue, 0, true); // locked=true
    Taro.navigateTo({ url: `/pages/story/player/index?path=${encodeURIComponent(queue[0].id)}&title=${encodeURIComponent(queue[0].title)}` });
  };

  /** ★循环播放全部免费歌曲：repeat-all + 锁定队列→只在免费池内循环 */
  const loopSongsAll = () => {
    if (songs.length === 0) return;
    const queue = freeSongsToQueue(songs);
    usePlayerStore.getState().setPlayMode('repeat-all');
    usePlayerStore.getState().setQueue(queue, 0, true); // locked=true
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(queue[0].id)}&title=${encodeURIComponent(queue[0].title)}` });
  };

  const shown = tab === 'story' ? stories : songs;

  return (
    <View className={`page-container ${night}`}>
      <Text className="brand-title">🎁 免费专区</Text>
      <Text className="muted" style={{ display: 'block', margin: '2px 4px 14px' }}>精选免费内容，随便听～</Text>

      {/* 故事 / 歌曲 分段：插画卡 Tab（与收藏页同款） */}
      <View style={{ display: 'flex', gap: '16px', margin: '4px 0 20px' }}>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'story' ? '0 6px 18px rgba(255,140,66,.35)' : 'none', border: tab === 'story' ? '3px solid var(--color-primary)' : '2px solid var(--color-border)' }} onClick={() => setTab('story')}>
          <Image src={iconFreeStory} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'story' ? 1 : 0.5 }} ariaLabel="免费故事" />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>故事 {stories.length}</Text>
        </View>
        <View style={{ flex: 1, position: 'relative', borderRadius: '22px', overflow: 'hidden', height: '120px', boxShadow: tab === 'song' ? '0 6px 18px rgba(63,197,188,.35)' : 'none', border: tab === 'song' ? '3px solid #3FC5BC' : '2px solid var(--color-border)' }} onClick={() => setTab('song')}>
          <Image src={iconFreeSong} mode="aspectFill" style={{ width: '100%', height: '100%', opacity: tab === 'song' ? 1 : 0.5 }} ariaLabel="免费歌曲" />
          <Text style={{ position: 'absolute', bottom: '10px', left: '14px', fontSize: '24px', fontWeight: 800, color: '#fff', textShadow: '0 2px 6px rgba(0,0,0,.6)' }}>歌曲 {songs.length}</Text>
        </View>
      </View>

      {/* ★循环播放全部（只在免费池内循环，不会循环到非免费内容） */}
      {tab === 'story' && stories.length > 0 && (
        <View className="load-more-pill" style={{ marginBottom: '16px' }} onClick={loopStoriesAll}>
          <Text>🔁 循环播放全部免费故事</Text>
        </View>
      )}
      {tab === 'song' && songs.length > 0 && (
        <View className="load-more-pill" style={{ marginBottom: '16px' }} onClick={loopSongsAll}>
          <Text>🔁 循环播放全部免费歌曲</Text>
        </View>
      )}

      <StateView loading={loading} error={false} empty={shown.length === 0}
        emptyText={tab === 'story' ? '免费故事整理中～' : '免费歌曲整理中～'} emptyIcon="book">
        {tab === 'story' && stories.map((s, i) => {
          const chain = guessCoverChain(s.p);
          const src = chain[coverIdx[s.p] ?? 0] || iconFreeStory;
          return (
            <View key={s.p} className="list-row" onClick={() => playStoryAt(i)}>
              <Image className="cvr" src={src} mode="aspectFill" onError={() => setCoverIdx((m) => ({ ...m, [s.p]: (m[s.p] ?? 0) + 1 }))} ariaLabel={`${s.t}封面`} />
              <View className="gr"><Text className="nm">{s.t}</Text><Text className="ds">{s.s}</Text></View>
              <View className="cp"><Text style={{ color: '#fff', fontSize: '30px' }}>▶</Text></View>
            </View>
          );
        })}
        {tab === 'song' && songs.map((s, i) => {
          const src = freeSongCover(s.p) || iconFreeSong;
          return (
            <View key={s.p} className="list-row" onClick={() => playSongAt(i)}>
              <Image className="cvr" src={src} mode="aspectFill" ariaLabel={`${cleanFreeSongTitle(s.t)}封面`} />
              <View className="gr"><Text className="nm">{cleanFreeSongTitle(s.t)}</Text><Text className="ds">{s.s}</Text></View>
              <View className="cp" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC)' }}><Text style={{ color: '#fff', fontSize: '30px' }}>▶</Text></View>
            </View>
          );
        })}
      </StateView>
      <MiniPlayer />
    </View>
  );
}
