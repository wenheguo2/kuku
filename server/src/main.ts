/**
 * main.ts — 应用入口 (bootstrap)
 * 职责：
 *  - 全局前缀 /api/v1（静态资源 /static 不受影响，见 app.module ServeStaticModule）
 *  - 全局响应拦截器（统一 {code,message,data}）+ 全局异常过滤器
 *  - 全局 ValidationPipe（DTO 校验 + 类型转换）
 *  - 安全响应头（helmet 等价的轻量子集，无额外依赖）
 *  - 开发期开启 CORS，监听 PORT（默认 3000）
 */
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { Request, Response, NextFunction } from 'express';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);

  // 请求体大小限制（防超大 JSON 撑爆存储/带宽；与 track properties 上限配合）
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  const prefix = config.get<string>('API_PREFIX', 'api/v1');
  // 仅对业务接口加前缀；静态资源 /static 由 ServeStaticModule 处理，不走前缀
  app.setGlobalPrefix(prefix);

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 安全响应头：helmet 的必要子集（面向小程序 API，无需额外依赖）。
  const httpInstance = app.getHttpAdapter().getInstance();
  if (typeof httpInstance?.disable === 'function') httpInstance.disable('x-powered-by');
  // 反向代理信任：生产在 nginx/CDN 后需设 TRUST_PROXY(跳数或 true)，否则 request.ip 可被 X-Forwarded-For 伪造绕过限流
  const trustProxy = config.get<string>('TRUST_PROXY');
  if (trustProxy && typeof httpInstance?.set === 'function') {
    httpInstance.set('trust proxy', /^\d+$/.test(trustProxy) ? Number(trustProxy) : trustProxy === 'true' ? true : trustProxy);
  }
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    next();
  });

  const corsOrigins = (config.get<string>('CORS_ORIGINS', '') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  app.enableCors({
    origin: isProduction ? corsOrigins : true,
    credentials: true,
  });

  const port = Number(config.get<string>('PORT', '3000'));
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`[kuku-server] running at http://localhost:${port}/${prefix}`);
}

bootstrap();
