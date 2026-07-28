import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

interface AdminTokenPayload {
  sub: string;
  role: string;
}

/** 管理端独立鉴权；管理 token 不复用普通用户身份，且用独立 ADMIN_JWT_SECRET 验签（开发未配时回退 JWT_SECRET）。 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      admin?: AdminTokenPayload;
    }>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('缺少管理端登录凭证');

    try {
      const payload = await this.jwt.verifyAsync<AdminTokenPayload>(token, {
        secret: this.config.get<string>('ADMIN_JWT_SECRET') || this.config.get<string>('JWT_SECRET'),
      });
      if (payload.role !== 'admin' || !payload.sub) throw new Error('invalid admin token');
      request.admin = payload;
      return true;
    } catch {
      throw new UnauthorizedException('管理端登录已失效');
    }
  }
}
