/**
 * jwt.strategy.ts — passport-jwt 策略
 * 职责：校验 Authorization: Bearer {token}，把 payload { sub, openid } 映射为 request.user { userId, openid }。
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { JwtUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

export interface JwtPayload {
  sub: string; // userId
  openid: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, @InjectRepository(User) private readonly users: Repository<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'dev_secret'),
    });
  }

  /** 返回值挂到 request.user */
  async validate(payload: JwtPayload): Promise<JwtUser> {
    if (payload.role || !payload.openid || !/^\d+$/.test(String(payload.sub))) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    const user = await this.users.findOne({ where: { id: payload.sub, openid: payload.openid } });
    if (!user) throw new UnauthorizedException('登录状态已失效，请重新登录');
    return { userId: payload.sub, openid: payload.openid };
  }
}
