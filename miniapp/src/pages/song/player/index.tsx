/**
 * pages/song/player — PL-02 歌曲播放器（歌词双方案 + 队列续播/播放模式）
 * ★歌词双方案：歌词文件含 [mm:ss] 时间标签→逐句高亮；无时间标签的纯文本→整首静态展示；
 *   拉不到/无 lrcUrl→暂无歌词（utils/lrc.parseLyrics 自适应，内容侧给 .lrc 或纯文本均可）。
 * ★ 接入 playerStore 歌单队列：上一首/下一首（skip）+ 播放模式（顺序/单曲循环/列表循环）；
 *   续播由 App 级 playbackQueue 全局驱动，页面只做展示订阅。mock 模式用模拟时钟演示高亮。
 */
import { useEffect, useRef, useState } from 'react';
import { View, Text, Slider, ScrollView, Image, Button } from '@tarojs/components';
import Taro, { useRouter, useShareAppMessage } from '@tarojs/taro';
import { player } from '@/services/audioPlayer';
import { playSong, skip } from '@/services/playbackQueue';
import { guardSongPlay } from '@/services/membershipGate';
import { CONFIG } from '@/services/config';
import { api } from '@/services/api';
import { useUserStore } from '@/stores/userStore';
import { findLrcIndex, LrcLine, LyricsDoc, parseLyrics } from '@/utils/lrc';
import { buildAssetUrl } from '@/utils/path';
import { shareCard } from '@/utils/share';
import { mockSong } from '@/services/mock';
import Icon from '@/components/Icon';
import { useNight } from '@/hooks/useNight';
import { usePlayerStore, PlayMode } from '@/stores/playerStore';
import iconPlaying from '@/assets/icon_playing.png';
import iconPlayReady from '@/assets/icon_play_ready.png';

const MODE_LABEL: Record<PlayMode, string> = { order: '顺序播放', 'repeat-all': '列表循环', 'repeat-one': '单曲循环' };

