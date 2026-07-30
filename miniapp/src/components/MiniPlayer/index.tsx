/**
 * MiniPlayer — GL-02 全局玻璃拟态迷你播放栏（v4）
 * 读 playerStore.current 展示当前播放；控制全局 player 单例；点击回到对应播放器。
 * weapp 不支持 backdrop-filter，用半透明实底近似玻璃感。
 */
import { View, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { usePlayerStore } from '@/stores/playerStore';
import { player } from '@/services/audioPlayer';
import iconPlaying from '@/assets/icon_playing.png';
import iconPlayReady from '@/assets/icon_play_ready.png';
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

  // ★避让由宿主页面显式声明 onTab（tab 首页传 true 上移避 TabBar）；
  // 弃 getCurrentPages 推断：其渲染时机可能在播放器页内触发致误判贴底遮内容（用户实测）
  const dismiss = () => {
    player.pause();
    usePlayerStore.getState().reset();
  };

  return (
    <View className="mini-fab" onClick={expand}>
      <View className="mini-fab-x" onClick={(e) => { e.stopPropagation(); dismiss(); }}>×</View>
      {/* 插画两态：播放中/准备播放（纯视觉态，点浮窗展开对应播放器，与原交互一致） */}
      <Image className="mimg" src={isPlaying ? iconPlaying : iconPlayReady} mode="aspectFill" ariaLabel={isPlaying ? '播放中' : '准备播放'} />
    </View>
  );
}
