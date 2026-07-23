/**
 * database.config.ts — TypeORM 连接配置工厂
 * 职责：从 ConfigService 读取 PG 连接参数，返回 TypeOrmModuleOptions。
 * ★ synchronize=false：表由 src/db/schema.sql 建立（md/08 §2.2），实体仅映射不改表。
 */
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ALL_ENTITIES } from '../entities';

export function buildTypeOrmOptions(config: ConfigService): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<string>('DB_PORT', '5432')),
    username: config.get<string>('DB_USER', 'kuku_app'),
    password: config.get<string>('DB_PASSWORD', 'kuku2026'),
    database: config.get<string>('DB_NAME', 'kuku_stories'),
    entities: ALL_ENTITIES,
    synchronize: false,
    logging: ['error', 'warn'],
  };
}
