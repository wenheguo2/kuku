# admin/ — 管理后台文档（P1 可运行基线）

> 对应 `admin/src/`。Vue 3 + Element Plus + Vite + Pinia（KD-07）。P1，不阻塞 MVP。
> 当前已接后端独立管理员鉴权和数据库聚合统计；内容管理仍是静态索引只读浏览。

---

## 结构
| 文件 | 职责 |
|:--|:--|
| `main.ts` | 挂载 Vue + Element Plus + Pinia + Router |
| `App.vue` | 主框架：登录页无侧栏；其余侧栏菜单 + 内容区 |
| `router/index.ts` | ADM-01 登录 / ADM-02 内容 / ADM-03 统计 + 未登录守卫（admin_token） |
| `api/index.ts` | axios：`getStatic` 读 `/static` 索引；`get/post` 调 `/api/v1`（带 admin_token） |
| `views/Login.vue` | ADM-01 登录：调用 `/admin/auth/login`，保存独立短期 token |
| `views/Content.vue` | ADM-02 内容管理：读 `_global.json` 展示学科表（只读） |
| `views/Stats.vue` | ADM-03 数据统计：当日活跃、故事播放、挑战通过、付费转化 |
| `vite.config.ts` | 端口 5173，proxy `/api` 与 `/static` → localhost:3000 |

后端实现位于 `server/src/modules/admin/`：

- `POST /api/v1/admin/auth/login`：账号密码校验并签发 `role=admin` 的 8 小时 JWT。
- `GET /api/v1/admin/stats`：独立 `AdminAuthGuard` 验证后，聚合 `events`、`comprehensive_tests`、`orders`。
- 管理 token 不走普通用户 `JwtStrategy`，也不能访问用户身份接口。

## 运行
```bash
cd admin && npm install && npm run dev   # http://localhost:5173
```

本地默认账号仅用于开发：`admin / admin123`。可在 `server/.env` 设置 `ADMIN_USERNAME`、`ADMIN_PASSWORD` 覆盖。生产必须配置 scrypt 口令：

```powershell
cd server
$env:KUKU_ADMIN_PASSWORD='至少12位的随机管理密码'
npm run admin:hash-password
Remove-Item Env:KUKU_ADMIN_PASSWORD
```

把命令输出写入生产环境的 `ADMIN_PASSWORD_SCRYPT`，不要提交 `.env`。

## 待优化 / 已知
- [x] 后端管理员独立鉴权
- [x] 统计接真实数据库聚合
- [ ] 内容写操作（上下架/封面替换）
- [ ] 多实例部署时把管理登录限流移到 Redis/网关
- [x] `npm run build` 已通过

## 变更记录
| 日期 | 变更 | 原因 |
|:--|:--|:--|
| 2026-07-22 | 新建后台脚手架（登录/内容/统计三视图 + 路由守卫 + api） | Batch 4 落地（P1） |
| 2026-07-23 | 去除假 token 和统计占位；接入独立管理 JWT、scrypt 口令与真实数据库聚合；build 通过 | 落实审查中的后台安全问题 |
| 2026-07-23 | 第四轮走查整改：api 包络解包改 unwrap(data 为 null 时不再回退成整包络,A-05)、Login 登录校验 access_token 存在性(A-06) | 补后台健壮性缺口 |
| 2026-07-23 | 路由守卫本地解码 JWT exp 判过期，过期/无效 token 直接清会话跳登录(A-04) | 避免废 token 进后台壳再吃 401；A-01/02/03 权衡后暂不改 |
| 2026-07-23 | 第五轮(CTO)走查：修复路由守卫 atob 直解 base64url 可抛异常被误判过期的 bug(L-1)，转标准 base64+补 padding 后再解码 | 修复上轮 A-04 引入的登录后可能立即弹回登录页的风险 |