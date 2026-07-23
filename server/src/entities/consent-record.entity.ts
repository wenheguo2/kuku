/**
 * consent-record.entity.ts — 监护人协议同意留痕（对应 DDL: consent_records）
 * 仅记录协议版本与同意时间，不保存勾选页截图等非必要个人信息。
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('consent_records')
@Index('uq_consent_user_versions', ['userId', 'userAgreementVersion', 'privacyVersion', 'childrenPrivacyVersion'], {
  unique: true,
})
@Index('idx_consent_user_time', ['userId', 'agreedAt'])
export class ConsentRecord {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: string;

  @Column({ name: 'consent_type', type: 'varchar', length: 32, default: 'guardian' })
  consentType: 'guardian';

  @Column({ name: 'user_agreement_version', type: 'varchar', length: 64 })
  userAgreementVersion: string;

  @Column({ name: 'privacy_version', type: 'varchar', length: 64 })
  privacyVersion: string;

  @Column({ name: 'children_privacy_version', type: 'varchar', length: 64 })
  childrenPrivacyVersion: string;

  @CreateDateColumn({ name: 'agreed_at' })
  agreedAt: Date;

  @Column({ name: 'withdrawn_at', type: 'timestamp', nullable: true })
  withdrawnAt: Date | null;
}
