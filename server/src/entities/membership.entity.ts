/**
 * membership.entity.ts — 会员订阅实体（对应 DDL: memberships）
 * 职责：会员有效期与状态。plan_type: monthly/quarterly/yearly；status: active/expired/cancelled。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type PlanType = 'monthly' | 'quarterly' | 'yearly';
export type MembershipStatus = 'active' | 'expired' | 'cancelled';

@Entity('memberships')
@Index('idx_membership_user', ['userId', 'status'])
export class Membership {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'plan_type', type: 'varchar', length: 16 })
  planType: PlanType;

  @Column({ type: 'varchar', length: 16 })
  status: MembershipStatus;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ name: 'auto_renew', type: 'boolean', default: false })
  autoRenew: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
