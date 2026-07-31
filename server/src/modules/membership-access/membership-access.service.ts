/**
 * membership-access.service.ts — 会员状态查询（供门控守卫复用）
 * isActive(userId)：是否存在 active 且未过期的会员。@Global 模块导出，避免各处重复查询。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../entities/membership.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class MembershipAccessService {
  constructor(
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  /** 当前用户是否有效会员（active 且 end_date >= 今天） */
  async isActive(userId: string): Promise<boolean> {
    const m = await this.memberships.findOne({
      where: { userId, status: 'active' },
      order: { endDate: 'DESC' },
    });
    if (!m) return false;
    const active = new Date(m.endDate) >= new Date(new Date().toISOString().slice(0, 10));
    // 读时落库：已过期则 status active→expired（幂等，避免 status 字段与实际不一致、admin 统计误计）
    if (!active) await this.memberships.update({ id: m.id, status: 'active' }, { status: 'expired' });
    return active;
  }

  /** ★当前用户是否可“全站畅听”：会员 active 或仍在免费期（now < free_until）。
   *  用于池外故事/歌曲、学习2/3 等付费边界的统一门控口径。 */
  async canAccessAll(userId: string): Promise<boolean> {
    if (await this.isActive(userId)) return true;
    const user = await this.users.findOne({ where: { id: userId }, select: ['id', 'freeUntil'] });
    return !!user?.freeUntil && new Date(user.freeUntil).getTime() > Date.now();
  }
}
