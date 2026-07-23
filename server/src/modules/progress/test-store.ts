/**
 * test-store.ts — 挑战正确答案临时存储（服务端判分用）
 * 职责：出题时把 test_id → 正确答案 暂存，提交时取出判分。★ 答案不下发前端。
 * 实现：优先 Redis(Memurai，本地已运行)；连接不可用时自动回退进程内 Map。
 *   - Redis 就绪 → SET key JSON EX 1800（30 分钟过期，多实例安全）
 *   - Redis 不可用 → 内存 Map + TTL（单实例可用，日志提示）
 * 方法为 async（Redis 异步）；调用方 progress.service 已 await。
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SecretQuestion } from './quiz.util';

export interface StoredTest {
  kind: 'normal' | 'comprehensive';
  childId: string;
  subject: string;
  wordId?: string;
  wordIds?: string[];
  questions: SecretQuestion[];
  expireAt?: number;
}

const TTL_SEC = 30 * 60;
const KEY_PREFIX = 'kuku:test:';

@Injectable()
export class TestStore implements OnModuleDestroy {
  private readonly logger = new Logger('TestStore');
  private redis: Redis | null = null;
  private redisReady = false;
  private mem = new Map<string, StoredTest>();

  constructor(config: ConfigService) {
    try {
      this.redis = new Redis({
        host: config.get<string>('REDIS_HOST', 'localhost'),
        port: Number(config.get<string>('REDIS_PORT', '6379')),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null, // 不无限重连，失败即回退内存
      });
      this.redis.on('ready', () => { this.redisReady = true; this.logger.log('Redis 已连接，判分答案走 Redis'); });
      this.redis.on('error', () => { if (this.redisReady) this.logger.warn('Redis 连接异常，回退内存'); this.redisReady = false; });
      this.redis.connect().catch(() => {
        this.logger.warn('Redis 不可用，TestStore 回退进程内 Map（单实例可用）');
      });
    } catch {
      this.redis = null;
    }
  }

  async put(testId: string, data: Omit<StoredTest, 'expireAt'>): Promise<void> {
    if (this.redisReady && this.redis) {
      await this.redis.set(KEY_PREFIX + testId, JSON.stringify(data), 'EX', TTL_SEC);
      return;
    }
    this.gcMem();
    this.mem.set(testId, { ...data, expireAt: Date.now() + TTL_SEC * 1000 });
  }

  async get(testId: string): Promise<StoredTest | undefined> {
    if (this.redisReady && this.redis) {
      const raw = await this.redis.get(KEY_PREFIX + testId);
      return raw ? (JSON.parse(raw) as StoredTest) : undefined;
    }
    const t = this.mem.get(testId);
    if (!t) return undefined;
    if ((t.expireAt ?? 0) < Date.now()) {
      this.mem.delete(testId);
      return undefined;
    }
    return t;
  }

  async del(testId: string): Promise<void> {
    if (this.redisReady && this.redis) {
      await this.redis.del(KEY_PREFIX + testId);
      return;
    }
    this.mem.delete(testId);
  }

  private gcMem(): void {
    const now = Date.now();
    for (const [k, v] of this.mem) {
      if ((v.expireAt ?? 0) < now) this.mem.delete(k);
    }
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
  }
}
