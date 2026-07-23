/**
 * auth.module.ts — 认证模块
 * 提供：JWT 签发/校验、微信登录、用户信息。导出 JwtModule 供全局守卫使用。
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildProfile } from '../../entities/child-profile.entity';
import { Membership } from '../../entities/membership.entity';
import { User } from '../../entities/user.entity';
import { ConsentRecord } from '../../entities/consent-record.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { UserController } from './user.controller';
import { WechatService } from './wechat.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ChildProfile, Membership, ConsentRecord]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev_secret'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService, WechatService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
