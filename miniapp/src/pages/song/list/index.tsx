/**
 * pages/song/list — M-02/M-03 歌曲分类下钻（真实索引）
 * 两级自适应：path 为分类（如 瞎编的歌曲/世界名人）→ 渲染语言子类卡；path 为语言子类 → 渲染歌曲列表。
 * ★ 点歌：本子类整个列表设为播放队列（audioUrl/lrcUrl/coverUrl 全携带），同类续播/循环；标题展示去语言前缀。
 * 兼容旧入口参数 cat（搜索/首页）：等价 path=瞎编的歌曲/{cat}。
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { usePlayerStore } from '@/stores/playerStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import iconLoop from '@/assets/icon_loop.png';
import StateView from '@/components/StateView';
import { useNight } from '@/hooks/useNight';
import { loadSongLevel, SongCategory, SongEntry, SONG_SUBJECT } from '@/services/songCatalog';

const PAGE_SIZE = 50;

export default function SongList() {
  const router = useRouter();
  const path = router.params.path
    ? decodeURIComponent(router.params.path)
    : `${SONG_SUBJECT}/${decodeURIComponent(router.params.cat || '摇篮曲')}`;
  const title = decodeURIComponent(router.params.title || '') || path.split('/').pop() || '歌曲';
  const night = useNight();
  const [subs, setSubs] = useState<SongCategory[]>([]);
  const [songs, setSongs] = useState<SongEntry[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    setVisibleCount(PAGE_SIZE);
    loadSongLevel(path)
      .then((d) => { setSubs(d.subs); setSongs(d.songs); })
      .catch((err) => { console.warn('加载歌曲目录失败', err); setError(true); })
      .finally(() => setLoading(false));
  };
  useEffect(load, [path]);

  const drill = (c: SongCategory) =>
    Taro.navigateTo({ url: `/pages/song/list/index?path=${encodeURIComponent(c.path)}&title=${encodeURIComponent(c.name)}` });

  const play = (s: SongEntry) => {
    // ★点歌：本子类整体设为播放队列（同类自动续播/循环基础），队列项携真实音频/歌词/封面
    const idx = songs.findIndex((x) => x.path === s.path);
    usePlayerStore.getState().setQueue(
      songs.map((x) => ({ type: 'song' as const, id: x.path, title: x.displayTitle, audioUrl: x.audioUrl, lrcUrl: x.lrcUrl, coverUrl: x.coverUrl })),
      Math.max(0, idx),
    );
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(s.path)}&title=${encodeURIComponent(s.displayTitle)}` });
  };
  
  /** ★循环播放整个列表（用户定：列表目录右上一键列表循环）：设 repeat-all + 从第 1 首起播 */
  const loopAll = () => {
    if (songs.length === 0) return;
    usePlayerStore.getState().setPlayMode('repeat-all');
    play(songs[0]);
  };
  
  return (
    <View className={night}>
    <ScrollView scrollY className="page-v4" style={{ height: '100vh' }}>
      <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
        <Text className="serif" style={{ fontSize: '40px', fontWeight: 'bold', color: 'var(--color-text)', flex: 1 }}>{title}</Text>
        {songs.length > 0 && (
          <View className="loop-pill" onClick={loopAll}>
            <Image className="ic" src={iconLoop} mode="aspectFit" ariaLabel="循环播放图标" />
            <Text className="tx">循环播放</Text>
          </View>
        )}
      </View>
      <Text className="muted" style={{ display: 'block', marginBottom: '16px' }}>{subs.length > 0 ? `${subs.length} 个歌单` : `${songs.length} 首`}</Text>
      <StateView loading={loading} error={error} empty={subs.length === 0 && songs.length === 0} emptyText="这里还没有歌曲" onRetry={load}>
        {/* 语言子类卡（中文歌曲/双语歌曲/英文…），真封面 tiles */}
        {subs.length > 0 && (
          <View className="tilegrid">
            {subs.map((c) => (
              <View key={c.path} className="tile" onClick={() => drill(c)}>
                {c.coverUrl ? <Image className="cover" src={c.coverUrl} mode="aspectFill" ariaLabel={`${c.name}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} />}
                <View className="shade" />
                <View className="tt"><Text className="a">{c.name}</Text><Text className="b">{c.count ? `${c.count} 首` : ''}</Text></View>
              </View>
            ))}
          </View>
        )}
        {/* 歌曲列表（真封面 + 去语言前缀标题），长列表分批渲染 */}
        {songs.slice(0, visibleCount).map((s) => (
          <View key={s.path} className="list-row" style={{ margin: '0 4px 18px' }} onClick={() => play(s)}>
            {s.coverUrl ? <Image className="cvr" src={s.coverUrl} mode="aspectFill" ariaLabel={`${s.displayTitle}封面`} /> : <View className="cvr" style={{ background: 'linear-gradient(135deg,#E0F5F3,#C8EBE8)' }} />}
            <View className="gr"><Text className="nm">{s.displayTitle}</Text><Text className="ds">{title}</Text></View>
            <View className="cp" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC)' }}><Icon name="play" size={28} color="#fff" /></View>
          </View>
        ))}
        {songs.length > visibleCount ? (
          <View className="load-more-pill" onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, songs.length))}>
            <Icon name="down" size={22} color="var(--color-primary)" />
            <Text>再加载 {Math.min(PAGE_SIZE, songs.length - visibleCount)} 首</Text>
          </View>
        ) : null}
      </StateView>
    </ScrollView>
    {/* ★迷你栏在 ScrollView 外：weapp 下 ScrollView 内 fixed 子元素被裁剪 */}
    <MiniPlayer />
    </View>
  );
}
