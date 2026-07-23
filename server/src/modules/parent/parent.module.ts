/**
 * parent.module.ts — 家长中心模块
 * 依赖 ProgressModule 导出的 ProgressService（成长总览复用）。
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { ParentSetting } from '../../entities/parent-setting.entity';
import { ChildrenModule } from '../children/children.module';
import { ProgressModule } from '../progress/progress.module';
import { ParentController } from './parent.controller';
import { ParentService } from './parent.service';

@Module({
  imports: [TypeOrmModule.forFeature([ParentSetting, LearningProgress]), ProgressModule, ChildrenModule],
  controllers: [ParentController],
  providers: [ParentService],
})
export class ParentModule {}
