/**
 * vip.decorator.ts — @Vip() 标记接口为会员专属
 * 配合 VipGuard：非会员访问返回 403（前端展示锁定预览+开通提示）。
 * 权威口径：PRD 2.4.2 付费边界 / 13号 §1.2 护栏（收集册查看/综合挑战/成就贴纸会员门控；普通挑战与学习免费）。
 */
import { SetMetadata } from '@nestjs/common';

export const IS_VIP_KEY = 'isVip';
export const Vip = () => SetMetadata(IS_VIP_KEY, true);
