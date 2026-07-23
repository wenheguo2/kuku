/**
 * achievements.controller.ts — 陪伴养成接口（对齐 md/11 §6.2）
 *  GET /api/v1/achievements/:child_id             成就列表（贴纸+称号+朋友册节点）
 *  GET /api/v1/achievements/:child_id/collection  朋友收集册可视化（各学科好朋友/好伙伴数量）
 */
import { Controller, Get, Param } from '@nestjs/common';
import { Vip } from '../../common/decorators/vip.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ChildOwnershipService } from '../children/child-ownership.service';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
export class AchievementsController {
  constructor(
    private readonly service: AchievementsService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Vip()
  @Get(':child_id')
  async list(@CurrentUser('userId') userId: string, @Param('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.getAchievements(childId);
  }

  @Vip()
  @Get(':child_id/collection')
  async collection(@CurrentUser('userId') userId: string, @Param('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.getCollection(childId);
  }
}
