/**
 * membership-access.module.ts — @Global 会员访问模块
 * 导出 MembershipAccessService，供 VipGuard（全局守卫）注入使用。
 */
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from '../../entities/membership.entity';
import { User } from '../../entities/user.entity';
import { MembershipAccessService } from './membership-access.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Membership, User])],
  providers: [MembershipAccessService],
  exports: [MembershipAccessService],
})
export class MembershipAccessModule {}
