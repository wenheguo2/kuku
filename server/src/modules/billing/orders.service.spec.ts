import { ServiceUnavailableException } from '@nestjs/common';
import { OrdersService } from './orders.service';

function serviceWith(env: Record<string, string | undefined>): OrdersService {
  const config = { get: (key: string) => env[key] };
  return new OrdersService({} as never, {} as never, config as never);
}

describe('OrdersService 支付门禁', () => {
  it('production 未配置支付时拒绝开发 stub', async () => {
    const service = serviceWith({
      NODE_ENV: 'production',
      WECHAT_PAY_ENABLED: 'true',
      ALLOW_PAYMENT_STUB: 'false',
    });
    await expect(service.create('1', 'yearly')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('只有商户凭据但真实通道未实现时明确失败，不返回伪支付参数', async () => {
    const service = serviceWith({
      NODE_ENV: 'production',
      WECHAT_PAY_ENABLED: 'true',
      WXPAY_MCH_ID: 'merchant-id',
      ALLOW_PAYMENT_STUB: 'false',
    });
    await expect(service.create('1', 'yearly')).rejects.toThrow('真实微信支付通道尚未接入');
  });

  it('production 可关闭微信支付而不影响内容服务启动', async () => {
    const service = serviceWith({
      NODE_ENV: 'production',
      WECHAT_PAY_ENABLED: 'false',
    });
    await expect(service.create('1', 'yearly')).rejects.toThrow('微信支付通道未开放');
  });
});
