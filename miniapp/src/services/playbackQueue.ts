/**
 * playbackQueue.ts — 故事集/歌单续播的全局驱动（App 级注册一次）
 * ★ 修复 M-4：续播编排提到 App 级，与播放页存活无关：曲终 → queueAdvance（按播放模式）→ 播放。
 * 泛化：按队列项 type 分派——story 走 segments+full.mp3；song 走真实 audioUrl。
 * 播放页只做展示订阅（随 playerStore.current 刷新 UI）。
 */
import { indexLoader } from '@/services/indexLoader';
import { player } from '@/services/audioPlayer';
import { api } from '@/services/api';
import { buildAssetUrl } from '@/utils/path';
import { CONFIG } from '@/services/config';
import { SegmentsData } from '@/types/content';
import { QueueItem, usePlayerStore } from '@/stores/playerStore';
import { useUserStore } from '@/stores/userStore';
import { tracker } from '@/services/tracker';

// 历史/埋点去重（同一孩子+内容本会话只上报一次；服务端 history 亦 UPSERT 幂等兑底）
const reported = new Set<string>();

// 播放请求令牌：async playStory 加载期间被更新的请求抢占时，用于丢弃过期结果（修 FE-H01 切曲竞态）
let playToken = 0;

/** 登出/切换孩子时清空去重集（防多孩漏记 + 避免 Set 无限增长）。 */
export function clearPlaybackReports(): void {
  reported.clear();
}

function reportOnce(type: 'story' | 'song', id: string, title: string): void {
  const { selectedChildId } = useUserStore.getState();
  // ★ 去重键含 childId：不同孩子分别计入各自历史/成长（修 M6 多孩漏记）
  const key = `${selectedChildId}:${type}:${id}`;
  if (!selectedChildId || reported.has(key)) return;
  reported.add(key);
  api.post('/history', {
    child_id: selectedChildId,
    content_type: type,
    content_id: id,
    content_title: title,
  }).catch((error) => console.warn('上报播放历史失败', error));
  void tracker.track(type === 'song' ? 'song_play' : 'story_play', { content_id: id, title }, selectedChildId);
}

/**
 * 加载并播放一篇故事（初次/续播/手动切换统一入口）；不依赖任何页面存活。
 * 返回 segments 供播放页展示复用（indexLoader 有缓存，重复调用开销低）。
 */
export async function playStory(path: string, title: string): Promise<SegmentsData> {
  const myToken = ++playToken;
  const seg = await indexLoader.loadSegments(path);
  // 竞态防护：加载期间若有更新的播放请求，丢弃本次结果，避免旧故事覆盖新内容
  if (myToken !== playToken) return seg;
  const store = usePlayerStore.getState();
  // 封面回退：segments.cover_url 多为空，回退到队列项 coverUrl（首页/列表/章回入队时携真封面）
  const qCover = store.queue.find((it) => it.type === 'story' && it.id === path)?.coverUrl;
  const coverUrl = seg.cover_url || qCover;
  store.setCurrent({ type: 'story', id: path, title, coverUrl });
  store.setTime(0, 0);
  if (!CONFIG.USE_MOCK) {
    const audio = seg.full_audio_url
      ? buildAssetUrl(seg.full_audio_url)
      : `${CONFIG.staticBaseUrl}/audio/${path.split('/').map(encodeURIComponent).join('/')}/full.mp3`;
    player.load(audio, true, {
      title,
      album: '酷酷儿童故事',
      coverUrl: coverUrl ? buildAssetUrl(coverUrl) : undefined,
    });
    store.setPlaying(true);
  }
  reportOnce('story', path, title);
  return seg;
}

/** 加载并播放一首歌曲；不依赖任何页面存活。真实 audioUrl 缺失（mock）时只更新状态不出声。 */
export function playSong(item: QueueItem): void {
  playToken += 1; // 抢占：使在途的 playStory 结果失效
  const store = usePlayerStore.getState();
  store.setCurrent({ type: 'song', id: item.id, title: item.title, coverUrl: item.coverUrl });
  store.setTime(0, 0);
  if (!CONFIG.USE_MOCK && item.audioUrl) {
    player.load(item.audioUrl, true, { title: item.title, album: '酷酷音乐厅', coverUrl: item.coverUrl });
    store.setPlaying(true);
  }
  reportOnce('song', item.id, item.title);
}

/** 分派播放一个队列项（story/song）。 */
export function playItem(item: QueueItem): void {
  if (item.type === 'song') {
    playSong(item);
  } else {
    void playStory(item.id, item.title).catch((error) => console.warn('加载故事失败', error));
  }
}

/** 曲终自动续播（按播放模式）；无下一项则置暂停（消除 isPlaying 残留）。 */
export function advanceQueue(): void {
  const next = usePlayerStore.getState().queueAdvance();
  if (next) playItem(next);
  else usePlayerStore.getState().setPlaying(false);
}

/** 手动上一首/下一首（供播放页按钮调用）。返回被切到的项（无队列时 null）。 */
export function skip(dir: 1 | -1): QueueItem | null {
  const next = usePlayerStore.getState().queueSkip(dir);
  if (next) playItem(next);
  return next;
}

let inited = false;
/** App 级注册一次：曲终驱动自动续播。用独立驱动槽（destroy 不清），登出/401 后仍生效（修 N-H1）。 */
export function initPlaybackQueue(): void {
  if (inited) return;
  inited = true;
  player.setEndedDriver(() => advanceQueue());
}
