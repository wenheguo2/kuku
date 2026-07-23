/**
 * rate-limit.guard.ts — 单实例 API 固定窗口限流。
 * 当前一人团队/单实例部署可直接生效；扩为多实例时应把计数迁移到 Redis 或网关。
 */
import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface Bucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const path = String(request.path ?? request.url ?? '');
    const method = String(request.method ?? 'GET');
    const identity = request.user?.userId ? `u:${request.user.userId}` : `ip:${request.ip ?? 'unknown'}`;
    const rule = this.ruleFor(path);
    const key = `${identity}:${method}:${rule.name}`;
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }
    current.count += 1;
    if (current.count > rule.limit) {
      throw new HttpException('请求过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }

  private ruleFor(path: string): { name: string; limit: number } {
    if (path.includes('/auth/login')) return { name: 'login', limit: 20 };
    if (path.includes('/orders')) return { name: 'orders', limit: 20 };
    if (path.includes('/progress') || path.includes('/test')) return { name: 'learning', limit: 60 };
    if (path.includes('/search')) return { name: 'search', limit: 30 };
    return { name: 'other', limit: 100 };
  }

  private prune(now: number): void {
    if (this.buckets.size < 10_000) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}
