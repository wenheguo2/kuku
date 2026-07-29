/**
 * MiniPlayer — GL-02 全局玻璃拟态迷你播放栏（v4）
 * 读 playerStore.current 展示当前播放；控制全局 player 单例；点击回到对应播放器。
 * weapp 不支持 backdrop-filter，用半透明实底近似玻璃感。
 */
import { View, Text, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePlayerStore } from '@/stores/playerStore';
import { player } from '@/services/audioPlayer';
import { buildAssetUrl } from '@/utils/path';
import Icon from '@/components/Icon';
import './index.scss';

const PLAYER_PAGE: Record<string, string> = {
  story: '/pages/story/player/index',
  song: '/pages/song/player/index',
  lesson: '/pages/growth/player/index',
};

export default function MiniPlayer() {
  // 选择性订阅：只盯 current/isPlaying，避免播放中 currentSec/durationSec 每秒变化触发重渲染。
  const current = usePlayerStore((s) => s.current);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setPlaying = usePlayerStore((s) => s.setPlaying);
  if (!current) return null;

  const toggle = () => {
    if (isPlaying) { player.pause(); setPlaying(false); }
    else { player.play(); setPlaying(true); }
  };
  const expand = () => {
    const url = PLAYER_PAGE[current.type];
    if (url) Taro.navigateTo({ url: `${url}?resume=1` });
  };

  // tab 页有固定 TabBar（110px），迷你栏需上移避让；非 tab 页贴底
  const pages = Taro.getCurrentPages();
  const route = pages.length ? pages[pages.length - 1].route || '' : '';
  const onTab = /pages\/(story|song|growth|parent)\/index\/index$/.test(route);

  return (
    <View className="mini-wrap" style={{ bottom: onTab ? '128px' : '24px' }}>
      <View className="mini-v4">
        {current.coverUrl
          ? <Image className="cvr" webp src={buildAssetUrl(current.coverUrl)} mode="aspectFill" ariaLabel={`${current.title}封面`} />
          : <View className="cvr" />}
        <View className="gr" onClick={expand}>
          <Text className="t">{current.title}</Text>
          <Text className="s">{current.type === 'song' ? '歌曲' : current.type === 'lesson' ? '教学' : '故事'}</Text>
        </View>
        <View className="mp" onClick={toggle}><Icon name={isPlaying ? 'pause' : 'play'} size={34} color="#fff" /></View>
      </View>
    </View>
  );
}
