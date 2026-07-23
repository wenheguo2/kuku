/**
 * parent.service.ts — 家长中心业务（对齐 md/11 §6.3）
 * 设置 get/put（睡眠定时 + settings_json）；本周成长概览；成长明细（逐字状态+学科筛选）。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { LearningProgress, Subject } from '../../entities/learning-progress.entity';
import { ParentSetting } from '../../entities/parent-setting.entity';

@Injectable()
export class ParentService {
  constructor(
    @InjectRepository(ParentSetting) private readonly settings: Repository<ParentSetting>,
    @InjectRepository(LearningProgress) private readonly progress: Repository<LearningProgress>,
  ) {}

  /** 获取家长设置（无则返回默认） */
  async getSettings(userId: string) {
    const s = await this.settings.findOne({ where: { userId } });
    return {
      timer_minutes: s?.timerMinutes ?? 30,
      settings: s?.settingsJson ?? { theme: 'system', review_interval_days: 14 },
    };
  }

  /** 更新家长设置（UPSERT） */
  async updateSettings(userId: string, timerMinutes?: number, settingsJson?: Record<string, unknown>) {
    let s = await this.settings.findOne({ where: { userId } });
    if (!s) s = this.settings.create({ userId });
    if (timerMinutes !== undefined) s.timerMinutes = timerMinutes;
    if (settingsJson !== undefined) s.settingsJson = { ...(s.settingsJson ?? {}), ...this.sanitizeSettings(settingsJson) };
    await this.settings.save(s);
    return { success: true };
  }

  /** settings_json 安全合并：仅接受原始类型值，限制键数/键长/值长，防注入内部标志与存储型膨胀。 */
  private sanitizeSettings(input: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(input)) {
      if (n >= 20 || typeof k !== 'string' || k.length > 40) continue;
      if (typeof v === 'string') { out[k] = v.slice(0, 200); n += 1; }
      else if (typeof v === 'number' || typeof v === 'boolean') { out[k] = v; n += 1; }
    }
    return out;
  }

  /** 本周成长概览（本周新增：已相识/好朋友/好伙伴） */
  async weekly(childId: string) {
    const weekAgo = new Date(Date.now() - 7 * 86400_000);
    const rows = await this.progress.find({ where: { childId, updatedAt: MoreThan(weekAgo) } });
    return {
      child_id: childId,
      weekly_stats: {
        new_acquainted: rows.filter((r) => r.currentStage >= 1).length,
        new_friends: rows.filter((r) => r.currentStage >= 2).length,
        new_buddies: rows.filter((r) => r.currentStage >= 3).length,
      },
    };
  }

  /** 成长明细（逐字状态 + 时间，支持学科筛选） */
  async detail(childId: string, subject?: Subject) {
    const where: Record<string, unknown> = { childId };
    if (subject) where.subject = subject;
    const rows = await this.progress.find({ where, order: { updatedAt: 'DESC' }, take: 500 });
    return {
      child_id: childId,
      total: rows.length,
      list: rows.map((r) => ({
        word_id: r.wordId,
        word: r.wordText,
        subject: r.subject,
        current_stage: r.currentStage,
        updated_at: r.updatedAt,
      })),
    };
  }
}
