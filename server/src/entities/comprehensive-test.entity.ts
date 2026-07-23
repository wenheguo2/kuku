/**
 * comprehensive-test.entity.ts — 综合挑战记录实体（对应 DDL: comprehensive_tests）
 * 职责：10 字/词综合挑战的一次记录。★ 服务端判分，逐字判定存 per_char_results。
 * 触发：auto（攒满 10 个好朋友）/ manual（主动选字）。通过标准：8/10 字通过。
 * 回落：未通过时只回落答错的字（per_char_results.passed=false，好伙伴→好朋友）。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { Subject } from './learning-progress.entity';

export type TriggerType = 'auto' | 'manual';

@Entity('comprehensive_tests')
@Index('idx_comp_test_child', ['childId', 'testedAt'])
export class ComprehensiveTest {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'child_id', type: 'bigint' })
  childId: string;

  @Column({ type: 'varchar', length: 16 })
  subject: Subject;

  @Column({ name: 'trigger_type', type: 'varchar', length: 8 })
  triggerType: TriggerType;

  @Column({ name: 'word_ids', type: 'jsonb' })
  wordIds: string[];

  @Column({ name: 'question_ids', type: 'jsonb' })
  questionIds: string[];

  @Column({ type: 'jsonb', nullable: true })
  answers: unknown;

  /** 逐字判定结果：[{word_id, passed, ...}] */
  @Column({ name: 'per_char_results', type: 'jsonb', nullable: true })
  perCharResults: unknown;

  @Column({ name: 'correct_count', type: 'int', nullable: true })
  correctCount: number | null;

  @Column({ type: 'boolean', nullable: true })
  passed: boolean | null;

  @CreateDateColumn({ name: 'tested_at' })
  testedAt: Date;
}
