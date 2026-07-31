/**
 * test.controller.ts — 挑战接口（对齐 md/11 §5.4~5.6）
 *  GET  /api/v1/test/quiz/:word_id?child_id=&subject=&word_text=   取普通挑战题（不含答案）
 *  POST /api/v1/test/quiz/:word_id                                 提交普通挑战（服务端判分）
 *  GET  /api/v1/test/comprehensive/auto?child_id=&subject=         查可否自动触发
 *  POST /api/v1/test/comprehensive/auto                            提交自动触发综合挑战
 *  POST /api/v1/test/comprehensive/manual/start                    主动选字并取题
 *  POST /api/v1/test/comprehensive/manual                          提交主动综合挑战
 *  GET  /api/v1/test/comprehensive/history?child_id=               综合挑战历史
 */
import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Vip } from '../../common/decorators/vip.decorator';
import { Subject } from '../../entities/learning-progress.entity';
import { ChildOwnershipService } from '../children/child-ownership.service';
import { ProgressService } from './progress.service';

class QuizAnswerItem {
  @IsString() question_id: string;
  @IsString() selected_option: string;
}
class SubmitQuizDto {
  @IsString() child_id: string;
  @IsString() test_id: string;
  @IsArray() @ArrayMaxSize(4) @ValidateNested({ each: true }) @Type(() => QuizAnswerItem) answers: QuizAnswerItem[];
}

class SubmitComprehensiveDto {
  @IsString() child_id: string;
  @IsIn(['识字', '英语', '拼音']) subject: Subject;
  @IsString() test_id: string;
  @IsArray() @ArrayMaxSize(10) @ValidateNested({ each: true }) @Type(() => QuizAnswerItem) answers: QuizAnswerItem[];
}

class StartManualComprehensiveDto {
  @IsString() child_id: string;
  @IsIn(['识字', '英语', '拼音']) subject: Subject;
  @IsArray() @ArrayMinSize(10) @ArrayMaxSize(10) @IsString({ each: true }) word_ids: string[];
}

@Controller('test')
export class TestController {
  constructor(
    private readonly service: ProgressService,
    private readonly ownership: ChildOwnershipService,
  ) {}

  @Get('quiz/:word_id')
  async getQuiz(
    @CurrentUser('userId') userId: string,
    @Param('word_id') wordId: string,
    @Query('child_id') childId: string,
    @Query('subject') subject: Subject,
    @Query('word_text') wordText = '',
  ) {
    await this.ownership.assertOwner(userId, childId);
    // 防超长入参触发 DB 层 500：wordId 对齐 VARCHAR(64)、wordText 对齐 VARCHAR(32)
    return this.service.getQuiz(childId, subject, wordId.slice(0, 64), (wordText || '').slice(0, 32));
  }

  @Post('quiz/:word_id')
  async submitQuiz(@CurrentUser('userId') userId: string, @Body() dto: SubmitQuizDto) {
    await this.ownership.assertOwner(userId, dto.child_id);
    return this.service.submitQuiz(userId, dto.child_id, dto.test_id, dto.answers);
  }

  @Vip()
  @Get('comprehensive/auto')
  async compAuto(
    @CurrentUser('userId') userId: string,
    @Query('child_id') childId: string,
    @Query('subject') subject: Subject,
  ) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.comprehensiveAuto(childId, subject);
  }

  @Vip()
  @Post('comprehensive/auto')
  async submitAuto(@CurrentUser('userId') userId: string, @Body() dto: SubmitComprehensiveDto) {
    await this.ownership.assertOwner(userId, dto.child_id);
    return this.service.submitComprehensive(userId, dto.child_id, dto.subject, 'auto', dto.test_id, dto.answers);
  }

  @Vip()
  @Post('comprehensive/manual/start')
  async startManual(@CurrentUser('userId') userId: string, @Body() dto: StartManualComprehensiveDto) {
    await this.ownership.assertOwner(userId, dto.child_id);
    return this.service.comprehensiveManualStart(dto.child_id, dto.subject, dto.word_ids);
  }

  @Vip()
  @Post('comprehensive/manual')
  async submitManual(@CurrentUser('userId') userId: string, @Body() dto: SubmitComprehensiveDto) {
    await this.ownership.assertOwner(userId, dto.child_id);
    return this.service.submitComprehensive(userId, dto.child_id, dto.subject, 'manual', dto.test_id, dto.answers);
  }

  @Vip()
  @Get('comprehensive/history')
  async history(@CurrentUser('userId') userId: string, @Query('child_id') childId: string) {
    await this.ownership.assertOwner(userId, childId);
    return this.service.comprehensiveHistory(childId);
  }
}
