/**
 * useShareCard — 统一分享内容 hook（转发好友 + 分享朋友圈 一次搞定）
 * 用户定：分享拉新要到处都能点，且卡面要好看（真插画卡）。
 * 用法：useShareCard({ title: '酷酷音乐厅 — 儿歌一起唱', card: 'E05_学科启蒙' });
 *  - path 默认回到故事首页（新用户落地首屏内容最丰富），也可显式指定；
 *  - 同时注册 useShareAppMessage（转发给好友/群）与 useShareTimeline（分享到朋友圈），
 *    朋友圈接口不支持自定义 imageUrl 之外的富参数，故 query 用 path 的查询串。
 */
import { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { shareCard } from '@/utils/share';

interface Options {
  /** 分享标题 */
  title: string;
  /** 分享卡图名（production/illustrations/share_cards 下，不含扩展名） */
  card: string;
  /** 落地页路径，默认 /pages/story/index/index */
  path?: string;
}

export function useShareCard({ title, card, path = '/pages/story/index/index' }: Options) {
  useShareAppMessage(() => ({ title, path, imageUrl: shareCard(card) }));
  // 朋友圈：只接受 title/query/imageUrl（不接受完整 path），query 取 path 的参数串
  useShareTimeline(() => ({
    title,
    query: path.includes('?') ? path.split('?')[1] : '',
    imageUrl: shareCard(card),
  }));
}
