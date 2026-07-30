/**
 * pages/song/index — M-01 歌曲首页（v4 青绿主题：问候 + Hero + 分类 tiles + 最近播放）
 * ★ 真实索引（2026-07-29 歌曲内容就位）：43 分类真封面 tiles；Hero=首个带封面分类；
 *   最近播放=历史接口 song 首条（audioUrl/lrcUrl/封面按歌曲路径规则构造，点击直接续播）。
 */
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import MiniPlayer from '@/components/MiniPlayer';
import TabBarV4 from '@/components/TabBarV4';
import ShareBar from '@/components/ShareBar';
import avatarImg from '@/assets/avatar.jpg';
import iconSearch from '@/assets/icon_search.png';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { useShareCard } from '@/hooks/useShareCard';
import { useTabStore } from '@/stores/tabStore';
import { useUserStore } from '@/stores/userStore';
import { usePlayerStore } from '@/stores/playerStore';
import { api } from '@/services/api';
import { buildAssetUrl, buildCoverUrl } from '@/utils/path';
import { cleanSongTitle, loadSongCategories, SongCategory } from '@/services/songCatalog';

const TEAL = '#3FC5BC';

interface HistItem { content_type: string; content_id: string; title: string | null }

/** 歌曲单曲封面按路径规则构造：covers/generated/{path}/{歌名}_1.jpg（索引外场景用，404 由消费方兜底） */
const songCoverFromPath = (p: string) => {
  const name = p.split('/').filter(Boolean).pop();
  return name ? buildCoverUrl(`covers/generated/${p}/${name}_1.jpg`) : '';
};