export default function SongPlayer() {
  const router = useRouter();
  const night = useNight();
  const initId = router.params.id ? decodeURIComponent(router.params.id) : '';
  const initTitle = decodeURIComponent(router.params.title || '儿歌');
  const [doc, setDoc] = useState<LyricsDoc>({ mode: 'none' });
  const [active, setActive] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const t = useRef(0);
  const linesRef = useRef<LrcLine[]>([]);
  const lyricsSeq = useRef(0); // 切歌防竞态：只采纳最后一次歌词请求结果

  // 展示订阅：标题/播放模式随全局状态刷新（续播由全局驱动切歌时页面同步）
  const currentTitle = usePlayerStore((s) => (s.current?.type === 'song' ? s.current.title : ''));
  const currentId = usePlayerStore((s) => (s.current?.type === 'song' ? s.current.id : ''));
  const currentCover = usePlayerStore((s) => (s.current?.type === 'song' ? s.current.coverUrl : '')); // 队列项真封面
  const playMode = usePlayerStore((s) => s.playMode);
  const playbackRate = usePlayerStore((s) => s.playbackRate); // 固定五挡 0.8~1.2，点击循环切换
  const title = currentTitle || initTitle;
  // ★收藏回显（与故事灯同套：已收藏红心+“已收藏”，再点取消）；收藏列表故事/歌曲分开，content_type='song'
  const [favId, setFavId] = useState<string | null>(null);
  const favContentId = currentId || initId;
  useEffect(() => {
    if (!useUserStore.getState().isLogin || !favContentId) { setFavId(null); return; }
    let alive = true;
    api.get<{ list: { favorite_id: string; content_type: string; content_id: string }[] }>('/favorites')
      .then((r) => { if (!alive) return; const hit = (r.list ?? []).find((f) => f.content_type === 'song' && f.content_id === favContentId); setFavId(hit ? hit.favorite_id : null); })
      .catch(() => {});
    return () => { alive = false; };
  }, [favContentId]);
  const favorite = async () => {
    if (!useUserStore.getState().isLogin) { await Taro.navigateTo({ url: '/pages/common/login/index' }); return; }
    try {
      if (favId) {
        await api.del(`/favorites/${favId}`);
        setFavId(null);
        Taro.showToast({ title: '已取消收藏', icon: 'none' });
        return;
      }
      await api.post('/favorites', { content_type: 'song', content_id: favContentId, content_title: title });
      const r = await api.get<{ list: { favorite_id: string; content_type: string; content_id: string }[] }>('/favorites');
      const hit = (r.list ?? []).find((f) => f.content_type === 'song' && f.content_id === favContentId);
      setFavId(hit ? hit.favorite_id : 'pending');
      Taro.showToast({ title: '已收藏', icon: 'success' });
    } catch (error) {
      console.warn('歌曲收藏操作失败', error);
      Taro.showToast({ title: '操作失败，请稍后再试', icon: 'none' });
    }
  };
  // 分享当前歌曲：好友点开直达本曲；★带 inviter=当前用户供拉新奖励
  useShareAppMessage(() => {
    const uid = useUserStore.getState().userId;
    const inv = uid ? `&inviter=${encodeURIComponent(uid)}` : '';
    return {
      title: `《${title}》— 酷酷音乐厅`,
      path: `/pages/song/player/index?id=${encodeURIComponent(favContentId)}&title=${encodeURIComponent(title)}${inv}`,
      imageUrl: shareCard('E05_学科启蒙'),
    };
  });

  const applyLyrics = (d: LyricsDoc) => {
    setDoc(d);
    linesRef.current = d.mode === 'lrc' ? d.lines : [];
  };

  /** 双方案歌词加载：mock 用内置 LRC；真实态拉队列项 lrcUrl（.lrc/纯文本自适应），无/失败→暂无歌词 */
  const loadLyrics = async (songId: string) => {
    const seq = ++lyricsSeq.current;
    if (CONFIG.USE_MOCK) {
      applyLyrics(parseLyrics(mockSong.lrc));
      return;
    }
    const store = usePlayerStore.getState();
    const item = store.queue.find((q) => q.type === 'song' && q.id === songId);
    if (!item?.lrcUrl) {
      applyLyrics({ mode: 'none' });
      return;
    }
    try {
      const res = await Taro.request({ url: buildAssetUrl(item.lrcUrl), method: 'GET', timeout: 10_000, dataType: 'text', responseType: 'text' });
      if (seq !== lyricsSeq.current) return; // 已切歌，丢弃过期结果
      const ok = res.statusCode >= 200 && res.statusCode < 300 && typeof res.data === 'string';
      applyLyrics(ok ? parseLyrics(res.data as string) : { mode: 'none' });
    } catch (error) {
      console.warn('歌词加载失败', error);
      if (seq === lyricsSeq.current) applyLyrics({ mode: 'none' });
    }
  };

  useEffect(() => {
    const offTime = player.onTimeUpdate((c, d) => {
      setCur(c);
      setDur(d || 0);
      setActive(findLrcIndex(linesRef.current, c));
    });
    // 起播：优先用队列当前歌曲项（song/list/收藏/免费专区 已 setQueue）；否则重置为单曲，避免残留故事队列被误当“下一首”
    const store = usePlayerStore.getState();
    const item = store.queue[store.queueIndex];
    // ★先过会员门控（池外歌曲对已登录且非畅听用户拦截），放行后再起播
    void (async () => {
      const gateId = (item && item.type === 'song' && (!initId || item.id === initId)) ? item.id : (initId || initTitle);
      const ok = await guardSongPlay(gateId, store.queueLocked);
      if (!ok) return; // 已弹窗+返回，不起播
      if (item && item.type === 'song' && (!initId || item.id === initId)) {
        playSong(item);
      } else {
        const single = { type: 'song' as const, id: initId || initTitle, title: initTitle };
        store.setQueue([single], 0);
        playSong(single);
      }
      if (!CONFIG.USE_MOCK) setPlaying(true);
    })();
    return () => { offTime(); if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 切歌（手动 skip 或全局续播）时重置进度/模拟时钟，并按当前歌曲重新加载歌词（首次挂载也走这里）
  useEffect(() => {
    setActive(-1); setCur(0); t.current = 0;
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setPlaying(!CONFIG.USE_MOCK);
    void loadLyrics(currentId || initId);
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
    <View className={`page-v4 ${night}`} style={{ textAlign: 'center', position: 'relative' }}>
      {/* ★v5 右上角工具（收藏+分享） */}
      <View className="stools">
        <View className="stool" onClick={() => void favorite()}><Icon name="heart" size={24} color={favId ? '#FF7B93' : '#8B8D9E'} /></View>
        <Button className="share-stool" openType="share"><Icon name="share" size={24} color="#8B8D9E" /></Button>
      </View>
      {/* 真封面（队列项 coverUrl，切歌跟随）；无封面回退青绿渐变 */}
      <View className="scov">
        {currentCover
          ? <Image className="cover" src={buildAssetUrl(currentCover)} mode="aspectFill" ariaLabel={`${title}封面`} />
          : <View className="cover" style={{ background: 'linear-gradient(135deg,#5AD6CD,#3FC5BC)' }} />}
      </View>
      <Text className="serif" style={{ fontSize: '38px', fontWeight: 800, marginTop: '28px', display: 'block', color: 'var(--color-text)' }}>{title}</Text>
      <Text style={{ fontSize: '22px', color: 'var(--color-text-secondary)', marginTop: '8px', display: 'block' }}>酷酷音乐厅</Text>
      <View className="lyr">
        {doc.mode === 'none' && <Text>暂无歌词</Text>}
        {doc.mode === 'lrc' && doc.lines.map((l, i) => (i === active
          ? <Text key={i} className="on">{l.text}</Text>
          : <Text key={i} style={{ display: 'block' }}>{l.text}</Text>))}
        {doc.mode === 'plain' && (
          <ScrollView scrollY className="lyr-full">
            {doc.lines.map((l, i) => <Text key={i} style={{ display: 'block' }}>{l}</Text>)}
          </ScrollView>
        )}
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
        <View className="cbtn" onClick={() => skip(-1)}><Icon name="prev" size={40} color={night ? '#E8ECF8' : '#2D3142'} /></View>
        <Image className="cbtn-book" src={playing ? iconPlaying : iconPlayReady} mode="aspectFit" onClick={toggle} />
        <View className="cbtn" onClick={() => skip(1)}><Icon name="next" size={40} color={night ? '#E8ECF8' : '#2D3142'} /></View>
      </View>
      {/* ★v5 模式+倍速胶囊（替换原 emoji chips） */}
      <View className="splls">
        <View className="spll" onClick={() => usePlayerStore.getState().cyclePlayMode()}>{MODE_LABEL[playMode]}</View>
        <View className="spll" onClick={() => player.cycleRate()}>倍速 {playbackRate.toFixed(1)}×</View>
      </View>
      {CONFIG.USE_MOCK && <Text style={{ fontSize: '20px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '16px' }}>示例：点播放演示歌词逐行高亮</Text>}
    </View>
  );
}
