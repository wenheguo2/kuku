/**
 * track.module.ts — 埋点模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from '../../entities/event.entity';
import { TrackController } from './track.controller';
import { ChildrenModule } from '../children/children.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event]), ChildrenModule],
  controllers: [TrackController],
})
export class TrackModule {}
