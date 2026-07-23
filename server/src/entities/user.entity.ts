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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => ChildProfile, (c) => c.user)
  children: ChildProfile[];
}
