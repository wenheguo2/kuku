/**
 * all-exceptions.filter.ts — 全局异常过滤器
 * 职责：把所有异常统一成 { code, message, data: null }。
 * code 取 HTTP 状态码（对齐 md/11 §0.4：400/401/403/404/429/500）；data 恒为 null。
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const m = (res as Record<string, unknown>).message;
        message = Array.isArray(m) ? m.join('; ') : String(m ?? exception.message);
      }
    } else if (exception instanceof Error) {
      // 内部异常原文只进服务端日志，避免向客户端泄漏 SQL、路径或凭据上下文。
      message = '服务器繁忙，请稍后重试';
      this.logger.error(exception.stack);
    }

    // 业务码直接采用 HTTP 状态码（0 仅用于成功）
    response.status(status).json({ code: status, message, data: null });
  }
}
