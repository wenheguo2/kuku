/**
 * child-profile.entity.ts — 孩子档案表实体（对应 DDL: child_profiles）
 * 职责：一个 user 下的多个孩子档案。MVP 登录后自动建默认档案（见 auth）。
 * 隔离规则：播放历史/学习进度/综合挑战/成就按 child_id 隔离；收藏按 user 共享。
 */
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('child_profiles')
export class ChildProfile {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  /** 孩子昵称（仅档案展示，不要求真实姓名） */
  @Column({ name: 'child_name', type: 'varchar', length: 32 })
  childName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (u) => u.children)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
