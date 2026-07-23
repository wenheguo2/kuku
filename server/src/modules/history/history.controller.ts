/**
 * history.controller.ts — 播放历史接口（对齐 md/11 §3.1~3.4，按 child_id 隔离）
 *  POST   /api/v1/history                  记录播放
 *  GET    /api/v1/history?child_id=         查询某孩子历史
 *  DELETE /api/v1/history/:id               删除单条
 *  DELETE /api/v1/history?child_id=         清空某孩子历史
 */
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ContentType } from '../../entities/favorite.entity';
import { ChildOwnershipService } from '../children/child-ownership.service';
import { HistoryService } from './history.service';

class SaveHistoryBody {
  @IsString() child_id: string;
  @IsIn(['story', 'song', 'lesson']) content_type: ContentType;
  @IsString() content_id: string;
  @IsOptional() @IsString() content_title?: string;
  @IsOptional() @IsString() subject_id?: string;
  @IsOptional() @Type(() => Number) @IsInt() last_position_ms?: number;
  @IsOptional() @Type(() => Number) @IsInt() last_segment?: number;
  @IsOptional() @Type(() => Number) @IsInt() duration_ms?: number;
}

@Controller('history')
export class HistoryController {
  constructor(
    private readonly service: HistoryService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Post()
  async save(@CurrentUser('userId') userId: string, @Body() body: SaveHistoryBody) {
    await this.ownership.assertOwner(userId, body.child_id);
    return this.service.save(userId, body);
  }

  @Get()
  async list(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.list(childId);
  }

  @Delete(':id')
  remove(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }

  /** 清空：DELETE /history?child_id=xxx（无 :id 命中此路由需放在 :id 之后） */
  @Delete()
  async clear(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.clear(childId);
  }
}
