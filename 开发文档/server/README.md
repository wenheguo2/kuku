# server/ — 后端模块文档

> 对应 `server/src/`。细粒度见各文件 header + TSDoc（层1）。本文为模块级总览（层2）。
> 权威口径：DDL=md/08 §2.2；API=md/11；判分/养成=md/13。

---

## 基础设施（src/common, config, main, app.module）
| 文件 | 职责 |
|:--|:--|
| `main.ts` | 全局前缀 `/api/v1`、响应拦截器、异常过滤器、ValidationPipe、CORS、安全响应头、请求体≤1MB、TRUST_PROXY(生产按真实 IP 限流)、监听 3000 |
| `app.module.ts` | Config + TypeOrmAsync + ServeStatic(`production/`→`/static`) + 全局 JWT/限流/VIP 守卫 + 启动环境校验 + 12 业务模块 |
| `common/interceptors/response.interceptor.ts` | 统一包络 `{code:0,message:'success',data}` |
| `common/filters/all-exceptions.filter.ts` | 异常 → `{code:HTTP状态码,message,data:null}`；内部异常不向客户端回传原始消息 |
| `common/guards/jwt-auth.guard.ts` | 全局登录守卫，`@Public()` 放行 |
| `common/guards/rate-limit.guard.ts` | 单实例固定窗口限流：登录/订单 20、挑战 60、搜索 30、其他 100 次/分钟；429 |
| `common/decorators/*` | `@Public()` / `@CurrentUser()` |
| `config/database.config.ts` | TypeORM PG 工厂，`synchronize=false` |
| `config/environment.validation.ts` | release/production 门禁：禁用 mock/stub、弱 JWT 和缺凭据的配置 |
| `entities/*` | 12 实体（含 `consent_records`；bigint→string 防精度丢失） |

## auth（认证）
- **文件**：wechat.service（code→openid，mock/real 开关+超时）、auth.service（登录+协议同意留痕+★建默认档案+注销）、jwt.strategy、auth.controller（login/logout）、user.controller（profile/注销）
- **接口**：`POST /auth/login`(@Public) · `POST /auth/logout` · `GET/PUT /user/profile`(手机号脱敏返回・profile 会员读时过期回收) · `DELETE /user` · `POST /user/consent/withdraw`(监护人撤回同意)
- **关键**：登录必须显式提交 `guardian_consent=true` 和三份协议版本；服务端核对 `.env` 期望版本后写入 `consent_records`；★ 登录必建默认 `child_profile`；开发态 `WX_LOGIN_MODE=mock` 免 AppID 联调
- **依赖**：users, consent_records, child_profiles, memberships / JwtModule
- **会话**：普通 logout 为无状态 JWT、前端清除即可；JwtStrategy 每次校验用户仍存在，因此账号注销后旧 token 立即失效。real 登录仍等待 WX_APPID/SECRET

## favorites（收藏，账号共享）
- `GET/POST /favorites` · `DELETE /favorites/:id`；唯一键幂等；上限 500
## history（播放历史，★child_id 隔离）
- `POST /history`(UPSERT) · `GET /history?child_id=` · `DELETE /history/:id|?child_id=`；保留最近 100；child_id 入口先校验当前用户归属
## track（埋点）
- `POST /track`；event_name 前缀推断 event_type（story/song/lesson/parent/system）；可选 child_id 同样校验归属

## admin（独立管理鉴权与统计）
- `POST /admin/auth/login`（Public）：校验独立管理员账号；开发可用本地口令，release/production 强制 scrypt。
- `GET /admin/stats`：仅接受 `role=admin` 的短期管理 JWT；聚合当日活跃、故事播放、挑战通过、已支付订单和付费转化。
- 管理 token 与普通用户 token 分权，前端假 token 已移除。

## progress（★核心：四级朋友养成）
- **文件**：quiz.util（出题+判分+按学科通过标准）、test-store（答案暂存，判分用，★不下发前端）、progress.service（全部业务）、progress.controller（/progress）、test.controller（/test）
- **接口**：`/progress/{summary,study,:subject}` · `/test/{quiz/:word_id GET+POST, comprehensive/auto GET+POST, comprehensive/manual, comprehensive/history}`
- **规则**：学习→已相识(1)；普通挑战通过→好朋友(2)；综合挑战逐字判定 8/10 通过→好伙伴(3)。★ 只升不降·无惩罚·可无限重试：普通挑战未过始终可再试(`can_retry`)、综合挑战答错不回落；已下线间隔复习。
- **判分**：服务端权威。出题存正确答案于 TestStore，提交时判分，题目 payload 无 correct。
- **筛选**：`GET /progress/:subject?stage=` 支持按亲密度级别(current_stage 0/1/2/3)筛选，供课表按级别过滤。
- **分页**：`:subject` 列表 `page_size` 硬上限 100（超出截断），防超大 take 拉大查询(DoS)
- **TODO**：无独立词库/题库表，选项为合成占位，真实词库到位后替换。综合挑战已改为服务端保存答案，客户端只交 `question_id + selected_option`；TestStore 使用 Redis，开发态不可用时回退内存

