/**
 * pricing.ts — 会员套餐定价与时长（口径：md/00 §7.3 / 01 PR-010）
 * 月卡 ¥9.9（早鸟）/ 季卡 ¥26 / 年卡 ¥88（主推）。
 */
import { PlanType } from '../../entities/membership.entity';

export const PLAN_PRICE: Record<PlanType, number> = {
  monthly: 9.9,
  quarterly: 26,
  yearly: 88,
};

/** 各套餐增加的月数 */
export const PLAN_MONTHS: Record<PlanType, number> = {
  monthly: 1,
  quarterly: 3,
  yearly: 12,
};

/** 在 base 日期上加 n 个月，返回 YYYY-MM-DD；月末溢出钳到目标月最后一天（如 1/31 +1月 → 2/28） */
export function addMonths(base: Date, months: number): string {
  const d = new Date(base);
  const day = d.getDate();
  d.setDate(1); // 先置 1 号，避免 setMonth 跨月溢出
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d.toISOString().slice(0, 10);
}
