/**
 * ShareBar — 通用「分享拉新」按钮（全站复用，用户定：不能只有故事页有分享）
 * 用法：<ShareBar text="🎵 把好听的儿歌分享给小伙伴" />
 * 说明：
 *  - 必须是 Button + openType="share"，View 点了不会拉起转发面板（微信限制）；
 *  - 分享内容（标题/路径/卡图）由所在页面的 useShareCard() 决定，本组件只负责"入口"；
 *  - 样式走全局 button.share-bar（橙色渐变横条，热区 ≥88rpx）。
 */
import { Button } from '@tarojs/components';

interface Props {
  /** 按钮文案（自带 emoji 更醒目） */
  text?: string;
  /** 额外类名（如需调整外边距） */
  className?: string;
}

export default function ShareBar({ text = '📤 把酷酷分享给小伙伴一起听', className = '' }: Props) {
  return (
    <Button className={`share-bar ${className}`} openType="share">{text}</Button>
  );
}
