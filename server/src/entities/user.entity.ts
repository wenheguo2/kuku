/**
 * user.entity.ts — 用户表实体（对应 DDL: users，见 md/08 §2.2）
 * 职责：微信账号主体。openid 唯一；一个 user 下挂多个 child_profile。
 * 说明：BIGINT 主键在 TypeORM 中默认映射为 string，避免 JS number 精度丢失。
 */
import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChildProfile } from './child-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  /** 微信 openid（小程序内唯一） */
  @Column({ type: 'varchar', length: 64, unique: true })
  openid: string;

  /** 微信 unionId（跨应用唯一，可空） */
  @Column({ name: 'union_id', type: 'varchar', length: 64, nullable: true })
  unionId: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  nickname: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', length: 512, nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  /** ★免费畅听截止时间（动态免费期）：新用户注册=注册+3天；拉新成功=max(freeUntil,now)+3天，可累加。
   *  判定畅听：会员active || now < freeUntil。只在领取时往后延，平时零扣减无跨天判定→无漏洞。 */
  @Column({ name: 'free_until', type: 'timestamp', nullable: true })
  freeUntil: Date | null;

  /** ★邀请人 userId（拉新绑定，仅新用户首次注册时写一次，不可改） */
  @Column({ name: 'invited_by', type: 'bigint', nullable: true })
  invitedBy: string | null;

  /** ★累计成功拉新人数（用于奖励上限风控） */
  @Column({ name: 'referral_count', type: 'int', default: 0 })
  referralCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ChildProfile, (c) => c.user)
  children: ChildProfile[];
}
