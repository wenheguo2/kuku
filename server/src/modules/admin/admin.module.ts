import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComprehensiveTest } from '../../entities/comprehensive-test.entity';
import { Event } from '../../entities/event.entity';
import { Order } from '../../entities/order.entity';
import { AuthModule } from '../auth/auth.module';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Event, Order, ComprehensiveTest]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthGuard],
})
export class AdminModule {}
