/**
 * environment.validation.ts — 启动环境门禁
 * 职责：开发/测试允许显式 mock/stub；release/production 禁止弱密钥、mock 登录、
 * 支付 stub 与缺失的真实凭据，防止配置遗漏时 fail-open。
 */
const DEV_SECRETS = new Set(['dev_secret', 'dev_only_change_me_to_a_long_random_secret', '']);

function enabled(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
}

function validAdminScrypt(value: unknown): boolean {
  const [algorithm, saltHex, hashHex] = String(value ?? '').split('$');
  return algorithm === 'scrypt'
    && /^[0-9a-f]{32,}$/i.test(saltHex ?? '')
    && /^[0-9a-f]{128}$/i.test(hashHex ?? '');
}

/** ConfigModule validate 回调：返回原配置；非法生产配置直接阻止应用启动。 */
export function validateEnvironment(raw: Record<string, unknown>): Record<string, unknown> {
  const nodeEnv = String(raw.NODE_ENV ?? 'development');
  const isProduction = nodeEnv === 'production';
  const isRelease = isProduction || enabled(raw.RELEASE_MODE);
  const loginMode = String(raw.WX_LOGIN_MODE ?? (isRelease ? 'real' : 'mock'));
  const allowMockLogin = enabled(raw.ALLOW_MOCK_LOGIN, !isRelease);
  const allowPaymentStub = enabled(raw.ALLOW_PAYMENT_STUB, !isRelease);
  const jwtSecret = String(raw.JWT_SECRET ?? '');
  const errors: string[] = [];

  if (loginMode === 'mock' && !allowMockLogin) errors.push('mock 登录未获 ALLOW_MOCK_LOGIN=true 授权');
  if (loginMode === 'real' && (!raw.WX_APPID || !raw.WX_SECRET)) errors.push('real 登录缺少 WX_APPID/WX_SECRET');

  if (isRelease) {
    if (DEV_SECRETS.has(jwtSecret) || jwtSecret.length < 32) errors.push('JWT_SECRET 必须是至少 32 位的生产随机密钥');
    if (loginMode !== 'real') errors.push('release/production 必须使用 WX_LOGIN_MODE=real');
    if (allowMockLogin) errors.push('release/production 禁止 ALLOW_MOCK_LOGIN');
    if (allowPaymentStub) errors.push('release/production 禁止 ALLOW_PAYMENT_STUB');
    if (!raw.WXPAY_MCH_ID || !raw.WXPAY_API_V3_KEY) errors.push('release/production 缺少微信支付商户号或 APIv3 密钥');
    if (!raw.ADMIN_USERNAME || !validAdminScrypt(raw.ADMIN_PASSWORD_SCRYPT)) {
      errors.push('release/production 必须配置 ADMIN_USERNAME 与 ADMIN_PASSWORD_SCRYPT');
    }
    const agreementVersions = [
      raw.USER_AGREEMENT_VERSION,
      raw.PRIVACY_VERSION,
      raw.CHILDREN_PRIVACY_VERSION,
    ].map((value) => String(value ?? ''));
    if (agreementVersions.some((value) => !value || value.toLowerCase().includes('draft'))) {
      errors.push('release/production 必须配置三份法务定稿协议版本，且不得包含 draft');
    }
  }

  if (errors.length > 0) throw new Error(`环境配置校验失败：${errors.join('；')}`);
  return raw;
}

/** 供登录/支付服务复用的布尔环境变量解析。 */
export function envFlag(value: string | undefined, fallback = false): boolean {
  return enabled(value, fallback);
}
