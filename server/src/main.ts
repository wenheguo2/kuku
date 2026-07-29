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
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createWebpCompatMiddleware } from './common/dev/webp-compat';
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
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // 静态资源必须 cross-origin：小程序渲染层/CDN 场景下 Image 加载不同源，same-site 会被内核按 CORP 拦截
    // （实测：开发者工具 getImageInfo(原生管线)成功但 Image 组件全空白，根因即此头）；业务 API 仍 same-site
    res.setHeader('Cross-Origin-Resource-Policy', (req.path || '').startsWith('/static/') ? 'cross-origin' : 'same-site');
    next();
  });

  const corsOrigins = (config.get<string>('CORS_ORIGINS', '') || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  // 开发期 webp→png 兼容：微信开发者工具模拟器不解码 webp（真机支持），仅拦 wechatdevtools UA；
  // 需在 listen 前挂载才能排在 ServeStaticModule 路由之前（其在 init 阶段才注册）
  if (!isProduction) {
    const staticRoot = join(process.cwd(), config.get<string>('STATIC_ROOT', '../production'));
    app.use(createWebpCompatMiddleware(staticRoot, join(process.cwd(), '.webp-cache')));
    // 开发期索引 JSON 禁缓存：无 Cache-Control 时浏览器启发式缓存会让索引更新后 h5 仍读旧内容（实测教训）
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.path && req.path.startsWith('/static/index/')) res.setHeader('Cache-Control', 'no-cache');
      next();
    });
  }
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
