/**
 * child-achievement.entity.ts — 孩子成就实体（对应 DDL: child_achievements）
 * 职责：陪伴养成正反馈（贴纸/称号/朋友册节点）。纯展示型，不做打卡/连续天数。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Subject } from './learning-progress.entity';

export type AchievementType = 'sticker' | 'title' | 'tree_node';

@Entity('child_achievements')
@Unique(['childId', 'achievementType', 'achievementKey'])
@Index('idx_achievement_child', ['childId', 'achievementType'])
export class ChildAchievement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'child_id', type: 'bigint' })
  childId: string;

  @Column({ name: 'achievement_type', type: 'varchar', length: 32 })
  achievementType: AchievementType;

  @Column({ name: 'achievement_key', type: 'varchar', length: 64 })
  achievementKey: string;

  @Column({ name: 'achievement_name', type: 'varchar', length: 64 })
  achievementName: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  subject: Subject | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: unknown;

  @CreateDateColumn({ name: 'earned_at' })
  earnedAt: Date;
}
