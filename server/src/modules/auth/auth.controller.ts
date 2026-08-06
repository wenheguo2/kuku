/**
 * auth.controller.ts — 认证接口（对齐 md/11 §2）
 *  POST /api/v1/auth/login  微信登录（@Public）
 *  POST /api/v1/auth/logout 退出登录（前端丢弃 token 即可，服务端无状态）
 */
import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { AppLoginDto } from './dto/app-login.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** 微信登录：code 换 token；自动建默认孩子档案 */
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.code, {
      userAgreementVersion: dto.user_agreement_version,
      privacyVersion: dto.privacy_version,
      childrenPrivacyVersion: dto.children_privacy_version,
    }, dto.inviter);
  }

  /** Android/iOS App 独立登录：不调用 wx.login，不复用小程序凭据。 */
  @Public()
  @Post('app/login')
  appLogin(@Body() dto: AppLoginDto) {
    return this.authService.loginApp(dto.installation_id, dto.platform, {
      userAgreementVersion: dto.user_agreement_version,
      privacyVersion: dto.privacy_version,
      childrenPrivacyVersion: dto.children_privacy_version,
    });
  }

  /** 退出登录：无状态 JWT，前端清除本地 token 即可 */
  @Post('logout')
  logout() {
    return { success: true };
  }
}
