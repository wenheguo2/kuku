import { ExecutionContext, HttpException } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

function context(path: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ path, method: 'POST', ip: '127.0.0.1', user: undefined }),
    }),
  } as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('登录接口每分钟超过 20 次返回 429', () => {
    const guard = new RateLimitGuard();
    for (let i = 0; i < 20; i += 1) expect(guard.canActivate(context('/api/v1/auth/login'))).toBe(true);
    expect(() => guard.canActivate(context('/api/v1/auth/login'))).toThrow(HttpException);
  });
});
