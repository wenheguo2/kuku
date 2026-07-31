/**
 * user.controller.ts — 用户信息接口（对齐 md/11 §2.2~2.5）
 *  GET    /api/v1/user/profile  获取用户信息（含会员状态）
 *  PUT    /api/v1/user/profile  更新昵称/头像
 *  DELETE /api/v1/user          账号注销与数据删除（二次确认）
 */
import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Membership } from '../../entities/membership.entity';
import { User } from '../../entities/user.entity';
import { AuthService } from './auth.service';

/** 手机号脱敏（儿童应用合规：不明文回传敏感个人信息） */
function maskPhone(phone?: string | null): string | null {
  if (!phone) return phone ?? null;
  return phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : '****';
}

class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(64) nickname?: string;
  @IsOptional() @IsString() @MaxLength(512) avatar_url?: string;
}

class DeleteAccountDto {
  @IsBoolean() confirm: boolean;
  @IsOptional() @IsString() reason?: string;
}

@Controller('user')
export class UserController {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    private readonly authService: AuthService,
  ) {}

  @Get('profile')
  async profile(@CurrentUser('userId') userId: string) {
    const user = await this.users.findOneByOrFail({ id: userId });
    const membership = await this.memberships.findOne({
      where: { userId, status: 'active' },
      order: { endDate: 'DESC' },
    });
    // 读时过期回收：与 membership-access.isActive() / billing 口径一致，避免个人页短暂显示“会员有效”
    let effectiveStatus = membership?.status ?? 'none';
    if (membership) {
      const stillValid = new Date(membership.endDate) >= new Date(new Date().toISOString().slice(0, 10));
      if (!stillValid) {
        effectiveStatus = 'expired';
        await this.memberships.update({ id: membership.id, status: 'active' }, { status: 'expired' });
      }
    }
    // ★免费期：now < free_until 即仍在免费期；“全站畅听”=会员active || 免费期内
    const inFreePeriod = !!user.freeUntil && new Date(user.freeUntil).getTime() > Date.now();
    const canAccessAll = effectiveStatus === 'active' || inFreePeriod;
    // ★统一“权益到期”=会员有效期末 与 赠送到期 的较晚者（累加口径，供统一展示‘还剩 N 天’）
    const memEndMs = membership && effectiveStatus === 'active' ? new Date(membership.endDate).getTime() : 0;
    const freeMs = user.freeUntil ? new Date(user.freeUntil).getTime() : 0;
    const entMs = Math.max(memEndMs, freeMs);
    const entitlementUntil = entMs > 0 ? new Date(entMs).toISOString() : null;
    return {
      user_id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      phone: maskPhone(user.phone),
      free_until: user.freeUntil ? new Date(user.freeUntil).toISOString() : null,
      in_free_period: inFreePeriod,
      can_access_all: canAccessAll,
      entitlement_until: entitlementUntil,
      referral_count: user.referralCount ?? 0,
      membership: membership
        ? { status: effectiveStatus, plan_type: membership.planType, end_date: membership.endDate }
        : { status: 'none' },
    };
  }

  @Put('profile')
  async updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    const patch = {
      ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
      ...(dto.avatar_url !== undefined ? { avatarUrl: dto.avatar_url } : {}),
    };
    // 空 patch 直接短路，避免 TypeORM update({}) 抛 UpdateValuesMissingError → 500
    if (Object.keys(patch).length === 0) return { success: true };
    await this.users.update(userId, patch);
    return { success: true };
  }

  @Delete()
  async deleteAccount(@CurrentUser('userId') userId: string, @Body() dto: DeleteAccountDto) {
    if (!dto.confirm) {
      return { success: false, message: '需二次确认' };
    }
    const r = await this.authService.deleteAccount(userId);
    return r;
  }

  @Post('consent/withdraw')
  async withdrawConsent(@CurrentUser('userId') userId: string) {
    return this.authService.withdrawConsent(userId);
  }
}
