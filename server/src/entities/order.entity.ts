/**
 * order.entity.ts — 订单实体（对应 DDL: orders）
 * 职责：会员购买订单。order_no 唯一；status: pending/paid/failed/refunded/cancelled。
 * 支付：MVP 阶段调起为 stub（见 orders 模块），真商户号到位后接微信支付回调更新 status。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PlanType } from './membership.entity';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

@Entity('orders')
@Index('idx_orders_user', ['userId', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'order_no', type: 'varchar', length: 64, unique: true })
  orderNo: string;

  @Column({ name: 'plan_type', type: 'varchar', length: 16 })
  planType: PlanType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ name: 'payment_channel', type: 'varchar', length: 16, nullable: true })
  paymentChannel: string | null;

  @Column({ type: 'varchar', length: 16 })
  status: OrderStatus;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