export default function SongHome() {
  const night = useNight();
  const [cats, setCats] = useState<SongCategory[]>([]);
  const [last, setLast] = useState<HistItem | null>(null);
  const [lastCoverOk, setLastCoverOk] = useState(true);
  const isLogin = useUserStore((s) => s.isLogin);
  const selectedChildId = useUserStore((s) => s.selectedChildId);

  useEffect(() => {
    loadSongCategories().then(setCats).catch((error) => console.warn('加载歌曲分类失败', error));
  }, []);
  // 分享卡：学科启蒙儿歌插画卡面（转发好友 + 朋友圈）；落地直到音乐厅
  useShareCard({ title: '酷酷音乐厅 — 学科启蒙儿歌一起唱', card: 'E05_学科启蒙', path: '/pages/song/index/index' });
  useDidShow(() => {
    useTabStore.getState().setTab('song');
    if (isLogin && selectedChildId) {
      api.get<{ list: HistItem[] }>(`/history?child_id=${selectedChildId}`)
        .then((d) => setLast((d.list || []).find((h) => h.content_type === 'song') || null))
        .catch((error) => console.warn('歌曲最近播放加载失败', error));
    }
  });

  const goCat = (c: SongCategory) =>
    Taro.navigateTo({ url: `/pages/song/list/index?path=${encodeURIComponent(c.path)}&title=${encodeURIComponent(c.name)}` });
  /** ★你的播放列表（用户定：今日歌单改收藏歌单）：点开=收藏页歌曲段，那里可顺序/循环播全部 */
  const openMyList = () => {
    if (!isLogin) { Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
    Taro.navigateTo({ url: '/pages/common/favorites/index?tab=song' });
  };
  /** 历史续播：按路径规则构造队列项（音频/歌词/封面），单曲队列直接播 */
  const playLast = (h: HistItem) => {
    const title = cleanSongTitle(h.title) || '儿歌';
    usePlayerStore.getState().setQueue([{
      type: 'song' as const,
      id: h.content_id,
      title,
      audioUrl: buildAssetUrl(`generated_stories/${h.content_id}.mp3`),
      lrcUrl: buildAssetUrl(`generated_stories/${h.content_id}.txt`),
      coverUrl: songCoverFromPath(h.content_id) || undefined,
    }], 0);
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(h.content_id)}&title=${encodeURIComponent(title)}` });
  };

  // ★Hero=你的播放列表（封面用“其他类型”分类图，用户定）
  const myListCover = cats.find((c) => c.name === '其他类型')?.coverUrl || '';

  return (
    <View className={night}>
    <ScrollView scrollY className="page-v4 has-tab" style={{ height: '100vh' }}>
      <View className="greet">
        <Image className="avatar" src={avatarImg} mode="aspectFill" ariaLabel="小听众头像" style={{ boxShadow: '0 4px 12px rgba(63,197,188,.35)' }} />
        <View className="flex-1">
          <Text className="hi">一起唱歌吧 🎵</Text>
          <Text className="big serif">酷酷音乐厅</Text>
        </View>
        <View className="sbtn" onClick={() => Taro.navigateTo({ url: '/pages/common/search/index?scope=song' })}><Image className="im" src={iconSearch} mode="aspectFill" ariaLabel="搜索" /></View>
      </View>

      {/* Hero：你的播放列表（收藏歌曲，点开即可顺序/循环播） */}
      {cats.length > 0 && (
        <View>
          <View className="hero" onClick={openMyList}>
            {myListCover ? <Image className="cover" src={myListCover} mode="aspectFill" ariaLabel="你的播放列表封面" /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} />}
            <View className="shade" />
            <View className="inner">
              <Text className="htag">💖 你的播放列表</Text>
              <Text className="h-title serif">我收藏的歌</Text>
              <Text className="h-meta">{isLogin ? '点开顺序播你收藏的歌曲' : '登录后听你收藏的歌'}</Text>
            </View>
            <View className="hplay" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC 70%,#25A39B)' }}><Icon name="play" size={42} color="#fff" /></View>
          </View>
          <View className="dots-i"><Text className="on" style={{ background: TEAL }} /><Text /><Text /></View>
        </View>
      )}

      {/* ★分享拉新（通用组件，与故事首页一致）：青绿主题下也用橙色横条，保持全站分享入口识别度 */}
      <ShareBar text="🎵 把好听的儿歌分享给小伙伴" />

      {/* 最近播放（历史 song 首条，点击续播） */}
      {last && (
        <View>
          <View className="sec-h"><Text className="t">最近播放</Text></View>
          <View className="list-row" style={{ margin: '0 4px 18px' }} onClick={() => playLast(last)}>
            {lastCoverOk && songCoverFromPath(last.content_id)
              ? <Image className="cvr" src={songCoverFromPath(last.content_id)} mode="aspectFill" onError={() => setLastCoverOk(false)} ariaLabel={`${cleanSongTitle(last.title) || '最近播放'}封面`} />
              : <View className="cvr" style={{ background: 'linear-gradient(135deg,#E0F5F3,#C8EBE8)' }} />}
            <View className="gr"><Text className="nm">{cleanSongTitle(last.title) || last.content_id.split('/').pop()}</Text><Text className="ds">再唱一遍上次的歌</Text></View>
            <View className="cp" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC)' }}><Icon name="play" size={28} color="#fff" /></View>
          </View>
        </View>
      )}

      {/* 歌曲分类（真实 43 个，真封面） */}
      <View className="sec-h"><Text className="t">歌曲分类</Text><Text className="m" style={{ color: TEAL }}>{cats.length} 类</Text></View>
      <View className="tilegrid">
        {cats.map((c) => (
          <View key={c.path} className="tile" onClick={() => goCat(c)}>
            {c.coverUrl ? <Image className="cover" src={c.coverUrl} mode="aspectFill" ariaLabel={`${c.name}封面`} /> : <View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} />}
            <View className="shade" />
            <View className="tt"><Text className="a">{c.name}</Text><Text className="b">{c.count ? `${c.count} 首` : ''}</Text></View>
          </View>
        ))}
      </View>
      </ScrollView>
      {/* ★迷你栏/TabBar 必须在 ScrollView 外：weapp 下 ScrollView 内 fixed 子元素被裁剪不显示（用户实测） */}
      <MiniPlayer />
      {process.env.TARO_ENV === 'h5' && <TabBarV4 />}
    </View>
  );
}
