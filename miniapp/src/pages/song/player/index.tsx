/**
 * pages/song/player — PL-02 歌曲播放器（LRC 逐行高亮 + 队列续播/播放模式）
 * 解析 LRC（utils/lrc）→ 播放整曲 → 按 currentTime 二分定位高亮行。无 LRC 降级纯文本。
 * ★ 接入 playerStore 歌单队列：上一首/下一首（skip）+ 播放模式（顺序/单曲循环/列表循环）；
 *   续播由 App 级 playbackQueue 全局驱动，页面只做展示订阅。mock 模式用模拟时钟演示高亮。
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Slider } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { player } from '@/services/audioPlayer';
import { playSong, skip } from '@/services/playbackQueue';
import { CONFIG } from '@/services/config';
import { findLrcIndex, LrcLine, parseLrc } from '@/utils/lrc';
import { mockSong } from '@/services/mock';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { usePlayerStore, PlayMode } from '@/stores/playerStore';

const MODE_LABEL: Record<PlayMode, string> = { order: '顺序播放', 'repeat-all': '列表循环', 'repeat-one': '单曲循环' };

export default function SongPlayer() {
  const router = useRouter();
  const night = useNight();
  const initId = router.params.id ? decodeURIComponent(router.params.id) : '';
  const initTitle = decodeURIComponent(router.params.title || '儿歌');
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useRef(0);
  const linesRef = useRef<LrcLine[]>([]);

  // 展示订阅：标题/播放模式随全局状态刷新（续播由全局驱动切歌时页面同步）
  const currentTitle = usePlayerStore((s) => (s.current?.type === 'song' ? s.current.title : ''));
  const currentId = usePlayerStore((s) => (s.current?.type === 'song' ? s.current.id : ''));
  const playMode = usePlayerStore((s) => s.playMode);
  const title = currentTitle || initTitle;

  useEffect(() => {
    const parsed = CONFIG.USE_MOCK ? parseLrc(mockSong.lrc) : [];
    linesRef.current = parsed;
    setLines(parsed);
    const offTime = player.onTimeUpdate((c, d) => {
      setCur(c);
      setDur(d || 0);
      setActive(findLrcIndex(linesRef.current, c));
    });
    // 起播：优先用队列当前歌曲项（song/list/收藏已 setQueue）；否则重置为单曲，避免残留故事队列被误当“下一首”
    const store = usePlayerStore.getState();
    const item = store.queue[store.queueIndex];
    if (item && item.type === 'song' && (!initId || item.id === initId)) {
      playSong(item);
    } else {
      const single = { type: 'song' as const, id: initId || initTitle, title: initTitle };
      store.setQueue([single], 0);
      playSong(single);
    }
    if (!CONFIG.USE_MOCK) setPlaying(true);
    return () => { offTime(); if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切歌（手动 skip 或全局续播）时重置歌词/进度/模拟时钟
  useEffect(() => {
    setActive(-1); setCur(0); t.current = 0;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setPlaying(!CONFIG.USE_MOCK);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const toggle = () => {
    if (CONFIG.USE_MOCK) {
      if (playing) { if (timer.current) clearInterval(timer.current); setPlaying(false); } else {
        timer.current = setInterval(() => { t.current += 0.5; setActive(findLrcIndex(linesRef.current, t.current)); }, 500);
        setPlaying(true);
      }
      return;
    }
    if (playing) { player.pause(); setPlaying(false); } else { player.play(); setPlaying(true); }
  };

  return (
    <View className={`page-v4 ${night}`} style={{ textAlign: 'center' }}>
      <View className="scov"><View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} /></View>
      <Text className="serif" style={{ fontSize: '38px', fontWeight: 800, marginTop: '28px', display: 'block' }}>{title}</Text>
      <Text style={{ fontSize: '22px', color: 'var(--color-text-secondary)', marginTop: '8px', display: 'block' }}>经典儿歌</Text>
      <View className="lyr">
        {lines.length === 0 && <Text>暂无歌词</Text>}
        {lines.map((l, i) => (i === active
          ? <Text key={i} className="on">{l.text}</Text>
          : <Text key={i} style={{ display: 'block' }}>{l.text}</Text>))}
      </View>
      <Slider
        style={{ margin: '32px 8px 0' }}
        min={0}
        max={Math.max(dur, 1)}
        value={cur}
        activeColor="#3FC5BC"
        backgroundColor="#F0E6D8"
        blockColor="#3FC5BC"
        disabled={CONFIG.USE_MOCK}
        onChange={(event) => {
          player.seek(event.detail.value);
          setCur(event.detail.value);
        }}
      />
      <View className="ctrls">
        <View className="cbtn" onClick={() => skip(-1)}><Icon name="prev" size={40} color="#2D3142" /></View>
        <View className="cbtn main" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC 70%,#25A39B)' }} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={54} color="#fff" /></View>
        <View className="cbtn" onClick={() => skip(1)}><Icon name="next" size={40} color="#2D3142" /></View>
      </View>
      {/* 播放模式切换：顺序 / 列表循环 / 单曲循环 */}
      <Text
        className="chip"
        style={{ marginTop: '20px' }}
        onClick={() => usePlayerStore.getState().cyclePlayMode()}
      >
        🔁 {MODE_LABEL[playMode]}
      </Text>
      {CONFIG.USE_MOCK && <Text style={{ fontSize: '20px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '16px' }}>示例：点播放演示歌词逐行高亮</Text>}
    </View>
  );
}
