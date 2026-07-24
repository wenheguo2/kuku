/**
 * pages/song/list — M-02/M-03 歌曲分类下钻（歌曲列表）
 * 歌曲当前为 mock 演示：按分类名展示歌曲列表 → 歌曲播放器(PL-02)。
 * 真实歌曲索引接入后，把 SONGS 换成 indexLoader 拉取的分类索引即可（结构对齐故事）。
 */
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { usePlayerStore } from '@/stores/playerStore';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { SONG_CATEGORIES } from '@/services/songCatalog';

// mock 歌曲库改由共享 songCatalog 提供（song/list 与 搜索 共用，避免重复维护）
const SONGS = SONG_CATEGORIES;

export default function SongList() {
  const router = useRouter();
  const cat = decodeURIComponent(router.params.cat || '摇篮曲');
  const night = useNight();
  const list = SONGS[cat] ?? SONGS['摇篮曲'];

  const play = (id: string, title: string) => {
    // ★ 点歌：把本分类整个列表设为播放队列（同类自动续播/循环基础），再进播放器
    // 真实歌曲索引接入后，此处为每项补 audioUrl/lrcUrl/coverUrl
    const idx = list.findIndex((s) => s.id === id);
    usePlayerStore.getState().setQueue(
      list.map((s) => ({ type: 'song' as const, id: s.id, title: s.title })),
      Math.max(0, idx),
    );
    Taro.navigateTo({ url: `/pages/song/player/index?id=${encodeURIComponent(id)}&title=${encodeURIComponent(title)}` });
  };

  return (
    <ScrollView scrollY className={`page-v4 ${night}`}>
      <Text className="serif" style={{ fontSize: '40px', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>{cat}</Text>
      <Text className="muted" style={{ display: 'block', marginBottom: '16px' }}>{list.length} 首</Text>
      {list.map((s) => (
        <View key={s.id} className="list-row" style={{ margin: '0 4px 18px' }} onClick={() => play(s.id, s.title)}>
          <View className="cvr" style={{ background: 'linear-gradient(135deg,#E0F5F3,#C8EBE8)' }} />
          <View className="gr"><Text className="nm">{s.title}</Text><Text className="ds">{s.meta}</Text></View>
          <View className="cp" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC)' }}><Icon name="play" size={28} color="#fff" /></View>
        </View>
      ))}
      <MiniPlayer />
    </ScrollView>
  );
}
