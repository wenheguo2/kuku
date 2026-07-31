/**
 * progress.controller.ts — 成长/进度接口（对齐 md/11 §5、§6.1）
 *  GET  /api/v1/progress/summary?child_id=            成长总览
 *  POST /api/v1/progress/study                         提交学习完成（0→1）
 *  GET  /api/v1/progress/:subject?child_id=&stage=     学科朋友等级列表（可按亲密度级别筛选）
 * ★ 注意路由顺序：字面量路由需在 :subject 之前声明，避免被参数路由捕获。
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StudyType, Subject } from '../../entities/learning-progress.entity';
import { ChildOwnershipService } from '../children/child-ownership.service';
import { ProgressService } from './progress.service';

class StudyDto {
  @IsString() @MaxLength(20) child_id: string;
  @IsIn(['识字', '英语', '拼音']) subject: Subject;
  @IsString() @MaxLength(64) word_id: string;
  @IsOptional() @IsString() @MaxLength(32) word_text?: string;
  @IsIn(['study1', 'study2', 'study3']) study_type: StudyType;
}

@Controller('progress')
export class ProgressController {
  constructor(
    private readonly service: ProgressService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Get('summary')
  async summary(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.summary(childId);
  }

  @Post('study')
  async study(@CurrentUser('userId') userId: string, @Body() dto: StudyDto) {
    await this.ownership.assertOwner(userId, dto.child_id);
    return this.service.submitStudy(userId, dto.child_id, dto.subject, dto.word_id, dto.study_type, dto.word_text);
  }

  @Get(':subject')
  async list(
    @CurrentUser('userId') userId: string,
    @Param('subject') subject: Subject,
    @Query('child_id') childId: string,
    @Query('stage') stage?: string,
    @Query('page') page = '1',
    @Query('page_size') pageSize = '20',
  ) {
    await this.ownership.assertOwner(userId, childId);
    const stageNum = stage !== undefined && stage !== '' ? Number(stage) : undefined;
    // 分页硬约束：page≥1；page_size 限 1..100，防超大 take 拉大查询(DoS)
    const pageNum = Math.max(1, Math.floor(Number(page)) || 1);
    const sizeNum = Math.min(100, Math.max(1, Math.floor(Number(pageSize)) || 20));
    return this.service.listBySubject(childId, subject, stageNum, pageNum, sizeNum);
  }
}

/**
 * VocabularyController — 字词详情（对齐 md/11 §5.2）
 *  GET /api/v1/vocabulary/:word_id?child_id=
 */
@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly service: ProgressService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Get(':word_id')
  async detail(
    @CurrentUser('userId') userId: string,
    @Param('word_id') wordId: string,
    @Query('child_id') childId: string,
  ) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.getVocabulary(childId, wordId);
  }
}
