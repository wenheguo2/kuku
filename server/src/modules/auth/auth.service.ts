/**
 * auth.service.ts — 认证业务
 * 职责：
 *  1) login：code→openid（WechatService）→ 找/建 user → ★ 若无孩子档案则自动建默认档案 → 签发 JWT。
 *     （★ 关键约束 md/18 §0：learning_progress/comprehensive_tests 的 child_id NOT NULL，
 *      MVP 单孩子也必须有一个默认 child_profile，否则成长数据无法落库。）
 *  2) deleteAccount：账号注销，级联删除名下全部数据（合规，md/11 §2.5）。
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { ChildProfile } from '../../entities/child-profile.entity';
import { User } from '../../entities/user.entity';
import { ConsentRecord } from '../../entities/consent-record.entity';
import { WechatService } from './wechat.service';

export interface LoginResult {
  token: string;
  expires_in: number;
  user: { user_id: string; nickname: string | null; is_new: boolean };
  default_child_id: string;
}

export interface AgreementVersions {
  userAgreementVersion: string;
  privacyVersion: string;
  childrenPrivacyVersion: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ChildProfile) private readonly children: Repository<ChildProfile>,
    @InjectRepository(ConsentRecord) private readonly consents: Repository<ConsentRecord>,
    private readonly wechat: WechatService,
    private readonly jwt: JwtService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  /** 微信登录：换 openid → upsert user → 保证默认档案 → 签 JWT */
  async login(code: string | undefined, versions: AgreementVersions): Promise<LoginResult> {
    const expected: AgreementVersions = {
      userAgreementVersion: this.config.get<string>('USER_AGREEMENT_VERSION', '2026-07-draft'),
      privacyVersion: this.config.get<string>('PRIVACY_VERSION', '2026-07-draft'),
      childrenPrivacyVersion: this.config.get<string>('CHILDREN_PRIVACY_VERSION', '2026-07-draft'),
    };
    if (
      versions.userAgreementVersion !== expected.userAgreementVersion
      || versions.privacyVersion !== expected.privacyVersion
      || versions.childrenPrivacyVersion !== expected.childrenPrivacyVersion
    ) {
      throw new BadRequestException('协议版本已更新，请重新阅读并同意');
    }
    const { openid, unionId } = await this.wechat.code2session(code);

    let user = await this.users.findOne({ where: { openid } });
    const isNew = !user;
    if (!user) {
      user = this.users.create({ openid, unionId: unionId ?? null, nickname: '宝宝家长' });
      user = await this.users.save(user);
    }

    const recorded = await this.consents.findOne({
      where: {
        userId: user.id,
        userAgreementVersion: versions.userAgreementVersion,
        privacyVersion: versions.privacyVersion,
        childrenPrivacyVersion: versions.childrenPrivacyVersion,
      },
    });
    if (!recorded) {
      await this.consents.save(
        this.consents.create({
          userId: user.id,
          consentType: 'guardian',
          ...versions,
          withdrawnAt: null,
        }),
      );
    }

    // ★ 保证至少有一个默认孩子档案
    let child = await this.children.findOne({ where: { userId: user.id } });
    if (!child) {
      child = this.children.create({ userId: user.id, childName: '宝宝' });
      child = await this.children.save(child);
    }

    const token = await this.jwt.signAsync({ sub: user.id, openid: user.openid });
    return {
      token,
      expires_in: 7 * 24 * 3600,
      user: { user_id: user.id, nickname: user.nickname, is_new: isNew },
      default_child_id: child.id,
    };
  }

  /** 账号注销：事务内删除名下全部数据（child ON DELETE CASCADE 会带走进度/历史/挑战/成就） */
  async deleteAccount(userId: string): Promise<{ success: boolean; deleted_at: string; purge_completed: boolean }> {
    await this.dataSource.transaction(async (m) => {
      await m.query('DELETE FROM events WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM orders WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM memberships WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM favorites WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM parent_settings WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM consent_records WHERE user_id = $1', [userId]);
      // child 关联表通过 ON DELETE CASCADE 删除
      await m.query('DELETE FROM child_profiles WHERE user_id = $1', [userId]);
      await m.query('DELETE FROM users WHERE id = $1', [userId]);
    });
    return { success: true, deleted_at: new Date().toISOString(), purge_completed: true };
  }

  /** 监护人撤回同意：将最新一条未撤回的同意记录 withdrawn_at 置为当前（PIPL/儿童个人信息合规）。 */
  async withdrawConsent(userId: string): Promise<{ success: boolean; withdrawn_at: string | null }> {
    const latest = await this.consents.findOne({ where: { userId, withdrawnAt: IsNull() }, order: { agreedAt: 'DESC' } });
    if (!latest) return { success: false, withdrawn_at: null };
    latest.withdrawnAt = new Date();
    await this.consents.save(latest);
    return { success: true, withdrawn_at: latest.withdrawnAt.toISOString() };
  }
}
