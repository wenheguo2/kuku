/**
 * child-ownership.service.ts — 儿童档案归属校验
 * 职责：所有接收 child_id 的业务模块在读写前统一校验档案属于当前 JWT 用户。
 * 安全策略：不存在或不属于当前用户均返回 404，避免泄漏其他账号的档案是否存在。
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChildProfile } from '../../entities/child-profile.entity';

@Injectable()
export class ChildOwnershipService {
  constructor(@InjectRepository(ChildProfile) private readonly children: Repository<ChildProfile>) {}

  /** 断言 childId 属于 userId；成功时返回档案，失败统一抛 404。 */
  async assertOwner(userId: string, childId: string): Promise<ChildProfile> {
    const child = await this.children.findOne({ where: { id: childId, userId } });
    if (!child) throw new NotFoundException('未找到孩子档案');
    return child;
  }
}
