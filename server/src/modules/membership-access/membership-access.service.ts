/**
 * membership-access.service.ts — 会员状态查询（供门控守卫复用）
 * isActive(userId)：是否存在 active 且未过期的会员。@Global 模块导出，避免各处重复查询。
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../../entities/membership.entity';

@Injectable()
export class MembershipAccessService {
  constructor(@InjectRepository(Membership) private readonly memberships: Repository<Membership>) {}

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
}
