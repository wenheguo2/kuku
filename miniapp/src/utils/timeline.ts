/**
 * timeline.ts — 教学 timeline.json 二分查找定位（对齐 md/07 脚本2 / md/02 §9.1）
 * timeline 为 8 字段结构，播放器按 currentTime 二分定位当前段，驱动立绘/字幕/字词切换。
 */
export interface TimelineSeg {
  seq: number;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  segment_id: string;
  character?: string;
  text?: string;
  voice_id?: string;
  characters?: { name: string; pose: string; emotion: string }[];
}

/**
 * 按当前播放毫秒二分定位当前段索引
 * @param timeline 已按 start_ms 升序
 * @param currentMs 当前播放毫秒
 * @returns 当前段索引（-1 表示还未开始）
 */
export function locateSegment(timeline: TimelineSeg[], currentMs: number): number {
  let lo = 0;
  let hi = timeline.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timeline[mid].start_ms <= currentMs) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
