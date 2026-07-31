/**
 * dto/login.dto.ts — 微信登录请求 DTO（对齐 md/11 §2.1）
 */
import { Equals, IsOptional, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  /** 微信 wx.login 返回的 code；mock 模式可传任意值或省略 */
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  encrypted_data?: string;

  @IsOptional()
  @IsString()
  iv?: string;

  /** 监护人必须主动勾选，服务端拒绝缺失或 false，不能由前端默认勾选。 */
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

  /** ★拉新：邀请人 userId（从分享链接 ?inviter= 带入）；仅新用户首次注册时生效 */
  @IsOptional()
  @IsString()
  @MaxLength(32)
  inviter?: string;
}
