/**
 * event.entity.ts — 埋点事件实体（对应 DDL: events）
 * 职责：行为埋点。event_name 承载 story_play/lesson_study/pay_show/pay_click/pay_success/member_expire 等。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ContentType } from './favorite.entity';

export type EventType = 'story' | 'song' | 'lesson' | 'parent' | 'system';

@Entity('events')
@Index('idx_events_user_time', ['userId', 'createdAt'])
@Index('idx_events_name', ['eventName', 'createdAt'])
export class Event {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'child_id', type: 'bigint', nullable: true })
  childId: string | null;

  @Column({ name: 'event_name', type: 'varchar', length: 64 })
  eventName: string;

  @Column({ name: 'event_type', type: 'varchar', length: 32 })
  eventType: EventType;

  @Column({ name: 'content_type', type: 'varchar', length: 16, nullable: true })
  contentType: ContentType | null;

  @Column({ name: 'content_id', type: 'varchar', length: 256, nullable: true })
  contentId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  properties: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
