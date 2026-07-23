/**
 * history.module.ts — 播放历史模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayHistory } from '../../entities/play-history.entity';
import { ChildrenModule } from '../children/children.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayHistory]), ChildrenModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
