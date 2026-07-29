/**
 * webp-compat.ts — 开发期 webp→png 兼容中间件（仅微信开发者工具 UA 生效）
 * 背景：微信开发者工具「模拟器」不解码 webp（真机支持，Image 加 webp 属性也无效，
 *   getImageInfo:fail invalid 实测），封面/场景/立绘全为 webp 致 IDE 里全空白。
 * 方案：对 UA 含 wechatdevtools 的 GET /static/**.webp 请求，用 ffmpeg 现场转 png
 *   （磁盘缓存，二次命中零开销）返回；h5 浏览器与真机 UA 不命中，仍走原 webp。
 * 仅开发期挂载（main.ts NODE_ENV!==production 判断），生产不引入此路径。
 */
import { execFile } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { join } from 'path';
import type { Request, Response, NextFunction } from 'express';

export function createWebpCompatMiddleware(staticRoot: string, cacheDir: string) {
  fs.mkdirSync(cacheDir, { recursive: true });
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();
    const url = req.path || req.url || '';
    if (!/^\/static\/.+\.webp$/i.test(url)) return next();
    const ua = String(req.headers['user-agent'] || '');
    if (!/wechatdevtools/i.test(ua)) return next();

    let rel: string;
    try { rel = decodeURIComponent(url.replace(/^\/static\//, '')); } catch { return next(); }
    // 路径穿越防护：解码后不得含 .. 段
    if (rel.split('/').some((seg) => seg === '..')) return next();
    const src = join(staticRoot, rel);
    if (!fs.existsSync(src)) return next();

    const out = join(cacheDir, createHash('md5').update(rel).digest('hex') + '.png');
    const send = () => {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      fs.createReadStream(out).pipe(res);
    };
    if (fs.existsSync(out)) return send();
    execFile('ffmpeg', ['-y', '-i', src, out], { windowsHide: true }, (err) => {
      if (err || !fs.existsSync(out)) return next(); // 转码失败回退原 webp（至少网络层不 404）
      send();
    });
  };
}
