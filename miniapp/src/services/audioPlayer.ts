/**
 * audioPlayer.ts — 整曲播放器（FullTrackPlayer）
 * 职责：封装 Taro InnerAudioContext，提供 play/pause/seek/onTimeUpdate/onEnded。
 * 故事=整曲纯听；歌曲=整曲+LRC；教学=整曲+timeline 二分定位（页面侧组合本服务 + utils/timeline）。
 * 后台播放：生产可切换为 getBackgroundAudioManager（app.config requiredBackgroundModes:['audio']）。
 */
import Taro from '@tarojs/taro';

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
  private sleepTimer: ReturnType<typeof setTimeout> | null = null;

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
      if (!autoplay) ctx.pause();
      return;
    }
    const ctx = Taro.createInnerAudioContext();
    ctx.src = src;
    ctx.onTimeUpdate(() => this.timeCbs.forEach((cb) => cb(ctx.currentTime, ctx.duration)));
    ctx.onEnded(() => this.endedCbs.forEach((cb) => cb()));
    ctx.onError((e) => Taro.showToast({ title: `播放失败: ${e.errMsg ?? ''}`, icon: 'none' }));
    this.ctx = ctx;
    if (autoplay) ctx.play();
  }

  /** 微信小程序后台播放器为全局单例，事件只绑定一次，避免换曲累积监听。 */
  private getBackgroundContext(): Taro.BackgroundAudioManager {
    if (this.backgroundCtx) return this.backgroundCtx;
    const ctx = Taro.getBackgroundAudioManager();
    ctx.onTimeUpdate(() => this.timeCbs.forEach((cb) => cb(ctx.currentTime, ctx.duration)));
    ctx.onEnded(() => this.endedCbs.forEach((cb) => cb()));
    ctx.onError(() => Taro.showToast({ title: '后台播放失败', icon: 'none' }));
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

  /** 设置睡眠定时截止时间；null 表示关闭。 */
  setSleepDeadline(deadline: number | null): void {
    if (this.sleepTimer) clearTimeout(this.sleepTimer);
    this.sleepTimer = null;
    if (!deadline) return;
    const delay = deadline - Date.now();
    if (delay <= 0) {
      this.pause();
      return;
    }
    this.sleepTimer = setTimeout(() => {
      this.pause();
      this.sleepTimer = null;
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
