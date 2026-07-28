/**
 * pages/song/index — M-01 歌曲首页（v4 青绿主题：问候 + Hero + 分类 tiles + 最近播放）
 * MVP mock 演示；真实歌曲索引接入后替换数据源。
 */
import { View, Text, ScrollView, Image } from '@tarojs/components';
import Taro, { useDidShow } from '@tarojs/taro';
import MiniPlayer from '@/components/MiniPlayer';
import TabBarV4 from '@/components/TabBarV4';
import avatarImg from '@/assets/avatar.jpg';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { useTabStore } from '@/stores/tabStore';

const TEAL = '#3FC5BC';
const CATS = [
  { name: '摇篮曲', n: '86 首', g: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' },
  { name: '童话故事', n: '124 首', g: 'linear-gradient(135deg,#8FD97B,#7FC96A)' },
  { name: '动物世界', n: '98 首', g: 'linear-gradient(135deg,#FFB067,#FF8C42)' },
  { name: '神话故事', n: '76 首', g: 'linear-gradient(135deg,#B8A9E8,#9D86E0)' },
];
const HOT = [
  { id: 'S001_两只老虎', title: '两只老虎', meta: '经典儿歌 · 1分12秒' },
  { id: 'S002_小星星', title: '小星星', meta: '经典儿歌 · 1分08秒' },
];

export default function SongHome() {
  const night = useNight();
  useDidShow(() => useTabStore.getState().setTab('song'));
  const play = (id: string, title: string) =>
    Taro.navigateTo({ url: `/pages/song/player/index?id=${id}&title=${encodeURIComponent(title)}` });
  const goCat = (cat: string) =>
    Taro.navigateTo({ url: `/pages/song/list/index?cat=${encodeURIComponent(cat)}` });

  return (
    <ScrollView scrollY className={`page-v4 has-tab ${night}`}>
      <View className="greet">
        <Image className="avatar" src={avatarImg} mode="aspectFill" ariaLabel="小听众头像" style={{ boxShadow: '0 4px 12px rgba(63,197,188,.35)' }} />
        <View className="flex-1">
          <Text className="hi">一起唱歌吧 🎵</Text>
          <Text className="big serif">酷酷音乐厅</Text>
        </View>
        <View className="sbtn" onClick={() => Taro.navigateTo({ url: '/pages/common/search/index?scope=song' })}><Icon name="search" size={38} color={TEAL} /></View>
      </View>

      {/* Hero 合唱榜 */}
      <View className="hero" onClick={() => play(HOT[0].id, HOT[0].title)}>
        <View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} />
        <View className="shade" />
        <View className="inner">
          <Text className="htag">🎤 合唱榜 TOP1</Text>
          <Text className="h-title serif">{HOT[0].title}</Text>
          <Text className="h-meta">{HOT[0].meta}</Text>
        </View>
        <View className="hplay" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC 70%,#25A39B)' }}><Icon name="play" size={42} color="#fff" /></View>
      </View>
      <View className="dots-i"><Text className="on" style={{ background: TEAL }} /><Text /><Text /></View>

      {/* 歌曲分类 */}
      <View className="sec-h"><Text className="t">歌曲分类</Text><Text className="m" style={{ color: TEAL }}>全部 ›</Text></View>
      <View className="tilegrid">
        {CATS.map((c) => (
          <View key={c.name} className="tile" onClick={() => goCat(c.name)}>
            <View className="cover" style={{ background: c.g }} />
            <View className="shade" />
            <View className="tt"><Text className="a">{c.name}</Text><Text className="b">{c.n}</Text></View>
          </View>
        ))}
      </View>

      {/* 最近播放 */}
      <View className="sec-h"><Text className="t">最近播放</Text><Text className="m" style={{ color: TEAL }}>更多 ›</Text></View>
      {HOT.map((s) => (
        <View key={s.id} className="list-row" style={{ margin: '0 4px 18px' }} onClick={() => play(s.id, s.title)}>
          <View className="cvr" style={{ background: 'linear-gradient(135deg,#E0F5F3,#C8EBE8)' }} />
          <View className="gr"><Text className="nm">{s.title}</Text><Text className="ds">{s.meta}</Text></View>
          <View className="cp" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC)' }}><Icon name="play" size={28} color="#fff" /></View>
        </View>
      ))}
      <MiniPlayer />
      {process.env.TARO_ENV === 'h5' && <TabBarV4 />}
    </ScrollView>
  );
}
