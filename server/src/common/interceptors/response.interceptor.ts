/**
 * response.interceptor.ts — 全局响应拦截器
 * 职责：把 controller 返回的原始 data 统一包成 { code: 0, message: 'success', data }。
 * 权威口径：md/11 §0.3。控制器只需 return 业务数据本身。
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiEnvelope<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiEnvelope<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 0,
        message: 'success',
        data: data ?? null,
      })),
    );
  }
}
