import { validateEnvironment } from './environment.validation';

describe('validateEnvironment', () => {
  it('开发环境允许显式 mock/stub', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'development',
      WX_LOGIN_MODE: 'mock',
      ALLOW_MOCK_LOGIN: 'true',
      ALLOW_PAYMENT_STUB: 'true',
    })).not.toThrow();
  });

  it('启用 App 登录时拒绝缺失或过短的派生密钥', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'development',
      APP_AUTH_ENABLED: 'true',
      APP_AUTH_PEPPER: 'short',
    })).toThrow(/APP_AUTH_PEPPER/);
  });

  it('未启用 App 登录时不要求 App 密钥，避免阻塞纯小程序部署', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'development',
      APP_AUTH_ENABLED: 'false',
    })).not.toThrow();
  });

  it('App-only production 不要求微信 AppID 或微信支付凭据', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      WEAPP_AUTH_ENABLED: 'false',
      APP_AUTH_ENABLED: 'true',
      APP_AUTH_PEPPER: 'app-auth-pepper-with-at-least-32-characters',
      WECHAT_PAY_ENABLED: 'false',
      ALLOW_MOCK_LOGIN: 'false',
      ALLOW_PAYMENT_STUB: 'false',
      JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
      DB_PASSWORD: 'a-strong-production-db-password',
      ADMIN_USERNAME: 'ops-admin',
      ADMIN_PASSWORD_SCRYPT: `scrypt$${'ab'.repeat(16)}$${'cd'.repeat(64)}`,
      ADMIN_JWT_SECRET: 'an-independent-admin-secret-32-chars-min',
      USER_AGREEMENT_VERSION: '2026-08-final',
      PRIVACY_VERSION: '2026-08-final',
      CHILDREN_PRIVACY_VERSION: '2026-08-final',
    })).not.toThrow();
  });

  it('release 禁止 mock/stub 和弱密钥', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      WX_LOGIN_MODE: 'mock',
      ALLOW_MOCK_LOGIN: 'true',
      ALLOW_PAYMENT_STUB: 'true',
      JWT_SECRET: 'dev_secret',
    })).toThrow(/环境配置校验失败/);
  });

  it('凭据和最终协议版本齐全时可通过 production 环境门禁', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      WX_LOGIN_MODE: 'real',
      ALLOW_MOCK_LOGIN: 'false',
      ALLOW_PAYMENT_STUB: 'false',
      JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
      DB_PASSWORD: 'a-strong-production-db-password',
      WX_APPID: 'wx-app-id',
      WX_SECRET: 'wx-secret',
      WXPAY_MCH_ID: 'merchant-id',
      WXPAY_API_V3_KEY: 'api-v3-key',
      ADMIN_USERNAME: 'ops-admin',
      ADMIN_PASSWORD_SCRYPT: `scrypt$${'ab'.repeat(16)}$${'cd'.repeat(64)}`,
      ADMIN_JWT_SECRET: 'an-independent-admin-secret-32-chars-min',
      USER_AGREEMENT_VERSION: '2026-07-final',
      PRIVACY_VERSION: '2026-07-final',
      CHILDREN_PRIVACY_VERSION: '2026-07-final',
    })).not.toThrow();
  });

  it('production 拒绝 admin 与用户共享同一 JWT 密钥', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      WX_LOGIN_MODE: 'real',
      ALLOW_MOCK_LOGIN: 'false',
      ALLOW_PAYMENT_STUB: 'false',
      JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
      DB_PASSWORD: 'a-strong-production-db-password',
      WX_APPID: 'wx-app-id',
      WX_SECRET: 'wx-secret',
      WXPAY_MCH_ID: 'merchant-id',
      WXPAY_API_V3_KEY: 'api-v3-key',
      ADMIN_USERNAME: 'ops-admin',
      ADMIN_PASSWORD_SCRYPT: `scrypt$${'ab'.repeat(16)}$${'cd'.repeat(64)}`,
      ADMIN_JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
      USER_AGREEMENT_VERSION: '2026-07-final',
      PRIVACY_VERSION: '2026-07-final',
      CHILDREN_PRIVACY_VERSION: '2026-07-final',
    })).toThrow(/ADMIN_JWT_SECRET/);
  });

  it('production 拒绝协议草案版本', () => {
    expect(() => validateEnvironment({
      NODE_ENV: 'production',
      WX_LOGIN_MODE: 'real',
      ALLOW_MOCK_LOGIN: 'false',
      ALLOW_PAYMENT_STUB: 'false',
      JWT_SECRET: 'a-production-secret-with-more-than-32-characters',
      DB_PASSWORD: 'a-strong-production-db-password',
      WX_APPID: 'wx-app-id',
      WX_SECRET: 'wx-secret',
      WXPAY_MCH_ID: 'merchant-id',
      WXPAY_API_V3_KEY: 'api-v3-key',
      ADMIN_USERNAME: 'ops-admin',
      ADMIN_PASSWORD_SCRYPT: `scrypt$${'ab'.repeat(16)}$${'cd'.repeat(64)}`,
      ADMIN_JWT_SECRET: 'an-independent-admin-secret-32-chars-min',
      USER_AGREEMENT_VERSION: '2026-07-draft',
      PRIVACY_VERSION: '2026-07-final',
      CHILDREN_PRIVACY_VERSION: '2026-07-final',
    })).toThrow(/协议版本/);
  });
});
