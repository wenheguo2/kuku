/**
 * current-user.decorator.ts — @CurrentUser() 取当前登录用户
 * 从 request.user（由 JwtStrategy.validate 注入）提取 { userId, openid }。
 * 用法：foo(@CurrentUser() user: JwtUser) 或 @CurrentUser('userId') userId: string
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtUser {
  userId: string;
  openid: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof JwtUser | undefined, ctx: ExecutionContext): JwtUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: JwtUser = request.user;
    return data ? user?.[data] : user;
  },
);
