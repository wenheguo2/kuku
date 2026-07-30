/**
 * share.ts — 微信分享卡片图工具
 * 分享图库：production/illustrations/share_cards/{名}.jpg（500×400，5:4 微信标准），
 * 经 /static 网络引用不占小程序包体。页面用 useShareAppMessage(() => ({ ..., imageUrl: shareCard('E04_哈哈大笑') }))。
 * 节日卡（P02~P15）暂未自动轮换，运营节奏定档后可按日期映射接入。
 */
import { CONFIG } from '@/services/config';

/** 分享卡图完整地址（name 不含扩展名，如 'E04_哈哈大笑'） */
export function shareCard(name: string): string {
  return `${CONFIG.staticBaseUrl}/illustrations/share_cards/${encodeURIComponent(name)}.jpg`;
}
