/**
 * lrc.ts — LRC 歌词解析（对齐 md/07 脚本3 输出格式）
 * 解析 [mm:ss.xx]文本 行 → 有序 { time(秒), text } 数组；忽略 [ti:]/[ar:] 等元信息。
 * 无 LRC 时前端降级为纯文本歌词（md/06 §3.3）。
 */
export interface LrcLine {
  time: number; // 秒
  text: string;
}

const TIME_TAG = /\[(\d{1,2}):(\d{1,2}(?:\.\d{1,3})?)\]/g;

/** 解析 LRC 文本为有序歌词行 */
export function parseLrc(raw: string): LrcLine[] {
  const lines: LrcLine[] = [];
  for (const rawLine of raw.split(/\r?\n/)) {
    TIME_TAG.lastIndex = 0;
    const text = rawLine.replace(TIME_TAG, '').trim();
    let m: RegExpExecArray | null;
    TIME_TAG.lastIndex = 0;
    while ((m = TIME_TAG.exec(rawLine)) !== null) {
      const min = parseInt(m[1], 10);
      const sec = parseFloat(m[2]);
      if (text) lines.push({ time: min * 60 + sec, text });
    }
  }
  return lines.sort((a, b) => a.time - b.time);
}

/**
 * 按当前播放时间定位高亮行索引（二分查找）
 * @param lines 已排序歌词
 * @param currentSec 当前播放秒
 * @returns 当前应高亮的行索引（-1 表示还未到第一行）
 */
export function findLrcIndex(lines: LrcLine[], currentSec: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].time <= currentSec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}