## achievements（陪伴养成：收集册+贴纸）
- **文件**：achievements.service（读 learning_progress 统计 + 惰性发放里程碑贴纸）、achievements.controller、achievements.module
- **接口**：`GET /achievements/:child_id`（成就列表，@Vip）· `GET /achievements/:child_id/collection`（四级分布，@Vip）
- **规则**：好伙伴数达 10/50/100 → 发 `{学科}小能手/小达人/小专家` 贴纸（幂等）；读时计算，低耦合不改 progress

## membership-access + VIP 门控（付费边界）
- **文件**：`membership-access`(@Global service `isActive`) + `common/guards/vip.guard.ts` + `common/decorators/vip.decorator.ts`
- **规则**：`@Vip()` 路由非会员 → 403（前端展示锁定预览+开通提示）。已门控：**综合挑战 `/test/comprehensive/*`、朋友收集册/成就 `/achievements/*`**（PRD 2.4.2 / 13号 §1.2）。★普通挑战/学习/学科朋友列表**免费**（等级正常变化）
- **vocabulary**：`GET /vocabulary/:word_id`（md/11 §5.2 字词详情，learning_modules 学习1免费/2·3会员；拼音/笔画为占位待词库）
- **已验证**：collection 返回各学科 acquainted/friends/buddies；单元测试 7/7 通过

## parent（家长中心）
- `GET/PUT /parent/settings`（睡眠定时+主题等 settings_json；写入仅接受原始类型值、限键数/键长/值长，防注入内部标志与膨胀）· `GET /parent/progress/{summary,weekly,detail}`；summary 复用 ProgressService（ProgressModule 导出）
## children（孩子档案）
- `GET/POST /children` · `PUT/DELETE /children/:id`；`ChildOwnershipService` 统一归属校验并覆盖历史、成长、挑战、家长统计、成就等 child_id 入口；越权统一 404；删除保护：至少保留 1 个档案(删最后一个→400)
## billing（会员+订单）
- **文件**：pricing（月9.9/季26/年88 + 时长）、orders.service（下单/开通/续期/取消）、billing.controller（membership + orders）
- **接口**：`GET /membership` · `POST /orders` · `GET /orders` · `GET /orders/:id` · `POST /orders/:id/cancel`
- **★支付 stub**：仅开发/测试且 `ALLOW_PAYMENT_STUB=true` 时自动置 paid 联调；release/production 强制禁用，缺配置返回 503
- **会员续期并发安全**：`markPaid` 用事务+行锁（锁订单行保证同单幂等 + 锁用户行串行化同一用户续期），并发多笔订单不丢时长、不重复建会员
- **会员过期读时落库**：查询会员/门控校验时若已过期(按日期口径)，自动将 status active→expired（幂等），保证 DB status 与实际一致、admin 统计不误计
- **TODO（上线阻塞）**：真实统一下单、支付签名、回调验签尚未实现；即使填入商户凭据也会明确返回 503，不会伪造支付参数。拿到商户号/APIv3/证书后继续开发并做沙箱/真机验证。自动续订为 Phase 2

---

## 测试
- **单元测试**（`npm test`，16/16）：题型/判分、生产环境门禁、协议草案阻断、支付 fail-closed、child_id 归属、API 限流
- **e2e 集成测试**（`npm run test:e2e`，15/15）：真实 PG/Redis；覆盖监护人同意、成长/埋点越权、带埋点档案删除、题目不泄露答案、VIP 门控、管理登录/统计与注销后 JWT 失效

