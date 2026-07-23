/**
 * health.controller.ts — 健康检查
 * GET /api/v1/health → { status:'ok', db:true, time } （经全局拦截器包成 {code:0,...}）
 * @Public 免登录，用于存活探针与联调冒烟。
 */
import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** 健康检查：顺带探测数据库连通性 */
  @Public()
  @Get()
  async check() {
    let db = false;
    try {
      await this.dataSource.query('SELECT 1');
      db = true;
    } catch {
      db = false;
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }
}
