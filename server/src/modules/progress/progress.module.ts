/**
 * progress.module.ts — 成长/学习进度模块
 * 含普通挑战、综合挑战、复习、成长总览。TestStore 为进程内答案暂存（判分用）。
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprehensiveTest } from '../../entities/comprehensive-test.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { ChildrenModule } from '../children/children.module';
import { ProgressController, VocabularyController } from './progress.controller';
import { ProgressService } from './progress.service';
import { TestController } from './test.controller';
import { TestStore } from './test-store';

@Module({
  imports: [TypeOrmModule.forFeature([LearningProgress, ComprehensiveTest]), ChildrenModule],
  controllers: [ProgressController, VocabularyController, TestController],
  providers: [ProgressService, TestStore],
  exports: [ProgressService],
})
export class ProgressModule {}
