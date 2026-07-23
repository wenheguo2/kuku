/**
 * pages/song/player — PL-02 歌曲播放器（LRC 逐行高亮）
 * 解析 LRC（utils/lrc）→ 播放整曲 → 按 currentTime 二分定位高亮行。
 * 无 LRC 降级为纯文本（md/06 §3.3）。mock 模式用模拟时钟演示高亮。
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Slider } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { player } from '@/services/audioPlayer';
import { CONFIG } from '@/services/config';
import { findLrcIndex, LrcLine, parseLrc } from '@/utils/lrc';
import { mockSong } from '@/services/mock';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { tracker } from '@/services/tracker';
import { useUserStore } from '@/stores/userStore';

export default function SongPlayer() {
  const router = useRouter();
  const night = useNight();
  const title = decodeURIComponent(router.params.title || '儿歌');
  const audioUrl = router.params.audio ? decodeURIComponent(router.params.audio) : '';
  const lrcUrl = router.params.lrc ? decodeURIComponent(router.params.lrc) : '';
  const coverUrl = router.params.cover ? decodeURIComponent(router.params.cover) : '';
  const [lines, setLines] = useState<LrcLine[]>([]);
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useRef(0);

  useEffect(() => {
    let parsed = CONFIG.USE_MOCK ? parseLrc(mockSong.lrc) : [];
    setLines(parsed);
    const offTime = player.onTimeUpdate((c, d) => {
      setCur(c);
      setDur(d || 0);
      setActive(findLrcIndex(parsed, c));
    });
    if (!CONFIG.USE_MOCK && audioUrl) {
      void (async () => {
        if (lrcUrl) {
          const response = await Taro.request<string>({ url: lrcUrl, timeout: 15_000 });
          if (response.statusCode >= 200 && response.statusCode < 300 && typeof response.data === 'string') {
            parsed = parseLrc(response.data);
            setLines(parsed);
          }
        }
        player.load(audioUrl, true, { title, album: '酷酷音乐厅', coverUrl });
        setPlaying(true);
        void tracker.track('song_play', { title }, useUserStore.getState().selectedChildId);
      })().catch((error) => {
        console.warn('歌曲加载失败', error);
        Taro.showToast({ title: '歌曲加载失败', icon: 'none' });
      });
    }
    return () => { offTime(); if (timer.current) clearInterval(timer.current); };
  }, []);

  const toggle = () => {
    if (CONFIG.USE_MOCK) {
      // 模拟时钟推进演示 LRC 高亮
      if (playing) { if (timer.current) clearInterval(timer.current); setPlaying(false); }
      else {
        timer.current = setInterval(() => { t.current += 0.5; setActive(findLrcIndex(lines, t.current)); }, 500);
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
        <View className="cbtn"><Icon name="prev" size={40} color="#2D3142" /></View>
        <View className="cbtn main" style={{ background: 'radial-gradient(circle at 35% 30%,#7EDCD4,#3FC5BC 70%,#25A39B)' }} onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={54} color="#fff" /></View>
        <View className="cbtn"><Icon name="next" size={40} color="#2D3142" /></View>
      </View>
      {CONFIG.USE_MOCK && <Text style={{ fontSize: '20px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '16px' }}>示例：点播放演示歌词逐行高亮</Text>}
    </View>
  );
}
