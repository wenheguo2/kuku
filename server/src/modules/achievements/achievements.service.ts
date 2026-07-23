/**
 * achievements.service.ts — 陪伴养成：朋友收集册 + 成就贴纸（对齐 md/11 §6.2、md/13）
 * 设计：贴纸按"好伙伴数量里程碑"惰性发放——读取时按 learning_progress 统计，达标则 upsert 到 child_achievements。
 * 纯展示型正反馈，不做打卡/连续天数。无需写耦合进 progress 模块（读时计算，低耦合）。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChildAchievement } from '../../entities/child-achievement.entity';
import { LearningProgress, Subject } from '../../entities/learning-progress.entity';

const SUBJECTS: Subject[] = ['识字', '英语', '拼音'];

/** 好伙伴数量里程碑 → 贴纸（key, 阈值, 名称后缀） */
const STICKER_MILESTONES = [
  { threshold: 10, keySuffix: 'master_10', name: '小能手' },
  { threshold: 50, keySuffix: 'master_50', name: '小达人' },
  { threshold: 100, keySuffix: 'master_100', name: '小专家' },
];

@Injectable()
export class AchievementsService {
  constructor(
    @InjectRepository(LearningProgress) private readonly progress: Repository<LearningProgress>,
    @InjectRepository(ChildAchievement) private readonly achievements: Repository<ChildAchievement>,
  ) {}

  /** 各学科朋友分布（收集册可视化数据） */
  async getCollection(childId: string) {
    const rows = await this.progress.find({ where: { childId } });
    const bySubject = SUBJECTS.map((subject) => {
      const list = rows.filter((r) => r.subject === subject);
      return {
        subject,
        unlearned: 0, // 未建档的字不计入（收集册只展示已遇见的）
        acquainted: list.filter((r) => r.currentStage === 1).length,
        friends: list.filter((r) => r.currentStage === 2).length,
        buddies: list.filter((r) => r.currentStage === 3).length,
        total: list.length,
      };
    });
    return { child_id: childId, collection: bySubject };
  }

  /** 成就列表：先按当前进度补发达标贴纸，再返回全部已获成就 */
  async getAchievements(childId: string) {
    await this.grantEligibleStickers(childId);
    const rows = await this.achievements.find({ where: { childId }, order: { earnedAt: 'DESC' } });
    return {
      child_id: childId,
      total: rows.length,
      list: rows.map((a) => ({
        type: a.achievementType,
        key: a.achievementKey,
        name: a.achievementName,
        subject: a.subject,
        earned_at: a.earnedAt,
      })),
    };
  }

  /** 惰性发放：按好伙伴数量达标补发贴纸（幂等，唯一键去重） */
  private async grantEligibleStickers(childId: string): Promise<void> {
    const rows = await this.progress.find({ where: { childId } });
    for (const subject of SUBJECTS) {
      const buddies = rows.filter((r) => r.subject === subject && r.currentStage === 3).length;
      for (const m of STICKER_MILESTONES) {
        if (buddies >= m.threshold) {
          const key = `${subject}_${m.keySuffix}`;
          const exists = await this.achievements.findOne({ where: { childId, achievementType: 'sticker', achievementKey: key } });
          if (!exists) {
            await this.achievements.save(
              this.achievements.create({
                childId,
                achievementType: 'sticker',
                achievementKey: key,
                achievementName: `${subject}${m.name}`,
                subject,
              }),
            );
          }
        }
      }
    }
  }
}
