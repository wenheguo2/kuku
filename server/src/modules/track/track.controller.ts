/**
 * track.controller.ts — 埋点上报（对齐 md/11 §9.1）
 *  POST /api/v1/track  记录一条埋点事件（event_name 承载付费漏斗等）
 * event_type 由 event_name 前缀推断，容错默认 'system'。
 */
import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Event, EventType } from '../../entities/event.entity';
import { ChildOwnershipService } from '../children/child-ownership.service';

class TrackDto {
  @IsString() @MaxLength(64) event: string;
  @IsOptional() @IsString() @MaxLength(64) child_id?: string;
  @IsOptional() @IsObject() properties?: Record<string, unknown>;
}

function inferType(eventName: string): EventType {
  if (eventName.startsWith('story')) return 'story';
  if (eventName.startsWith('song')) return 'song';
  if (eventName.startsWith('lesson') || eventName.startsWith('test')) return 'lesson';
  if (eventName.startsWith('parent') || eventName.startsWith('pay') || eventName.startsWith('member')) return 'parent';
  return 'system';
}

@Controller('track')
export class TrackController {
  constructor(
    @InjectRepository(Event) private readonly repo: Repository<Event>,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Post()
  async track(@CurrentUser('userId') userId: string, @Body() dto: TrackDto) {
    if (dto.properties && JSON.stringify(dto.properties).length > 4096) {
      throw new BadRequestException('埋点 properties 过大（上限 4KB）');
    }
    if (dto.child_id) await this.ownership.assertOwner(userId, dto.child_id);
    await this.repo.save(
      this.repo.create({
        userId,
        childId: dto.child_id ?? null,
        eventName: dto.event,
        eventType: inferType(dto.event),
        properties: dto.properties ?? null,
      }),
    );
    return { success: true };
  }
}
