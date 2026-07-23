/**
 * app.module.ts — 根模块
 * 职责：
 *  - ConfigModule 全局读取 .env
 *  - TypeOrmModule 连接 PostgreSQL（工厂见 config/database.config）
 *  - ServeStaticModule 把 production/ 映射到 /static（本地替代 CDN；索引/音频/图片走这里）
 *  - 全局 JwtAuthGuard（默认需登录，@Public 放行）
 *  - 挂载全部业务模块
 */
import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildTypeOrmOptions } from './config/database.config';
import { validateEnvironment } from './config/environment.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { VipGuard } from './common/guards/vip.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { AuthModule } from './modules/auth/auth.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { MembershipAccessModule } from './modules/membership-access/membership-access.module';
import { BillingModule } from './modules/billing/billing.module';
import { ChildrenModule } from './modules/children/children.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { HealthModule } from './modules/health/health.module';
import { HistoryModule } from './modules/history/history.module';
import { ParentModule } from './modules/parent/parent.module';
import { ProgressModule } from './modules/progress/progress.module';
import { TrackModule } from './modules/track/track.module';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    MembershipAccessModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildTypeOrmOptions(config),
    }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          rootPath: join(process.cwd(), config.get<string>('STATIC_ROOT', '../production')),
          serveRoot: '/static',
          serveStaticOptions: { cacheControl: true, maxAge: 86400000 },
        },
      ],
    }),
    AuthModule,
    HealthModule,
    FavoritesModule,
    HistoryModule,
    TrackModule,
    ProgressModule,
    AchievementsModule,
    ParentModule,
    ChildrenModule,
    BillingModule,
    AdminModule,
  ],
  providers: [
    // 全局守卫：先 JWT（填 request.user），再限流，最后 VIP 门控。
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: VipGuard },
  ],
})
export class AppModule {}
