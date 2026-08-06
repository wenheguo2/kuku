import { ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from './auth.service';

const versions = {
  userAgreementVersion: '2026-08-final',
  privacyVersion: '2026-08-final',
  childrenPrivacyVersion: '2026-08-final',
};

describe('AuthService App login', () => {
  function createService(appEnabled = true) {
    const users = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const children = {
      findOne: jest.fn().mockResolvedValue({ id: 'child-1' }),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const consents = { findOne: jest.fn().mockResolvedValue({ id: 'consent-1' }), save: jest.fn(), create: jest.fn() };
    const jwt = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
    const configValues: Record<string, string> = {
      APP_AUTH_ENABLED: String(appEnabled),
      APP_AUTH_PEPPER: 'app-auth-pepper-with-at-least-32-characters',
      USER_AGREEMENT_VERSION: versions.userAgreementVersion,
      PRIVACY_VERSION: versions.privacyVersion,
      CHILDREN_PRIVACY_VERSION: versions.childrenPrivacyVersion,
    };
    const config = { get: jest.fn((key: string, fallback?: string) => configValues[key] ?? fallback) };
    const service = new AuthService(
      users as never,
      children as never,
      consents as never,
      {} as never,
      jwt as never,
      {} as never,
      config as never,
    );
    return { service, users, jwt };
  }

  it('用 HMAC 派生身份登录，不把原始 installation id 存进查询条件', async () => {
    const { service, users, jwt } = createService();
    users.findOne.mockImplementation(async ({ where }: { where: { openid: string } }) => ({
      id: 'user-1', openid: where.openid, nickname: '宝宝家长',
    }));
    const installationId = '2f1d1565-9580-4fbc-b9c6-9d745720c192';
    const result = await service.loginApp(installationId, 'android', versions);
    const queried = users.findOne.mock.calls[0]?.[0]?.where?.openid as string;
    expect(queried).toMatch(/^app_/);
    expect(queried).not.toContain(installationId);
    expect(queried.length).toBeLessThanOrEqual(64);
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 'user-1', openid: queried });
    expect(result.token).toBe('jwt-token');
  });

  it('App 登录开关关闭时明确拒绝，且不影响微信登录路由', async () => {
    const { service } = createService(false);
    await expect(service.loginApp('2f1d1565-9580-4fbc-b9c6-9d745720c192', 'ios', versions))
      .rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
