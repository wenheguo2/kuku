/**
 * learning-progress.entity.ts — 学习进度实体（对应 DDL: learning_progress）
 * 职责：word 级四级朋友养成状态。★ 按 (child_id, word_id) 唯一。
 * current_stage：0 未遇见 / 1 已相识 / 2 好朋友 / 3 好伙伴（只升不降，展示话术见 md/13）。
 * 里程碑驱动：听/学习→1；普通挑战通过→2（无惩罚、可无限重试）；综合挑战通过→3。
 */
import { Column, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export type Subject = '识字' | '英语' | '拼音';
export type StudyType = 'study1' | 'study2' | 'study3' | 'test' | 'comprehensive';

@Entity('learning_progress')
@Unique(['childId', 'wordId'])
@Index('idx_progress_child', ['childId'])
@Index('idx_progress_subject', ['childId', 'subject'])
@Index('idx_progress_stage', ['childId', 'subject', 'currentStage'])
export class LearningProgress {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'child_id', type: 'bigint' })
  childId: string;

  @Column({ type: 'varchar', length: 16 })
  subject: Subject;

  @Column({ name: 'word_id', type: 'varchar', length: 64 })
  wordId: string;

  @Column({ name: 'word_text', type: 'varchar', length: 32, nullable: true })
  wordText: string | null;

  /** 朋友等级 0/1/2/3 */
  @Column({ name: 'current_stage', type: 'smallint', default: 0 })
  currentStage: number;

  @Column({ name: 'study1_completed', type: 'boolean', default: false })
  study1Completed: boolean;

  @Column({ name: 'study2_completed', type: 'boolean', default: false })
  study2Completed: boolean;

  @Column({ name: 'study3_completed', type: 'boolean', default: false })
  study3Completed: boolean;

  /** 普通挑战通过（好朋友） */
  @Column({ name: 'test_passed', type: 'boolean', default: false })
  testPassed: boolean;

  /** 综合挑战通过（好伙伴） */
  @Column({ name: 'comprehensive_passed', type: 'boolean', default: false })
  comprehensivePassed: boolean;

  @Column({ name: 'last_study_type', type: 'varchar', length: 16, nullable: true })
  lastStudyType: StudyType | null;

  @Column({ name: 'test_count', type: 'int', default: 0 })
  testCount: number;

  @Column({ name: 'comprehensive_count', type: 'int', default: 0 })
  comprehensiveCount: number;

  @Column({ name: 'last_test_failed', type: 'boolean', default: false })
  lastTestFailed: boolean;

  @Column({ name: 'last_test_at', type: 'timestamp', nullable: true })
  lastTestAt: Date | null;

  /** 当前挑战周期已用重试次数（历史遗留字段，无惩罚后不再使用） */
  @Column({ name: 'retry_used', type: 'int', default: 0 })
  retryUsed: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
