/**
 * billing.controller.ts — 会员与订单接口（对齐 md/11 §7）
 *  GET  /api/v1/membership            当前会员状态
 *  POST /api/v1/orders                创建订单（发起支付；stub 模式直接开通）
 *  GET  /api/v1/orders                订单列表
 *  GET  /api/v1/orders/:id            订单详情
 *  POST /api/v1/orders/:id/cancel     取消订单
 */
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsIn } from 'class-validator';
import { Repository } from 'typeorm';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Membership, PlanType } from '../../entities/membership.entity';
import { OrdersService } from './orders.service';

class CreateOrderDto {
  @IsIn(['monthly', 'quarterly', 'yearly']) plan_type: PlanType;
}

@Controller('membership')
export class MembershipController {
  constructor(@InjectRepository(Membership) private readonly memberships: Repository<Membership>) {}

  @Get()
  async status(@CurrentUser('userId') userId: string) {
    const m = await this.memberships.findOne({ where: { userId, status: 'active' }, order: { endDate: 'DESC' } });
    if (!m) return { status: 'none' };
    // 过期判定按日期口径(避免最后一天误判) + 读时落库 status→expired
    const expired = new Date(m.endDate) < new Date(new Date().toISOString().slice(0, 10));
    if (expired) await this.memberships.update({ id: m.id, status: 'active' }, { status: 'expired' });
    return {
      status: expired ? 'expired' : 'active',
      plan_type: m.planType,
      start_date: m.startDate,
      end_date: m.endDate,
      auto_renew: m.autoRenew,
    };
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateOrderDto) {
    return this.orders.create(userId, dto.plan_type);
  }

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.orders.list(userId);
  }

  @Get(':id')
  detail(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.orders.detail(userId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.orders.cancel(userId, id);
  }
}
