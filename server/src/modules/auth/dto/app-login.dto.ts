/**
 * app-login.dto.ts — Android/iOS App 独立设备会话登录。
 *
 * 安装标识由 App 首次启动生成并保存在系统安全存储中；服务端只保存其 HMAC
 * 派生身份，不保存原始标识。该通道由 APP_AUTH_ENABLED 单独控制，不依赖微信
 * 小程序 AppID，也不会影响小程序登录与发布。
 */
import { Equals, IsIn, IsString, IsUUID, MaxLength } from 'class-validator';

export class AppLoginDto {
  @IsUUID('4')
  installation_id: string;

  @IsIn(['android', 'ios'])
  platform: 'android' | 'ios';

  @Equals(true)
  guardian_consent: true;

  @IsString()
  @MaxLength(64)
  user_agreement_version: string;

  @IsString()
  @MaxLength(64)
  privacy_version: string;

  @IsString()
  @MaxLength(64)
  children_privacy_version: string;
}
