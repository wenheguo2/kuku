/**
 * billing.module.ts — 会员与订单模块
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Membership } from '../../entities/membership.entity';
import { Order } from '../../entities/order.entity';
import { MembershipController, OrdersController } from './billing.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Membership])],
  controllers: [MembershipController, OrdersController],
  providers: [OrdersService],
})
export class BillingModule {}
