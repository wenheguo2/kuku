/**
 * app.e2e-spec.ts — 核心链路集成测试（supertest + 真实 PG/Redis）
 * 覆盖：登录(自动建默认档案) → 未登录 401 → 学习 0→1 → 取题(★不含答案) → 收藏 → 下单(stub)开通会员 → 注销清理。
 * 用唯一 mock code 派生独立测试用户，跑完 DELETE /user 清理，不污染数据。
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';

describe('酷酷后端 e2e — 核心链路', () => {
  let app: INestApplication;
  let http: any;
  let token: string;
  let childId: string;
  let otherToken: string;
  let otherChildId: string;
  const uniqueCode = `e2e_${Date.now()}`; // 独立测试用户
  const loginConsent = {
    guardian_consent: true,
    user_agreement_version: '2026-07-draft',
    privacy_version: '2026-07-draft',
    children_privacy_version: '2026-07-draft',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
    http = app.getHttpServer();
  });

  afterAll(async () => {
    // 清理测试用户及名下全部数据
    if (token) {
      await request(http).delete('/api/v1/user').set('Authorization', `Bearer ${token}`).send({ confirm: true });
    }
    if (otherToken) {
      await request(http).delete('/api/v1/user').set('Authorization', `Bearer ${otherToken}`).send({ confirm: true });
    }
    await app.close();
  });

  it('登录（mock）→ 返回 token + 自动建默认档案', async () => {
    const res = await request(http)
      .post('/api/v1/auth/login')
      .send({ code: uniqueCode, ...loginConsent })
      .expect(201);
    expect(res.body.code).toBe(0);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.default_child_id).toBeTruthy();
    token = res.body.data.token;
    childId = res.body.data.default_child_id;
  });

  it('未明确同意监护人协议 → 400', async () => {
    const res = await request(http).post('/api/v1/auth/login').send({ code: `${uniqueCode}_no_consent` });
    expect(res.body.code).toBe(400);
  });

  it('不能读取其他账号 child_id 的成长数据 → 404', async () => {
    const other = await request(http)
      .post('/api/v1/auth/login')
      .send({ code: `${uniqueCode}_other`, ...loginConsent })
      .expect(201);
    otherToken = other.body.data.token;
    otherChildId = other.body.data.default_child_id;

    const res = await request(http)
      .get(`/api/v1/progress/summary?child_id=${otherChildId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.code).toBe(404);
  });

  it('埋点不能伪造其他账号 child_id → 404', async () => {
    const res = await request(http)
      .post('/api/v1/track')
      .set('Authorization', `Bearer ${token}`)
      .send({ event: 'story_play', child_id: otherChildId, properties: { source: 'e2e' } });
    expect(res.body.code).toBe(404);
  });

  it('有埋点记录的孩子档案仍可安全删除', async () => {
    const created = await request(http)
      .post('/api/v1/children')
      .set('Authorization', `Bearer ${token}`)
      .send({ child_name: '待删除测试档案' })
      .expect(201);
    const disposableChildId = created.body.data.child_id;
    await request(http)
      .post('/api/v1/track')
      .set('Authorization', `Bearer ${token}`)
      .send({ event: 'story_play', child_id: disposableChildId, properties: { source: 'e2e-delete' } })
      .expect(201);
    await request(http)
      .delete(`/api/v1/children/${disposableChildId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('未带 token 访问受保护接口 → 401', async () => {
    const res = await request(http).get('/api/v1/favorites');
    expect(res.body.code).toBe(401);
  });

  it('提交学习 → current_stage 变为 1（已相识）', async () => {
    const res = await request(http)
      .post('/api/v1/progress/study')
      .set('Authorization', `Bearer ${token}`)
      .send({ child_id: childId, subject: '识字', word_id: 'e2e_的', word_text: '的', study_type: 'study1' })
      .expect(201);
    expect(res.body.data.current_stage).toBe(1);
    expect(res.body.data.stage_name).toBe('已相识');
  });

  it('取普通挑战题 → 4 题且★不含正确答案 correct_option', async () => {
    const res = await request(http)
      .get(`/api/v1/test/quiz/e2e_的?child_id=${childId}&subject=${encodeURIComponent('识字')}&word_text=${encodeURIComponent('的')}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const qs = res.body.data.questions;
    expect(qs).toHaveLength(4);
    // 安全断言：下发前端的题目不能泄漏正确答案
    qs.forEach((q: any) => {
      expect(q.correct_option).toBeUndefined();
      expect(q.options.every((o: any) => o.is_correct === undefined)).toBe(true);
    });
  });

  it('收藏 → 列表可见', async () => {
    await request(http)
      .post('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_type: 'story', content_id: 'e2e/story/1', content_title: 'e2e故事' })
      .expect(201);
    const list = await request(http).get('/api/v1/favorites').set('Authorization', `Bearer ${token}`).expect(200);
    expect(list.body.data.total).toBeGreaterThanOrEqual(1);
  });

  it('非会员访问综合挑战入口 → 403（会员门控）', async () => {
    const res = await request(http)
      .get(`/api/v1/test/comprehensive/auto?child_id=${childId}&subject=${encodeURIComponent('识字')}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.code).toBe(403);
  });

  it('下单年卡（stub）→ 会员开通 active', async () => {
    const order = await request(http)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'yearly' })
      .expect(201);
    expect(order.body.data.amount).toBe(88);
    const mem = await request(http).get('/api/v1/membership').set('Authorization', `Bearer ${token}`).expect(200);
    expect(mem.body.data.status).toBe('active');
    expect(mem.body.data.plan_type).toBe('yearly');
  });

  it('开通会员后访问综合挑战入口 → 放行(200)', async () => {
    const res = await request(http)
      .get(`/api/v1/test/comprehensive/auto?child_id=${childId}&subject=${encodeURIComponent('识字')}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.code).toBe(0);
  });

  it('后台拒绝错误账号密码 → 401', async () => {
    const res = await request(http)
      .post('/api/v1/admin/auth/login')
      .send({ username: 'admin', password: 'wrong-pass' });
    expect(res.body.code).toBe(401);
  });

  it('后台独立登录 → 可读取真实数据库聚合统计', async () => {
    const anonymous = await request(http).get('/api/v1/admin/stats');
    expect(anonymous.body.code).toBe(401);

    const login = await request(http)
      .post('/api/v1/admin/auth/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(201);
    const adminToken = login.body.data.access_token;
    expect(adminToken).toBeTruthy();

    const stats = await request(http)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(stats.body.data.story_plays).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.paid_orders).toBeGreaterThanOrEqual(1);
    expect(stats.body.data.payment_conversion).toBeGreaterThanOrEqual(0);

    const userApi = await request(http)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(userApi.body.code).toBe(401);
  });

  it('账号注销后原 JWT 立即失效 → 401', async () => {
    const oldToken = token;
    await request(http)
      .delete('/api/v1/user')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ confirm: true })
      .expect(200);
    const res = await request(http)
      .get('/api/v1/user/profile')
      .set('Authorization', `Bearer ${oldToken}`);
    expect(res.body.code).toBe(401);
    token = '';
  });
});
