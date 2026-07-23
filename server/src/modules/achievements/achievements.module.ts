/**
 * achievements.module.ts — 陪伴养成模块（成就/收集册）
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildAchievement } from '../../entities/child-achievement.entity';
import { LearningProgress } from '../../entities/learning-progress.entity';
import { ChildrenModule } from '../children/children.module';
import { AchievementsController } from './achievements.controller';
import { AchievementsService } from './achievements.service';

@Module({
  imports: [TypeOrmModule.forFeature([LearningProgress, ChildAchievement]), ChildrenModule],
  controllers: [AchievementsController],
  providers: [AchievementsService],
})
export class AchievementsModule {}
