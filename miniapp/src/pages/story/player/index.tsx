/**
 * pages/story/player — PL-01 故事播放器（竖屏纯听 + 封面）
 * 加载 segments.json → 播放整曲 full.mp3；按 currentTime 定位当前段展示字幕；
 * 播放控制：播放/暂停 + 进度拖动；上报播放历史（POST /history）。
 * ★ 故事集自动续播：播完触发 playerStore.nextInQueue → 自动加载下一篇（GL-02 迷你栏同步）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Slider } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { player } from '@/services/audioPlayer';
import { playStory, skip } from '@/services/playbackQueue';
import { api } from '@/services/api';
import { buildAssetUrl } from '@/utils/path';
import { CONFIG } from '@/services/config';
import { SegmentsData } from '@/types/content';
import { useUserStore } from '@/stores/userStore';
import { usePlayerStore } from '@/stores/playerStore';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';

export default function StoryPlayer() {
  const router = useRouter();
  const night = useNight();
  const initPath = decodeURIComponent(router.params.path || '');
  const initTitle = decodeURIComponent(router.params.title || '故事');
  const resume = router.params.resume === '1';
  const [data, setData] = useState<SegmentsData | null>(null);
  const [title, setTitle] = useState(initTitle);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const reportLoadError = (error: unknown) => {
    console.warn('加载故事音频失败', error);
    Taro.showToast({ title: '故事加载失败，请稍后重试', icon: 'none' });
  };
  const displayedRef = useRef<string>('');

  /** 加载并（可选）播放一篇故事：播放统一走全局 playStory（含全局状态+历史），非播放只拉 segments 展示 */
  const loadStory = async (path: string, storyTitle: string, autoplay: boolean) => {
    displayedRef.current = path; // 先标记，避免下方 current 变化触发反向展示 effect 重复加载
    if (autoplay) {
      const seg = await playStory(path, storyTitle);
      setData(seg);
      setTitle(storyTitle);
      setPlaying(!CONFIG.USE_MOCK);
    } else {
      const seg = await indexLoader.loadSegments(path);
      setData(seg);
      setTitle(storyTitle);
    }
  };

  useEffect(() => {
    const offTime = player.onTimeUpdate((c, d) => {
      setCur(c);
      const total = d || 0;
      setDur(total);
      usePlayerStore.getState().setTime(c, total);
    });
    // ★ 续播由 App 级全局驱动（playbackQueue）统一接管，页面不再注册 onEnded，避免离页后断链
    const store = usePlayerStore.getState();
    if (resume && store.current?.type === 'story') {
      setTitle(store.current.title);
      setCur(store.currentSec);
      setDur(store.durationSec);
      setPlaying(store.isPlaying);
      displayedRef.current = store.current.id;
      indexLoader.loadSegments(store.current.id).then(setData).catch(reportLoadError);
    } else {
      // 直接进入（非从故事列表/章回）：若当前队列首项不是本故事，重置为单篇，避免残留歌单被误当“下一首”
      const q = store.queue[store.queueIndex];
      if (!(q && q.type === 'story' && q.id === initPath)) {
        store.setQueue([{ type: 'story', id: initPath, title: initTitle }], 0);
      }
      loadStory(initPath, initTitle, true).catch(reportLoadError);
    }
    return () => {
      offTime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 全局续播驱动切到新故事时，页面在前台则刷新展示（播放已由驱动接管）
  const currentId = usePlayerStore((s) => s.current?.id);
  useEffect(() => {
    if (!currentId || currentId === displayedRef.current) return;
    displayedRef.current = currentId;
    setTitle(usePlayerStore.getState().current?.title ?? '故事');
    setPlaying(usePlayerStore.getState().isPlaying);
    indexLoader.loadSegments(currentId).then(setData).catch(reportLoadError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); usePlayerStore.getState().setPlaying(false); }
    else { player.play(); setPlaying(true); usePlayerStore.getState().setPlaying(true); }
  };

  // 字幕时间轴自适应：mock 用 start_time/end_time(秒)；真实 segments 为 start_ms/duration_ms(毫秒，start_ms 多为 0 → 按 duration_ms 累计推算，配音对齐前为近似时间轴)
  const timedSegments = useMemo(() => {
    let accMs = 0;
    return (data?.segments ?? []).map((s) => {
      const startMs = s.start_time != null ? s.start_time * 1000 : (s.start_ms && s.start_ms > 0 ? s.start_ms : accMs);
      const endMs = s.end_time != null ? s.end_time * 1000 : startMs + (s.duration_ms ?? 0);
      accMs = endMs;
      return { text: s.text, startSec: startMs / 1000, endSec: endMs / 1000 };
    });
  }, [data]);
  const curSeg = timedSegments.find((s) => s.startSec <= cur && cur < s.endSec) ?? (cur > 0 ? timedSegments[timedSegments.length - 1] : timedSegments[0]);
  const hasQueue = usePlayerStore((s) => s.queue.length > 1);
  const playbackRate = usePlayerStore((s) => s.playbackRate); // 固定五挡 0.8~1.2，点击循环切换
  const fmt = (s: number) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? '0' : ''}${ss}`; };
  const playNext = () => { skip(1); };
  const favorite = async () => {
    if (!useUserStore.getState().isLogin) {
      await Taro.navigateTo({ url: '/pages/common/login/index' });
      return;
    }
    try {
      await api.post('/favorites', {
        content_type: 'story',
        content_id: usePlayerStore.getState().current?.id || initPath,
        content_title: title,
      });
      Taro.showToast({ title: '已收藏', icon: 'success' });
    } catch (error) {
      console.warn('收藏失败', error);
    }
  };
  const share = () => {
    Taro.showShareMenu({ withShareTicket: true });
    Taro.showToast({ title: '请使用右上角菜单分享', icon: 'none' });
  };

  return (
    <View className={`player-lamp ${night}`}>
      {/* 封面氛围模糊铺底 */}
      <View className="pbg">
        {data?.cover_url ? <Image className="cover" src={buildAssetUrl(data.cover_url)} mode="aspectFill" ariaLabel={`${title}背景封面`} /> : null}
      </View>
      <View className="pbg-mask" />

      <View className="pscr">
        <View className="pnav">
          <View onClick={() => Taro.navigateBack().catch((error) => console.warn('返回上一页失败', error))}>
            <Icon name="down" size={44} color="#fff" />
          </View>
          <Text className="ti">正在播放 · 故事灯</Text>
          <Icon name="dots" size={44} color="#fff" />
        </View>

        {/* 圆形发光封面（呼吸光晕） */}
        <View className="lampcov">
          {data?.cover_url
            ? <Image className="cover" src={buildAssetUrl(data.cover_url)} mode="aspectFill" ariaLabel={`${title}封面`} />
            : <View className="cover" style={{ background: 'radial-gradient(circle at 40% 35%,#FFD9A0,#F2751F)' }} />}
        </View>

        <Text className="ptitle serif">{title}</Text>
        <Text className="psub">{curSeg?.text || (hasQueue ? '故事集播放中 · 播完自动续播' : (CONFIG.USE_MOCK ? '示例播放' : '加载中…'))}</Text>

        <Slider className="lamp-slider" min={0} max={Math.max(dur, 1)} value={cur} activeColor="#FFC98F" backgroundColor="rgba(255,255,255,0.25)" blockColor="#FFF3DC"
          onChange={(e) => { player.seek(e.detail.value); setCur(e.detail.value); }} />
        <View className="ptime"><Text>{fmt(cur)}</Text><Text>{fmt(dur)}</Text></View>

        <View className="pctrls">
          <View className="pbtn" onClick={() => { player.seek(0); setCur(0); }}><Icon name="prev" size={40} color="#fff" /></View>
          <View className="pbtn main" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={56} color="#fff" /></View>
          <View className="pbtn" onClick={playNext}><Icon name="next" size={40} color="#fff" /></View>
        </View>

        <View className="pfns">
          <View className="fn" onClick={() => void favorite()}><Icon name="heart" size={40} color="#fff" /><Text>收藏</Text></View>
          <View className="fn" onClick={share}><Icon name="share" size={40} color="#fff" /><Text>分享</Text></View>
          <View className="fn" onClick={() => player.cycleRate()}><Text style={{ fontSize: '32px', fontWeight: 800, lineHeight: '40px', height: '40px' }}>{playbackRate.toFixed(1)}x</Text><Text>倍速</Text></View>
          <View className="fn" onClick={() => Taro.navigateTo({ url: '/pages/common/settings/index' })}><Icon name="timer" size={40} color="#fff" /><Text>定时</Text></View>
          <View className="fn" onClick={() => Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/story/index/index' }))}><Icon name="list" size={40} color="#fff" /><Text>列表</Text></View>
        </View>
      </View>
    </View>
  );
}
