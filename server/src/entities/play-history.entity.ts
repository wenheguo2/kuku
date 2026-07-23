/**
 * play-history.entity.ts — 播放历史实体（对应 DDL: play_history）
 * 职责：记录孩子播放进度。★ 按 child_id 隔离；唯一约束 (child_id, content_type, content_id)。
 * 复播时 UPSERT 更新 last_position_ms / played_count / updated_at。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import { ContentType } from './favorite.entity';

@Entity('play_history')
@Unique(['childId', 'contentType', 'contentId'])
@Index('idx_history_child_time', ['childId', 'updatedAt'])
export class PlayHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'child_id', type: 'bigint' })
  childId: string;

  @Column({ name: 'content_type', type: 'varchar', length: 16 })
  contentType: ContentType;

  @Column({ name: 'content_id', type: 'varchar', length: 256 })
  contentId: string;

  @Column({ name: 'content_title', type: 'varchar', length: 256, nullable: true })
  contentTitle: string | null;

  @Column({ name: 'subject_id', type: 'varchar', length: 64, nullable: true })
  subjectId: string | null;

  @Column({ name: 'last_position_ms', type: 'int', default: 0 })
  lastPositionMs: number;

  @Column({ name: 'last_segment', type: 'int', nullable: true })
  lastSegment: number | null;

  @Column({ name: 'duration_ms', type: 'int', default: 0 })
  durationMs: number;

  @Column({ name: 'played_count', type: 'int', default: 1 })
  playedCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
