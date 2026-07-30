/**
 * pages/story/player — PL-01 故事播放器（竖屏纯听 + 封面）
 * 加载 segments.json → 播放整曲 full.mp3；按 currentTime 定位当前段展示字幕；
 * 播放控制：播放/暂停 + 进度拖动；上报播放历史（POST /history）。
 * ★ 故事集自动续播：播完触发 playerStore.nextInQueue → 自动加载下一篇（GL-02 迷你栏同步）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, Slider, Button } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import { indexLoader } from '@/services/indexLoader';
import { player } from '@/services/audioPlayer';
import { playStory, skip } from '@/services/playbackQueue';
import { api } from '@/services/api';
import { buildAssetUrl, buildCoverUrl, guessCoverFromPath } from '@/utils/path';
import { shareCard } from '@/utils/share';
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
  // 收藏状态回显：已收藏时心形变红+文案变“已收藏”，再点取消（weapp 实测反馈：原来点了没反应分不清收没收）
  const [favId, setFavId] = useState<string | null>(null);
  // 加载失败驻留态：toast 转瞬即逝，字幕位需持久提示失败而非永远“加载中”（边界实测：不存在的故事停留加载中）
  // ★它仅代表“分段索引没拿到”；部分故事无 segments 但 full.mp3 能正常播，此时不得报失败
  //   → onTimeUpdate 一旦拿到有效时长就自动撤销提示（混沌测试实测：进度在走却显“加载失败”的误报根因）
  const [loadFailed, setLoadFailed] = useState(false);
  const loadFailedRef = useRef(false);
  const markFailed = (v: boolean) => { loadFailedRef.current = v; setLoadFailed(v); };
  const reportLoadError = (error: unknown) => {
    console.warn('加载故事音频失败', error);
    markFailed(true);
    Taro.showToast({ title: '故事加载失败，请稍后重试', icon: 'none' });
  };
  const displayedRef = useRef<string>('');

  /**
   * ★队列太短时扩展为故事所在目录整列表（用户定：从推荐/今日推荐点进来只有几篇可续播太少）：
   * 拉父目录 _index.json entries 整体设队列并定位到当前篇；拉不到/条目过少则保持原队列。
   */
  const expandQueueFromDir = async (path: string) => {
    try {
      const parent = path.split('/').slice(0, -1).join('/');
      if (!parent) return;
      const idx = await indexLoader.loadIndexByPath(parent) as { entries?: { title?: string; path?: string; cover?: { cover_image_url?: string } }[] };
      const entries = (idx.entries ?? []).filter((e) => e.path);
      const store = usePlayerStore.getState();
      if (entries.length <= store.queue.length) return; // 目录不比现队列长则不换
      const at = entries.findIndex((e) => e.path === path);
      if (at === -1) return;
      store.setQueue(entries.map((e) => ({
        type: 'story' as const,
        id: e.path as string,
        title: e.title || (e.path as string).split('/').pop() || '故事',
        coverUrl: buildCoverUrl(e.cover?.cover_image_url) || guessCoverFromPath(e.path) || undefined,
      })), at);
    } catch (error) { console.warn('扩展目录队列失败（保持原队列）', error); }
  };

  /** 加载并（可选）播放一篇故事：播放统一走全局 playStory（含全局状态+历史），非播放只拉 segments 展示 */
  const loadStory = async (path: string, storyTitle: string, autoplay: boolean) => {
    displayedRef.current = path; // 先标记，避免下方 current 变化触发反向展示 effect 重复加载
    markFailed(false);
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
      // ★音频已拿到有效时长→确实能播，清除分段索引失败导致的驻留误报
      if (total > 0 && loadFailedRef.current) markFailed(false);
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
      indexLoader.loadSegments(store.current.id).then((d) => { setData(d); markFailed(false); }).catch(reportLoadError);
    } else {
      // 直接进入（非从故事列表/章回）：若当前队列首项不是本故事，重置为单篇（带按 path 推导的封面兜底），避免残留歌单被误当“下一首”
      const q = store.queue[store.queueIndex];
      if (!(q && q.type === 'story' && q.id === initPath)) {
        store.setQueue([{ type: 'story', id: initPath, title: initTitle, coverUrl: guessCoverFromPath(initPath) || undefined }], 0);
      }
      loadStory(initPath, initTitle, true).catch(reportLoadError);
      // ★队列短（单篇/推荐小窗口）时后台扩展为所在目录整列表，续播更多
      if (usePlayerStore.getState().queue.length <= 4) void expandQueueFromDir(initPath);
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
    indexLoader.loadSegments(currentId).then((d) => { setData(d); markFailed(false); }).catch(reportLoadError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const toggle = () => {
    if (playing) { player.pause(); setPlaying(false); usePlayerStore.getState().setPlaying(false); }
    else { player.play(); setPlaying(true); usePlayerStore.getState().setPlaying(true); }
  };

  // 故事不显字幕（用户定：字幕只给教学——教学有真实 timeline，故事无 timeline 估算轴不准不硬显）
  const hasQueue = usePlayerStore((s) => s.queue.length > 1);
  const queuePos = usePlayerStore((s) => (s.queue.length > 1 ? `第 ${s.queueIndex + 1} / ${s.queue.length} 篇` : ''));
  const playbackRate = usePlayerStore((s) => s.playbackRate); // 固定五挡 0.8~1.2，点击循环切换
  // 封面回退链：segments.cover_url(多为空) → 全局播放态 coverUrl(列表/首页入队时带真封面) → 兜底色块
  const curCoverUrl = usePlayerStore((s) => s.current?.coverUrl);
  const coverSrc = data?.cover_url || curCoverUrl || '';
  const fmt = (s: number) => { const m = Math.floor(s / 60); const ss = Math.floor(s % 60); return `${m}:${ss < 10 ? '0' : ''}${ss}`; };
  const playNext = () => { skip(1); };
  /** 当前曲目的收藏 id（切曲/登录态变化时重查）；未登录不查 */
  const currentContentId = usePlayerStore((s) => s.current?.id) || initPath;
  useEffect(() => {
    if (!useUserStore.getState().isLogin) { setFavId(null); return; }
    let alive = true;
    api.get<{ list: { favorite_id: string; content_id: string }[] }>('/favorites')
      .then((r) => { if (!alive) return; const hit = (r.list ?? []).find((f) => f.content_id === currentContentId); setFavId(hit ? hit.favorite_id : null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [currentContentId]);
  const favorite = async () => {
    if (!useUserStore.getState().isLogin) {
      await Taro.navigateTo({ url: '/pages/common/login/index' });
      return;
    }
    try {
      if (favId) {
        // 已收藏 → 再点取消
        await api.del(`/favorites/${favId}`);
        setFavId(null);
        Taro.showToast({ title: '已取消收藏', icon: 'none' });
        return;
      }
      await api.post('/favorites', {
        content_type: 'story',
        content_id: currentContentId,
        content_title: title,
      });
      // 回查拿 favorite_id，支持立即再点取消
      const r = await api.get<{ list: { favorite_id: string; content_id: string }[] }>('/favorites');
      const hit = (r.list ?? []).find((f) => f.content_id === currentContentId);
      setFavId(hit ? hit.favorite_id : 'pending');
      Taro.showToast({ title: '已收藏', icon: 'success' });
    } catch (error) {
      console.warn('收藏操作失败', error);
      Taro.showToast({ title: '操作失败，请稍后再试', icon: 'none' });
    }
  };
  const share = () => {
    Taro.showShareMenu({ withShareTicket: true });
  };
  // 分享当前故事：好友点开直达本篇（拉新 + 内容直达）；卡面用真插画
  useShareAppMessage(() => ({
    title: `《${title}》— 酷酷儿童故事`,
    path: `/pages/story/player/index?path=${encodeURIComponent(currentContentId)}&title=${encodeURIComponent(title)}`,
    imageUrl: shareCard('E04_哈哈大笑'),
  }));

  /** ★列表键：选单—连播收藏 / 回首页（用户定：播放器要能直接播收藏列表） */
  const openListMenu = () => {
    Taro.showActionSheet({ itemList: ['▶ 连播我收藏的故事', '回到故事首页'] }).then(async (r) => {
      if (r.tapIndex === 1) { Taro.navigateBack().catch(() => Taro.switchTab({ url: '/pages/story/index/index' })); return; }
      if (!useUserStore.getState().isLogin) { Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
      try {
        const d = await api.get<{ list: { favorite_id: string; content_type: string; content_id: string; title: string | null }[] }>('/favorites');
        const storyFavs = (d.list ?? []).filter((f) => f.content_type === 'story' && f.content_id);
        if (storyFavs.length === 0) { Taro.showToast({ title: '还没收藏故事，点❤收藏吧', icon: 'none' }); return; }
        usePlayerStore.getState().setQueue(storyFavs.map((f) => ({ type: 'story' as const, id: f.content_id, title: f.title || f.content_id, coverUrl: guessCoverFromPath(f.content_id) || undefined })), 0);
        displayedRef.current = '';
        await playStory(storyFavs[0].content_id, storyFavs[0].title || storyFavs[0].content_id);
      } catch (error) { console.warn('连播收藏失败', error); Taro.showToast({ title: '加载收藏失败，稍后再试', icon: 'none' }); }
    }).catch(() => {});
  };

  return (
    <View className={`player-lamp ${night}`}>
      {/* 封面氛围模糊铺底 */}
      <View className="pbg">
        {coverSrc ? <Image className="cover" webp src={buildAssetUrl(coverSrc)} mode="aspectFill" ariaLabel={`${title}背景封面`} /> : null}
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

        {/* 封面主视觉：大幅圆角卡（用户定：把故事封面放出来） */}
        <View className="lampcov">
          {coverSrc
            ? <Image className="cover" webp src={buildAssetUrl(coverSrc)} mode="aspectFill" ariaLabel={`${title}封面`} />
            : <View className="cover" style={{ background: 'radial-gradient(circle at 40% 35%,#FFD9A0,#F2751F)' }} />}
        </View>

        <Text className="ptitle serif">{title}</Text>

        <Slider className="lamp-slider" min={0} max={Math.max(dur, 1)} value={cur} activeColor="#FFC98F" backgroundColor="rgba(255,255,255,0.25)" blockColor="#FFF3DC"
          onChange={(e) => { player.seek(e.detail.value); setCur(e.detail.value); }} />
        <View className="ptime"><Text>{fmt(cur)}</Text><Text>{fmt(dur)}</Text></View>

        <View className="pctrls">
          <View className="pbtn" onClick={() => { player.seek(0); setCur(0); }}><Icon name="prev" size={40} color="#fff" /></View>
          <View className="pbtn main" onClick={toggle}><Icon name={playing ? 'pause' : 'play'} size={56} color="#fff" /></View>
          <View className="pbtn" onClick={playNext}><Icon name="next" size={40} color="#fff" /></View>
        </View>

        <View className="pfns">
          <View className="fn" onClick={() => void favorite()}><Icon name="heart" size={40} color={favId ? '#FF7B93' : '#fff'} /><Text>{favId ? '已收藏' : '收藏'}</Text></View>
          <Button className="fn share-fn" openType="share" onClick={share}><Icon name="share" size={40} color="#fff" /><Text>分享</Text></Button>
          <View className="fn" onClick={() => player.cycleRate()}><Text style={{ fontSize: '32px', fontWeight: 800, lineHeight: '40px', height: '40px' }}>{playbackRate.toFixed(1)}x</Text><Text>倍速</Text></View>
          <View className="fn" onClick={() => Taro.navigateTo({ url: '/pages/common/settings/index' })}><Icon name="timer" size={40} color="#fff" /><Text>定时</Text></View>
          <View className="fn" onClick={openListMenu}><Icon name="list" size={40} color="#fff" /><Text>列表</Text></View>
        </View>

        {/* 底部信息区：故事不显字幕(无 timeline 不准)，改显队列进度/加载失败提示；无内容时不占位 */}
        {(loadFailed || hasQueue) && (
          <View className="psub-panel slim">
            <Text className="psub-lg">{loadFailed ? '故事加载失败了，返回重试或换一个听听吧' : `${queuePos} · 播完自动续播下一篇`}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
