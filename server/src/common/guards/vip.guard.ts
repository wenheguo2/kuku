/**
 * vip.guard.ts — 会员门控守卫（全局，在 JwtAuthGuard 之后运行）
 * 仅对带 @Vip() 的路由生效：非会员 → 403（前端据此展示锁定预览+开通提示）。
 * 依赖 request.user（由 JwtStrategy 注入）与 MembershipAccessService。
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_VIP_KEY } from '../decorators/vip.decorator';
import { MembershipAccessService } from '../../modules/membership-access/membership-access.service';

@Injectable()
export class VipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membership: MembershipAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isVip = this.reflector.getAllAndOverride<boolean>(IS_VIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!isVip) return true; // 非会员专属路由，放行

    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req.user?.userId;
    if (userId && (await this.membership.isActive(userId))) return true;
    throw new ForbiddenException('该功能为会员专属，开通会员即可解锁');
  }
}
