# 酷酷儿童故事仓库研究与维护交接

## 执行摘要

仓库由 NestJS 后端、Taro 小程序、Vue 管理后台、内容生产脚本与大规模内容资产组成。`md/` 是产品/架构权威口径，`开发文档/` 记录随代码变化的实现状态。当前 server 与 miniapp 可编译；真实发布仍受凭据、资质、内容全量、法务协议和真机验证阻塞。

## 结构与职责

- `server/`：NestJS、TypeORM、PostgreSQL、Redis；统一 `/api/v1` 与 `{code,message,data}`。
- `miniapp/`：Taro 3 + React + TypeScript + Zustand；4 Tab、23 个页面、全局音频播放器。
- `admin/`：Vue 3 管理后台；已接独立管理 JWT 与数据库聚合统计，内容索引仍只读。
- `production/`：索引、音频、图片等内容产物。
- `脚本/`：内容合并、规格化、索引生成与校验。
- `md/`：PRD、架构、API、页面、合规、里程碑。
- `开发文档/`：代码地图、模块说明、外部凭据和本交接文档。

## 关键契约

- 数据库由 SQL 管理，TypeORM `synchronize=false`；当前基线为 12 张表。
- 用户作用域来自 JWT；任何 `child_id` 必须通过 `ChildOwnershipService` 校验。
- 挑战正确答案只存在服务端 TestStore；客户端不得提交 `is_correct`。
- 静态索引/媒体经 CDN 或本地 `/static`，业务数据经 `/api/v1`。
- release/production 必须 fail closed：禁止 mock、支付 stub、示例域名、弱密钥和协议草案。
- 代码改动必须同步更新 `开发文档/`，契约变化还要同步对应 `md/`。

## 主要扩展点

- 微信登录：`server/src/modules/auth/wechat.service.ts`。
- 支付：`server/src/modules/billing/orders.service.ts`；目前只有开发 stub，真实通道尚未实现。
- 题库：`server/src/modules/progress/quiz.util.ts`；当前为合成占位。
- 内容寻址：`miniapp/src/services/indexLoader.ts` 与 `miniapp/src/utils/path.ts`。
- 播放器：`miniapp/src/services/audioPlayer.ts`；页面只订阅/解绑，不拥有全局实例生命周期。

## 风险与后续优先级

1. PostgreSQL 已补建 `consent_records`，12 表基线与 15 项 e2e 已通过。
2. 外部凭据到位后实现真实支付，不得把开发 stub 带入生产。
3. 协议法务定稿后更新客户端版本常量，并保留历史同意记录。
4. 内容全量完成后跑索引/路径校验与真实音频抽测。
5. 用真实 AppID/合法域名完成微信开发者工具和多机型真机回归。

## 验证命令

```bash
cd server
npm run build
npm test -- --runInBand
npm run test:e2e

cd ../miniapp
npm run type-check
npm run build:weapp
```
