import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { ComprehensiveTest } from '../../entities/comprehensive-test.entity';
import { Event } from '../../entities/event.entity';
import { Order } from '../../entities/order.entity';
import { envFlag } from '../../config/environment.validation';

const scrypt = promisify(scryptCallback);

@Injectable()
export class AdminService {
  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    @InjectRepository(Event) private readonly events: Repository<Event>,
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(ComprehensiveTest) private readonly tests: Repository<ComprehensiveTest>,
  ) {}

  async login(username: string, password: string) {
    const expectedUsername = this.config.get<string>('ADMIN_USERNAME', 'admin');
    const validPassword = await this.verifyPassword(password);
    if (username !== expectedUsername || !validPassword) {
      throw new UnauthorizedException('管理员账号或密码错误');
    }
    return {
      access_token: await this.jwt.signAsync(
        { sub: expectedUsername, role: 'admin' },
        { expiresIn: this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h') },
      ),
      expires_in: this.config.get<string>('ADMIN_JWT_EXPIRES_IN', '8h'),
    };
  }

  async stats() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [
      activeUsers,
      storyPlays,
      challengePasses,
      paidOrders,
      totalOrders,
    ] = await Promise.all([
      this.events.createQueryBuilder('event')
        .select('COUNT(DISTINCT event.user_id)', 'count')
        .where('event.created_at >= :start', { start })
        .getRawOne<{ count: string }>(),
      this.events.count({ where: { eventName: 'story_play', createdAt: MoreThanOrEqual(start) } }),
      this.tests.count({ where: { passed: true, testedAt: MoreThanOrEqual(start) } }),
      this.orders.count({ where: { status: 'paid', createdAt: MoreThanOrEqual(start) } }),
      this.orders.count({ where: { createdAt: MoreThanOrEqual(start) } }),
    ]);

    return {
      date: start.toISOString().slice(0, 10),
      active_users: Number(activeUsers?.count ?? 0),
      story_plays: storyPlays,
      challenge_passes: challengePasses,
      paid_orders: paidOrders,
      payment_conversion: totalOrders > 0 ? Number((paidOrders / totalOrders).toFixed(4)) : 0,
    };
  }

  private async verifyPassword(password: string): Promise<boolean> {
    const encoded = this.config.get<string>('ADMIN_PASSWORD_SCRYPT', '');
    if (encoded) {
      const [algorithm, saltHex, hashHex] = encoded.split('$');
      if (algorithm !== 'scrypt'
        || !/^[0-9a-f]{32,}$/i.test(saltHex ?? '')
        || !/^[0-9a-f]{128}$/i.test(hashHex ?? '')) return false;
      const expected = Buffer.from(hashHex, 'hex');
      const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length) as Buffer;
      return expected.length === actual.length && timingSafeEqual(expected, actual);
    }

    // 仅供本地开发；release/production 启动门禁强制要求 scrypt 值。
    if (this.config.get<string>('NODE_ENV', 'development') === 'production'
      || envFlag(this.config.get<string>('RELEASE_MODE'), false)) {
      return false;
    }
    const devPassword = this.config.get<string>('ADMIN_PASSWORD', 'admin123');
    const expected = Buffer.from(devPassword);
    const actual = Buffer.from(password);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }
}
