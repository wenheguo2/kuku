import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AdminTokenPayload {
  sub: string;
  role: string;
}

/** 管理端独立鉴权；管理 token 不复用普通用户身份。 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      admin?: AdminTokenPayload;
    }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('缺少管理端登录凭证');

    try {
      const payload = await this.jwt.verifyAsync<AdminTokenPayload>(token);
      if (payload.role !== 'admin' || !payload.sub) throw new Error('invalid admin token');
      request.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('管理端登录已失效');
    }
  }
}
