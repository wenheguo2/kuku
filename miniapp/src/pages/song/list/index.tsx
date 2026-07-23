/**
 * pages/song/list — M-02/M-03 歌曲分类下钻（歌曲列表）
 * 歌曲当前为 mock 演示：按分类名展示歌曲列表 → 歌曲播放器(PL-02)。
 * 真实歌曲索引接入后，把 SONGS 换成 indexLoader 拉取的分类索引即可（结构对齐故事）。
 */
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import MiniPlayer from '@/components/MiniPlayer';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';

// mock 歌曲库（按分类）；真实态改为按分类 path 拉歌曲索引
const SONGS: Record<string, { id: string; title: string; meta: string }[]> = {
  摇篮曲: [
    { id: 'L001_摇篮曲', title: '摇篮曲', meta: '舒伯特 · 2分10秒' },
    { id: 'L002_小宝贝快睡觉', title: '小宝贝快睡觉', meta: '轻音乐 · 1分50秒' },
    { id: 'L003_月亮船', title: '月亮船', meta: '安眠曲 · 2分30秒' },
  ],
  童话故事: [
    { id: 'T001_丑小鸭', title: '丑小鸭', meta: '童话儿歌 · 3分00秒' },
    { id: 'T002_白雪公主', title: '白雪公主', meta: '童话儿歌 · 3分20秒' },
  ],
  动物世界: [
    { id: 'A001_两只老虎', title: '两只老虎', meta: '经典儿歌 · 1分12秒' },
    { id: 'A002_小毛驴', title: '小毛驴', meta: '经典儿歌 · 1分30秒' },
    { id: 'A003_数鸭子', title: '数鸭子', meta: '经典儿歌 · 1分40秒' },
  ],
  神话故事: [
    { id: 'M001_嫦娥奔月', title: '嫦娥奔月', meta: '神话儿歌 · 2分40秒' },
    { id: 'M002_夸父追日', title: '夸父追日', meta: '神话儿歌 · 2分20秒' },
  ],
};

export default function SongList() {
  const router = useRouter();
  const cat = decodeURIComponent(router.params.cat || '摇篮曲');
  const night = useNight();
  const list = SONGS[cat] ?? SONGS['摇篮曲'];

  const play = (id: string, title: string) =>
    Taro.navigateTo({ url: `/pages/song/player/index?id=${id}&title=${encodeURIComponent(title)}` });

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
