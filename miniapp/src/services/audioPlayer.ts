/**
 * audioPlayer.ts — 整曲播放器（FullTrackPlayer）
 * 职责：封装 Taro InnerAudioContext，提供 play/pause/seek/onTimeUpdate/onEnded。
 * 故事=整曲纯听；歌曲=整曲+LRC；教学=整曲+timeline 二分定位（页面侧组合本服务 + utils/timeline）。
 * 后台播放：生产可切换为 getBackgroundAudioManager（app.config requiredBackgroundModes:['audio']）。
 */
import Taro from '@tarojs/taro';
import { usePlayerStore, PLAYBACK_RATES } from '@/stores/playerStore';
import { RateStore } from '@/services/storage';

type TimeCb = (currentSec: number, durationSec: number) => void;
type AudioContext = Taro.InnerAudioContext | Taro.BackgroundAudioManager;

export interface TrackMetadata {
  title: string;
  album?: string;
  artist?: string;
  coverUrl?: string;
}

class FullTrackPlayer {
  private ctx: AudioContext | null = null;
  private backgroundCtx: Taro.BackgroundAudioManager | null = null;
  private timeCbs = new Set<TimeCb>();
  private endedCbs = new Set<() => void>();
  /** App 级续播驱动回调：独立于页面订阅，`destroy()` 不清（登出/401 后仍持续生效，修 N-H1） */
  private endedDriver: (() => void) | null = null;
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;
  /** 睡眠定时到点回调（由 settingsStore 注册：复位播放态 + 清定时 store） */
  private sleepCb: (() => void) | null = null;
  /** 播放倍速（仅允许 PLAYBACK_RATES 五挡）；换曲后自动重新应用，启动时从持久化恢复 */
  private rate = usePlayerStore.getState().playbackRate;

  /** 曲终统一分发：页面临时订阅 + App 级续播驱动 */
  private emitEnded(): void {
    this.endedCbs.forEach((cb) => cb());
    this.endedDriver?.();
  }

  /** 加载并播放一个整曲 URL */
  load(src: string, autoplay = true, metadata: TrackMetadata = { title: '酷酷儿童故事' }): void {
    // 换曲只销毁音频上下文，页面/App 级订阅与睡眠定时继续保留。
    this.destroyContext();
    if (process.env.TARO_ENV === 'weapp') {
      const ctx = this.getBackgroundContext();
      ctx.title = metadata.title;
      ctx.epname = metadata.album ?? '酷酷儿童故事';
      ctx.singer = metadata.artist ?? '酷酷儿童故事';
      ctx.coverImgUrl = metadata.coverUrl ?? '';
      this.ctx = ctx;
      // BackgroundAudioManager 设置 src 后会自动播放。
      ctx.src = src;
      this.applyRate();
      if (!autoplay) ctx.pause();
      return;
    }
    const ctx = Taro.createInnerAudioContext();
    ctx.src = src;
    ctx.onTimeUpdate(() => this.timeCbs.forEach((cb) => cb(ctx.currentTime, ctx.duration)));
    ctx.onEnded(() => this.emitEnded());
    ctx.onError((e) => {
      console.warn('音频播放失败', e?.errMsg);
      usePlayerStore.getState().setPlaying(false); // 出错复位，避免迷你栏/播放页残留“播放中”
      Taro.showToast({ title: '音频播放失败，请稍后重试', icon: 'none' });
    });
    this.ctx = ctx;
    this.applyRate();
    if (autoplay) ctx.play();
  }

  /** 把当前倍速应用到活跃音频上下文（换曲/新建 ctx 后需重新设置；1.0 也显式设，覆盖残留值） */
  private applyRate(): void {
    try {
      if (this.ctx && 'playbackRate' in this.ctx) {
        (this.ctx as { playbackRate: number }).playbackRate = this.rate;
      }
    } catch {
      /* 低版本基础库不支持时静默降级原速 */
    }
  }

  /** 设置播放倍速（仅收 PLAYBACK_RATES 五挡，非法值忽略）：应用到当前音频 + 持久化 + 回写 store */
  setRate(rate: number): void {
    if (!(PLAYBACK_RATES as readonly number[]).includes(rate)) return;
    this.rate = rate;
    this.applyRate();
    RateStore.set(rate);
    usePlayerStore.getState().setPlaybackRate(rate);
  }

  /** 循环切到下一挡倍速（0.8→0.9→1.0→1.1→1.2→0.8），返回新挡位 */
  cycleRate(): number {
    const rates = PLAYBACK_RATES as readonly number[];
    const next = rates[(rates.indexOf(this.rate) + 1) % rates.length];
    this.setRate(next);
    return next;
  }

  /** 微信小程序后台播放器为全局单例，事件只绑定一次，避免换曲累积监听。 */
  private getBackgroundContext(): Taro.BackgroundAudioManager {
    if (this.backgroundCtx) return this.backgroundCtx;
    const ctx = Taro.getBackgroundAudioManager();
    ctx.onTimeUpdate(() => this.timeCbs.forEach((cb) => cb(ctx.currentTime, ctx.duration)));
    ctx.onEnded(() => this.emitEnded());
    ctx.onError(() => {
      usePlayerStore.getState().setPlaying(false);
      Taro.showToast({ title: '音频播放失败，请稍后重试', icon: 'none' });
    });
    this.backgroundCtx = ctx;
    return ctx;
  }

  play(): void {
    this.ctx?.play();
  }

  pause(): void {
    this.ctx?.pause();
  }

  /** 跳转到秒 */
  seek(sec: number): void {
    this.ctx?.seek(sec);
  }

  onTimeUpdate(cb: TimeCb): () => void {
    this.timeCbs.add(cb);
    return () => this.timeCbs.delete(cb);
  }

  onEnded(cb: () => void): () => void {
    this.endedCbs.add(cb);
    return () => this.endedCbs.delete(cb);
  }

  /** 注册 App 级续播驱动（全局唯一，`destroy()` 不清除）。 */
  setEndedDriver(cb: () => void): void {
    this.endedDriver = cb;
  }

  /** 注册睡眠到点回调（到点 pause 后触发，用于清理 store/UI）。 */
  setSleepHandler(cb: () => void): void {
    this.sleepCb = cb;
  }

  /** 设置睡眠定时截止时间；null 表示关闭。 */
  setSleepDeadline(deadline: number | null): void {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    if (!deadline) return;
    const delay = deadline - Date.now();
    if (delay <= 0) {
      this.pause();
      this.sleepCb?.();
      return;
    }
    this.sleepTimer = setTimeout(() => {
      this.pause();
      this.sleepTimer = null;
      this.sleepCb?.();
    }, delay);
  }

  /** 只销毁当前音频实例，不影响订阅或睡眠定时。 */
  destroyContext(): void {
    if (this.ctx) {
      try {
        if ('destroy' in this.ctx) this.ctx.destroy();
        else this.ctx.stop();
      } catch {
        /* ignore */
      }
    }
    this.ctx = null;
  }

  /** 彻底销毁播放器；仅用于退出账号/应用级清理。 */
  destroy(): void {
    this.destroyContext();
    this.timeCbs.clear();
    this.endedCbs.clear();
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    this.backgroundCtx = null;
  }
}

/** 全局单例播放器（跨页面共享，配合迷你播放栏） */
export const player = new FullTrackPlayer();
