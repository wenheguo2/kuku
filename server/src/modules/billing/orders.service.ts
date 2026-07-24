/**
 * orders.service.ts — 订单与会员开通业务
 * 权威口径：md/11 §7。★ 支付为 stub：WXPAY_MCH_ID 为空时（未申请商户号），
 * 开发/测试且显式允许 stub 时返回联调 pay_params 并开通会员；
 * release/production 或仅填凭据但真实通道未实现时 fail closed，不伪造支付参数。
 * 真商户号到位后：createOrder 只下单返回真实 pay_params，由微信支付回调 markPaid() 开通会员。
 * 见 开发文档/待办-外部凭据清单.md。
 */
import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { Membership, PlanType } from '../../entities/membership.entity';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { envFlag } from '../../config/environment.validation';
import { addMonths, PLAN_MONTHS, PLAN_PRICE } from './pricing';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Membership) private readonly memberships: Repository<Membership>,
    private readonly config: ConfigService,
  ) {}

  private isStub(): boolean {
    return !this.config.get<string>('WXPAY_MCH_ID');
  }

  private allowStub(): boolean {
    const isRelease = this.config.get<string>('NODE_ENV') === 'production'
      || envFlag(this.config.get<string>('RELEASE_MODE'));
    return envFlag(this.config.get<string>('ALLOW_PAYMENT_STUB'), !isRelease);
  }

  /** 创建订单（发起支付）。stub 模式下直接开通会员便于联调。 */
  async create(userId: string, planType: PlanType) {
    if (!(planType in PLAN_PRICE)) throw new BadRequestException('无效套餐');
    if (!this.isStub()) {
      // 凭据存在不等于真实支付已接入；在统一下单/签名/回调验签实现前必须明确失败。
      throw new ServiceUnavailableException('真实微信支付通道尚未接入，请稍后再试');
    }
    if (!this.allowStub()) {
      throw new ServiceUnavailableException('微信支付尚未配置，当前环境禁止支付 stub');
    }
    const amount = PLAN_PRICE[planType];
    const orderNo = `ORD${Date.now()}${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    let order = await this.orders.save(
      this.orders.create({
        userId,
        orderNo,
        planType,
        amount: amount.toFixed(2),
        paymentChannel: 'wechat',
        status: 'pending',
      }),
    );

    const payParams = {
      timeStamp: String(Math.floor(Date.now() / 1000)),
      nonceStr: Math.random().toString(36).slice(2),
      package: 'prepay_id=STUB_' + orderNo,
      signType: 'RSA',
      paySign: 'STUB_SIGN',
      _stub: true,
    };

    // stub：无真实商户号，直接置已支付 + 开通会员（联调用）
    order = await this.markPaid(orderNo);

    return {
      order_no: order.orderNo,
      plan_type: planType,
      amount,
      status: order.status,
      pay_params: payParams,
    };
  }

  /** 标记订单已支付并开通/续期会员（真实场景由微信支付回调调用）。
   *  事务 + 行锁：先锁订单行保证同单幂等，再锁用户行串行化同一用户的并发续期，
   *  避免多笔订单并发时“读-算-写”竞态导致时长叠加丢失或重复建会员。 */
  async markPaid(orderNo: string): Promise<Order> {
    return this.orders.manager.transaction(async (em) => {
      // 锁订单行：同一 orderNo 并发回调只续期一次（幂等）
      const order = await em.findOne(Order, { where: { orderNo }, lock: { mode: 'pessimistic_write' } });
      if (!order) throw new NotFoundException('订单不存在');
      if (order.status === 'paid') return order;

      // 锁用户行：串行化该用户的所有会员续期（防并发叠加丢失 / 重复建会员）
      await em.findOne(User, { where: { id: order.userId }, lock: { mode: 'pessimistic_write' } });

      order.status = 'paid';
      order.paidAt = new Date();
      await em.save(order);

      // 续期：从当前有效期末或今天起加对应月数
      const active = await em.findOne(Membership, {
        where: { userId: order.userId, status: 'active' },
        order: { endDate: 'DESC' },
      });
      // ★ 与 membership-access.isActive 同自然日口径：endDate >= 今日则仍有效，到期当天续期从 endDate 起算不丢当天时长
      const today = new Date(new Date().toISOString().slice(0, 10));
      const stillValid = !!active && new Date(active.endDate) >= today;
      const base = stillValid ? new Date(active!.endDate) : new Date();
      const endDate = addMonths(base, PLAN_MONTHS[order.planType]);

      if (active) {
        active.endDate = endDate;
        active.planType = order.planType;
        await em.save(active);
      } else {
        await em.save(
          em.create(Membership, {
            userId: order.userId,
            planType: order.planType,
            status: 'active',
            startDate: new Date().toISOString().slice(0, 10),
            endDate,
            autoRenew: false,
          }),
        );
      }
      return order;
    });
  }

  async list(userId: string) {
    const rows = await this.orders.find({ where: { userId }, order: { createdAt: 'DESC' } });
    return { total: rows.length, list: rows.map((o) => this.toDto(o)) };
  }

  async detail(userId: string, id: string) {
    const o = await this.orders.findOne({ where: { id, userId } });
    if (!o) throw new NotFoundException('订单不存在');
    return this.toDto(o);
  }

  async cancel(userId: string, id: string) {
    const o = await this.orders.findOne({ where: { id, userId } });
    if (!o) throw new NotFoundException('订单不存在');
    if (o.status !== 'pending') throw new BadRequestException('仅待支付订单可取消');
    o.status = 'cancelled';
    await this.orders.save(o);
    return { success: true };
  }

  private toDto(o: Order) {
    return {
      order_id: o.id,
      order_no: o.orderNo,
      plan_type: o.planType,
      amount: Number(o.amount),
      status: o.status,
      paid_at: o.paidAt,
      created_at: o.createdAt,
    };
  }
}
