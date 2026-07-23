/**
 * public.decorator.ts — @Public() 标记接口无需登录
 * 用于全局 JwtAuthGuard 放行（如登录、健康检查）。
 */
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
