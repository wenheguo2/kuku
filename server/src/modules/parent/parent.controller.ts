/**
 * parent.controller.ts — 家长中心接口（对齐 md/11 §6.3）
 *  GET/PUT /api/v1/parent/settings
 *  GET     /api/v1/parent/progress/summary?child_id=   （复用 ProgressService.summary）
 *  GET     /api/v1/parent/progress/weekly?child_id=
 *  GET     /api/v1/parent/progress/detail?child_id=&subject=
 */
import { Body, Controller, Get, Put, Query } from '@nestjs/common';
import { IsInt, IsObject, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Subject } from '../../entities/learning-progress.entity';
import { ProgressService } from '../progress/progress.service';
import { ChildOwnershipService } from '../children/child-ownership.service';
import { ParentService } from './parent.service';

class UpdateSettingsDto {
  @IsOptional() @Type(() => Number) @IsInt() timer_minutes?: number;
  @IsOptional() @IsObject() settings?: Record<string, unknown>;
}

@Controller('parent')
export class ParentController {
  constructor(
    private readonly parent: ParentService,
    private readonly progress: ProgressService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string) {
    return this.parent.getSettings(userId);
  }

  @Put('settings')
  updateSettings(@CurrentUser('userId') userId: string, @Body() dto: UpdateSettingsDto) {
    return this.parent.updateSettings(userId, dto.timer_minutes, dto.settings);
  }

  @Get('progress/summary')
  async summary(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.progress.summary(childId);
  }

  @Get('progress/weekly')
  async weekly(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.parent.weekly(childId);
  }

  @Get('progress/detail')
  async detail(
    @CurrentUser('userId') userId: string,
    @Query('child_id') childId: string,
    @Query('subject') subject?: Subject,
  ) {
    await this.ownership.assertOwner(userId, childId);
    return this.parent.detail(childId, subject);
  }
}
