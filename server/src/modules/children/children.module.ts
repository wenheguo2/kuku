/**
 * children.module.ts — 孩子档案模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildProfile } from '../../entities/child-profile.entity';
import { ChildOwnershipService } from './child-ownership.service';
import { ChildrenController } from './children.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ChildProfile])],
  controllers: [ChildrenController],
  providers: [ChildOwnershipService],
  exports: [ChildOwnershipService],
})
export class ChildrenModule {}