## 变更记录
| 日期 | 变更 | 原因 |
|:--|:--|:--|
| 2026-07-22 | 新建后端全模块 + 端到端验证通过 | Batch 1-2 落地（build/start/health/login/progress/order 均验证） |
| 2026-07-22 | 新增 achievements 模块(收集册+贴纸) + quiz 判分单元测试(7/7) | 补齐 md/11 §6.2 接口缺口 + 提质 |
| 2026-07-22 | TestStore 接入 Redis(Memurai)+内存回退；e2e 集成测试 6/6 | 多实例就绪 + 回归保护（均本地无外部依赖） |
| 2026-07-22 | 文档审计修复：贴纸100→小专家、getQuiz 重置 retry、直接挑战置 study1_completed；补 /vocabulary 接口；新增 VIP 门控(综合挑战/收集册/成就)；e2e 8/8 | 对齐 PRD/13号 付费边界与养成规则 |
| 2026-07-23 | 本地库已升级 12 表；child_id/埋点归属、服务端判分、限流、复习到期、注销 JWT、生产门禁；单测 16/16、e2e 13/13、build 通过 | 落实三份审查的 P0/P1 整改 |
| 2026-07-24 | user/profile 会员读时过期回收(对齐 isActive/billing 口径，消除个人页短暂显示“会员有效”)；schema events.child_id 注释“故意不设 ON DELETE·应用层置空” | 落实五视角审查 F5/F13 |
| 2026-07-23 | 管理后台新增独立 JWT/scrypt 登录与数据库聚合统计；e2e 15/15 | 去除后台假 token 和指标占位 |
| 2026-07-23 | main.ts 增安全响应头(helmet 必要子集，X-Content-Type-Options/X-Frame-Options 等，无额外依赖) | 补审查 helmet/安全头缺口 |
| 2026-07-23 | 代码审查 P1/P2 整改：`markPaid` 事务+行锁(并发续期不丢时长)、progress 列表 page_size 上限 100、jwt 401 文案统一(防用户枚举)；type-check 通过 | 补代码审查发现的并发/DoS/枚举缺口 |
| 2026-07-23 | 三份深审整改：复习 review/refresh 改服务端判分(去客户端自报 passed)、挑战结果不回显 correct_option、越权 403→404、admin 类级@Public 收窄为 login、订单号高熵 randomUUID、埋点/请求体上限、手机号脱敏；单测 16/16、type-check 通过 | 落实三份代码审查 H-1/H-04 等安全项 |
| 2026-07-23 | 快项加固：main.ts TRUST_PROXY(限流按真实 IP，修 X-Forwarded-For 伪造绕过)、会员过期读时落库 status→expired(修 status 与实际不一致)；type-check 通过 | 补审查 M-02/M-09 |
| 2026-07-23 | 复审补修：删最后一个孩子档案保护(400)、监护人同意撤回接口 POST /user/consent/withdraw、家长 settings 白名单净化(仅原始类型/限键数长度)；单测 16/16、type-check 通过 | 补复审 H-22/M-24/M-11 |
| 2026-07-23 | 第四轮走查整改：environment.validation 增 DB_PASSWORD 生产门禁(S-16)、orders isStub 冗余判断简化(S-08)、wechat code2session 改 URLSearchParams 避免 secret 拼串(S-09)、achievements 贴纸发放去 N+1(批量查/写,S-04)、history trim 合并为单条 DELETE 子查询(S-07)、progress.summary 改 DB 分组聚合并新增 total_words_friends(S-03+M-6) | 落实第四轮报告可独立闭环项(未依赖外部凭据) |
| 2026-07-23 | 第五轮(CTO)走查整改：getQuiz/comprehensiveAuto 校验 subject 白名单→400(M-2)、getQuiz 仅在非“重试待用”态重置 retryUsed—堵无限重试并消除复习流程副作用(M-1)、submitQuiz 合并为单次 save(L-2)、PUT /user/profile 补 @MaxLength(64/512)(M-3)；type-check 通过 | 落实第五轮报告可独立闭环项 |
| 2026-07-23 | 亲密度温柔化：普通挑战无惩罚可无限重试(submitQuiz 去 retry 上限、can_retry=!passed)、综合挑战去回落(只升不降)；删除整套间隔复习(reviewDue/submitReview/REVIEW_INTERVAL_DAYS + review/due,review/refresh 路由 + 实体 last_reviewed_at/review_due_at/needs_review 三列与 idx_progress_review)；type-check 通过 | 产品决策：低龄陪伴无挫败、不再间隔复习 |
| 2026-07-24 | 第六轮走查整改：progress.service 头注释“重试/回落”改为“只升不降·无限重试”(R1-1/R1-2)、PUT /user/profile 空 body 短路避免 500(R2-2)、addMonths 月末溢出钳到月末(R2-4)、quiz.util 死文档引用改指 README(R1-3)；单测 16/16、type-check 通过 | 落实 2026-07-24 报告 P2/P3 安全闭环项 |
| 2026-07-24 | 安全/合规整改：submitStudy 对 study2/3 加服务端会员门控(注入 MembershipAccessService，非会员 403，N-M1/S2)、comprehensiveManualStart 校验所选字 stage>=2 防 1→3 跳级(S4)、登录同意留痕只认“未撤回”记录+撤回后重登复活/新建(N-M2 合规)；单测 16/16、type-check 通过 | 落实 2026-07-24 报告 P1 付费绕过/合规缺口 |
| 2026-07-24 | 并发/健壮性整改：TestStore 新增原子 take(Lua GET+DEL) 供 submitQuiz/submitComprehensive 领取即失效防双提交重复计分(M3)、成就发放改 orIgnore 防并发撞唯一键 500(M4)、getOrCreate/收藏/历史 写入改 upsert-or-重查除 TOCTOU(L4)、删孩子事务内加锁计数防删到 0(N-L1)、会员续期基准改自然日口径不丢当天时长(L1)、listBySubject 补 subject 白名单(I1/I2)、SubmitQuizDto 补 @ArrayMaxSize(4)(I5)；单测 16/16、type-check 通过 | 落实 2026-07-24 报告 P2/P3 并发与健壮性项 |
