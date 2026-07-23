/**
 * parent-setting.entity.ts — 家长设置实体（对应 DDL: parent_settings）
 * 职责：睡眠定时挡位 + 其他设置（JSONB，如 review_interval_days 默认 14）。
 * 无家长锁/无时长限制（决策 F-01）。user_id 唯一。
 */
import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

@Entity('parent_settings')
@Unique(['userId'])
export class ParentSetting {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  /** 定时关闭分钟数（15/30/45/60/90/自定义） */
  @Column({ name: 'timer_minutes', type: 'int', default: 30 })
  timerMinutes: number;

  /** 其他设置：{ theme, review_interval_days, ... } */
  @Column({ name: 'settings_json', type: 'jsonb', nullable: true })
  settingsJson: Record<string, unknown> | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
