---
date: 2026-08-06T00:00:00+08:00
type: repo-research
status: complete
repository: 酷酷儿童故事
---

# Repository Research: 酷酷儿童故事

## Overview

儿童故事、儿歌与启蒙产品仓库，包含 NestJS API、Taro 微信小程序、Vue 管理后台、独立 Expo Android/iOS App，以及静态内容索引/CDN 资产。按用户要求未研究任何 `scripts/` 或 `脚本/` 文件。

## Architecture & Structure

- `server/`：NestJS 10、TypeORM、PostgreSQL、JWT、12 张表。
- `miniapp/`：Taro 3、React 18、Zustand，微信小程序专属工程。
- `admin/`：Vue 3、Element Plus、Vite。
- `app/`：Expo SDK 57、React Native 0.86，Android/iOS 独立工程。
- `production/index/`：静态内容索引；正式媒体由对象存储/CDN 承载。
- `md/`、`开发文档/`、`上线相关/`：产品、代码和部署三层文档。

## Conventions & Patterns

- API 统一 `/api/v1` 与 `{code,message,data}` 包络。
- JWT 默认保护路由，`@Public` 放行；所有 `child_id` 必须归属校验。
- TypeORM `synchronize=false`，DDL 以 `server/src/db/schema.sql` 为准。
- 静态索引/媒体与业务 API 分流。
- release/production 配置 fail-closed；平台认证和支付使用独立开关。
- 代码改动同步 `开发文档/`；契约变化同步 `md/11`；上线流程同步 `上线相关/`。

## Key Insights

- 小程序模拟器覆盖较完整，但不能替代真机、真实登录/支付、后台音频和弱网测试。
- 真实微信支付及 App IAP 都未实现，会员媒体又是公开 URL，付费上线前必须补强。
- App 与小程序不应复用 UI/运行时或发布配置；只共享服务端与 CDN 契约。
- 当前工作树已有多处用户文档/小程序改动，本轮保持并在独立文件或窄范围补丁中工作。

## Recommendations

1. 先完成协议与强媒体门控，再接各平台支付。
2. Android/iOS 先走内部测试/TestFlight，完成真机矩阵后再商店审核。
3. App 完成账号绑定恢复、收藏/历史/搜索/挑战等原生交互后再宣称与小程序功能等价。

## Sources

- `README.md`
- `开发文档/00-代码地图.md`
- `开发文档/server/README.md`
- `md/11-API接口文档.md`
- `md/22-微信开发者工具使用指南.md`
- `md/23-小程序测试与验收报告.md`
- `server/src/`、`miniapp/src/`、`admin/src/`、`app/src/`
