/**
 * pages/story/player — PL-01 故事播放器（竖屏纯听 + 封面）
 * 加载 segments.json → 播放整曲 full.mp3；按 currentTime 定位当前段展示字幕；
 * 播放控制：播放/暂停 + 进度拖动；上报播放历史（POST /history）。
 * ★ 故事集自动续播：播完触发 playerStore.nextInQueue → 自动加载下一篇（GL-02 迷你栏同步）。
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, Slider } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { player } from '@/services/audioPlayer';
import { api } from '@/services/api';
import { buildAssetUrl } from '@/utils/path';
import { CONFIG } from '@/services/config';
import { SegmentsData } from '@/types/content';
import { useUserStore } from '@/stores/userStore';
import { usePlayerStore } from '@/stores/playerStore';
import Icon from '@/components/Icon';
import { tracker } from '@/services/tracker';
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
  const reportedPaths = useRef<Set<string>>(new Set());
  const reportLoadError = (error: unknown) => {
    console.warn('加载故事音频失败', error);
    Taro.showToast({ title: '故事加载失败，请稍后重试', icon: 'none' });
  };

  /** 加载并（可选）播放一篇故事，同步全局播放状态 */
  const loadStory = async (path: string, storyTitle: string, autoplay: boolean) => {
    const seg = await indexLoader.loadSegments(path);
    setData(seg);
    setTitle(storyTitle);
    usePlayerStore.getState().setCurrent({ type: 'story', id: path, title: storyTitle, coverUrl: seg.cover_url });
    const audio = seg.full_audio_url
      ? buildAssetUrl(seg.full_audio_url)
      : `${CONFIG.staticBaseUrl}/audio/${path.split('/').map(encodeURIComponent).join('/')}/full.mp3`;
    if (!CONFIG.USE_MOCK && autoplay) {
      player.load(audio, true, {
        title: storyTitle,
        album: '酷酷儿童故事',
        coverUrl: seg.cover_url ? buildAssetUrl(seg.cover_url) : undefined,
      });
      setPlaying(true);
      usePlayerStore.getState().setPlaying(true);
    }
    // 首次播放上报历史
    const { selectedChildId } = useUserStore.getState();
    if (selectedChildId && !reportedPaths.current.has(path)) {
      reportedPaths.current.add(path);
      api.post('/history', {
        child_id: selectedChildId,
        content_type: 'story',
        content_id: path,
        content_title: storyTitle,
      }).catch((error) => console.warn('上报播放历史失败', error));
      void tracker.track('story_play', { content_id: path, title: storyTitle }, selectedChildId);
    }
  };

  useEffect(() => {
    const offTime = player.onTimeUpdate((c, d) => {
      setCur(c);
      const total = d || 0;
      setDur(total);
      usePlayerStore.getState().setTime(c, total);
    });
    // ★ 播完自动续播下一篇
    const offEnded = player.onEnded(() => {
      const next = usePlayerStore.getState().nextInQueue();
      if (next) {
        loadStory(next.path, next.title, true).catch(reportLoadError);
      } else {
        setPlaying(false);
        usePlayerStore.getState().setPlaying(false);
      }
    });
    const store = usePlayerStore.getState();
    if (resume && store.current?.type === 'story') {
      setTitle(store.current.title);
      setCur(store.currentSec);
      setDur(store.durationSec);
      setPlaying(store.isPlaying);
      indexLoader.loadSegments(store.current.id).then(setData).catch(reportLoadError);
    } else {
      loadStory(initPath, initTitle, true).catch(reportLoadError);
    }
    return () => {
      offTime();
      offEnded();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); usePlayerStore.getState().setPlaying(false); }
    else { player.play(); setPlaying(true); usePlayerStore.getState().setPlaying(true); }
  };

  const curSeg = (data?.segments ?? []).find((s) => (s.start_time ?? 0) <= cur && cur < (s.end_time ?? 1e9));
  const hasQueue = usePlayerStore((s) => s.queue.length > 1);
  const fmt = (s: number) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? '0' : ''}${ss}`; };
  const playNext = () => {
    const next = usePlayerStore.getState().nextInQueue();
    if (next) loadStory(next.path, next.title, true).catch(reportLoadError);
  };
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
          <View className="fn" onClick={() => Taro.navigateTo({ url: '/pages/common/settings/index' })}><Icon name="timer" size={40} color="#fff" /><Text>定时</Text></View>
          <View className="fn" onClick={() => Taro.navigateBack()}><Icon name="list" size={40} color="#fff" /><Text>列表</Text></View>
        </View>
      </View>
    </View>
  );
}
