/**
 * user.controller.ts — 用户信息接口（对齐 md/11 §2.2~2.5）
 *  GET    /api/v1/user/profile  获取用户信息（含会员状态）
 *  PUT    /api/v1/user/profile  更新昵称/头像
 *  DELETE /api/v1/user          账号注销与数据删除（二次确认）
 */
import { Body, Controller, Delete, Get, Post, Put } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
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
  @IsOptional() @IsString() nickname?: string;
  @IsOptional() @IsString() avatar_url?: string;
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
    return {
      user_id: user.id,
      nickname: user.nickname,
      avatar_url: user.avatarUrl,
      phone: maskPhone(user.phone),
      membership: membership
        ? { status: membership.status, plan_type: membership.planType, end_date: membership.endDate }
        : { status: 'none' },
    };
  }

  @Put('profile')
  async updateProfile(@CurrentUser('userId') userId: string, @Body() dto: UpdateProfileDto) {
    await this.users.update(userId, {
      ...(dto.nickname !== undefined ? { nickname: dto.nickname } : {}),
      ...(dto.avatar_url !== undefined ? { avatarUrl: dto.avatar_url } : {}),
    });
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
