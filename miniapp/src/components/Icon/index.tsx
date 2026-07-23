/**
 * Icon — 跨端 SVG 图标组件（v4 全 SVG 图标）
 * WeChat 小程序不支持内联 <svg><use>，故用 SVG→dataURI 渲染到 <Image>（weapp/H5 通用）。
 * 颜色烘焙进 SVG 字符串（data URI 内无 CSS 上下文，currentColor 不可用）。
 * 用法：<Icon name="play" size={40} color="#fff" />
 */
import { Image } from '@tarojs/components';

export type IconName =
  | 'book' | 'music' | 'sprout' | 'family' | 'search'
  | 'play' | 'pause' | 'prev' | 'next'
  | 'heart' | 'share' | 'timer' | 'list' | 'back' | 'down' | 'dots'
  | 'moon' | 'star' | 'check' | 'crown' | 'gear' | 'clock' | 'refresh' | 'vol';

// 填充型图标（fill=currentColor）；其余为描边型（stroke）
const FILLED = new Set<IconName>(['play', 'pause', 'prev', 'next', 'dots']);

const PATHS: Record<IconName, string> = {
  book: '<path d="M4 5a2 2 0 0 1 2-2h7v16H6a2 2 0 0 0-2 2z"/><path d="M20 5a2 2 0 0 0-2-2h-3v16h3a2 2 0 0 1 2 2z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  sprout: '<path d="M12 22c0-6 0-8-4-10a4 4 0 0 1 8 0c0 1-.5 2-1 2 4 1 4 5 4 8z"/>',
  family: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5M15 20c0-2 1-3.5 3-3.5s3 1.5 3 3.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M9 7h3v10H9zM15 7h3v10h-3z"/>',
  prev: '<path d="M18 6v12l-9-6zM7 6h3v12H7z"/>',
  next: '<path d="M6 6v12l9-6zM17 6h3v12h-3z"/>',
  heart: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  share: '<path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4M12 2v13"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  list: '<path d="M4 6h16M4 12h16M4 18h10"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  dots: '<circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  star: '<path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  crown: '<path d="M3 8l4 4 5-6 5 6 4-4v9H3z"/><path d="M3 19h18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.82-.33 1.6 1.6 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1-1.51 1.6 1.6 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.6 1.6 0 0 0 1.51-1 1.6 1.6 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 9.92 4.6a1.6 1.6 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.6 1.6 0 0 0 1 1.51 1.6 1.6 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.33 1.82 1.6 1.6 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.6 1.6 0 0 0-1.51 1z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6"/>',
  vol: '<path d="M11 5L6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
};

interface Props {
  name: IconName;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 40, color = '#2D3142' }: Props) {
  const filled = FILLED.has(name);
  const attrs = filled
    ? `fill="${color}"`
    : `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${attrs}>${PATHS[name]}</svg>`;
  const uri = `data:image/svg+xml,${encodeURIComponent(svg)}`;
  return (
    <Image
      src={uri}
      ariaLabel={`${name} 图标`}
      style={{ width: `${size}px`, height: `${size}px`, flex: '0 0 auto' }}
    />
  );
}
