/**
 * lrc.ts — 歌词解析（对齐 md/07 脚本3 输出格式）
 * 双方案：有 [mm:ss] 时间标签→逐句高亮(lrc)；无时间标签的纯文本→整首展示(plain)；空/拉不到→none。
 * 统一入口 parseLyrics()，内容侧给 .lrc 或纯文本歌词文件均可自适应（md/06 §3.3）。
 */
export interface LrcLine {
  time: number; // 秒
  text: string;
}

/** 歌词文档：lrc=带时间轴逐句；plain=纯文本整首；none=无歌词 */
export type LyricsDoc =
  | { mode: 'lrc'; lines: LrcLine[] }
  | { mode: 'plain'; lines: string[] }
  | { mode: 'none' };

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

const META_LINE = /^\[(ti|ar|al|by|offset|re|ve)\b[^\]]*\]\s*$/i;
// 真实歌曲 txt 的非歌词行：首行元信息（如「世界名人|中文|人物|丁肇中」）、段落标记（[Intro]/[Verse]…）、括号提示行（（前奏歌词））
const SONG_META_LINE = /\|/;
const SECTION_TAG_LINE = /^\[[^\]]+\]\s*$/;
const HINT_LINE = /^[（(][^）)]*[）)]\s*$/;

/**
 * 双方案统一入口：有时间标签→逐句(lrc)；无时间标签但有文本→整首(plain)；否则 none
 * @param raw 歌词原始文本（.lrc 或纯文本，可空）
 */
export function parseLyrics(raw?: string | null): LyricsDoc {
  if (!raw || !raw.trim()) return { mode: 'none' };
  const lrcLines = parseLrc(raw);
  if (lrcLines.length > 0) return { mode: 'lrc', lines: lrcLines };
  const plain = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !META_LINE.test(line) && !SONG_META_LINE.test(line) && !SECTION_TAG_LINE.test(line) && !HINT_LINE.test(line));
  return plain.length > 0 ? { mode: 'plain', lines: plain } : { mode: 'none' };
}
