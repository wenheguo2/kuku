/**
 * pages/growth/player — PL-03 教学播放器（v4 横屏三区）
 * 左场景 65% + 立绘｜右字词面板 35%(衬线大字)｜底部字幕条(生字金色高亮) + 控制栏。
 * 同步：timeline.json 二分定位（utils/timeline.locateSegment）驱动字幕；mock 用模拟时钟演示。
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text } from '@tarojs/components';
import { useRouter } from '@tarojs/taro';
import { locateSegment, TimelineSeg } from '@/utils/timeline';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';

const MOCK_TIMELINE: TimelineSeg[] = [
  { seq: 1, start_ms: 0, end_ms: 3000, duration_ms: 3000, segment_id: 's1', character: '酷酷', text: '这是一个月亮的夜晚' },
  { seq: 2, start_ms: 3000, end_ms: 6000, duration_ms: 3000, segment_id: 's2', character: '桃子', text: '月亮的月，读作 yuè' },
  { seq: 3, start_ms: 6000, end_ms: 9000, duration_ms: 3000, segment_id: 's3', character: '老师', text: '月光、明月，都有月字' },
];

export default function TeachingPlayer() {
  const router = useRouter();
  const night = useNight();
  const word = decodeURIComponent(router.params.word || '月');
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useRef(0);

  useEffect(() => {
    if (!playing) return undefined;
    timer.current = setInterval(() => {
      t.current += 500;
      setIdx(Math.max(0, locateSegment(MOCK_TIMELINE, t.current % 9000)));
    }, 500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [playing]);

  const seg = MOCK_TIMELINE[idx];
  const parts = (seg?.text || '').split(word);

  return (
    <View className={`eland ${night}`}>
      <View className="etop">
        {/* 左：场景 + 立绘 */}
        <View className="esceneL">
          <View className="cover" style={{ background: 'linear-gradient(135deg,#8FD97B,#5FA84C)' }} />
        </View>
        {/* 右：字词面板 */}
        <View className="ewordR">
          <Text style={{ fontSize: '20px', fontWeight: 800, color: '#3E7C2B', background: '#EAF6E4', padding: '5px 18px', borderRadius: '14px' }}>今日生字</Text>
          <Text className="eword-big serif">{word}</Text>
          <Text style={{ fontSize: '26px', color: 'var(--color-text-secondary)' }}>yuè</Text>
          <Text style={{ fontSize: '22px', color: 'var(--color-text-secondary)' }}>月亮 · 月光 · 明月</Text>
        </View>
      </View>

      {/* 字幕条（生字金色高亮） */}
      <View className="esub">
        {parts.map((p, i) => (
          <Text key={i}>{p}{i < parts.length - 1 && <Text className="hl" style={{ color: '#FFD873', fontWeight: 800 }}>{word}</Text>}</Text>
        ))}
      </View>

      {/* 控制栏 */}
      <View className="ectrl">
        <View className="ebtn"><Icon name="prev" size={30} color="#2D3142" /></View>
        <View className="ebtn main" onClick={() => setPlaying((p) => !p)}><Icon name={playing ? 'pause' : 'play'} size={36} color="#fff" /></View>
        <View className="ebtn"><Icon name="next" size={30} color="#2D3142" /></View>
        <View className="ebtn"><Icon name="refresh" size={28} color="#2D3142" /></View>
      </View>
    </View>
  );
}
