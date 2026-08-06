# Repo research handoff：酷酷儿童故事

> 生成日期：2026-08-06。用于后续继续开发时快速定位；本轮按用户要求跳过 `脚本/`。

## 工程边界

- `app/`：Expo SDK 57 + React Native 0.86，Android/iOS 独立客户端。
- `miniapp/`：Taro 微信小程序，只作为产品、页面与视觉参照。
- `server/`：NestJS API，客户端通过 `/api/v1` 共享业务契约。
- `content/` 与服务端 `/static`：故事、歌曲、成长索引及音频/封面。
- `admin/`：管理端，不参与 App 运行时。

App 不导入小程序代码或配置。视觉图标已复制成 `app/src/assets/embeddedImages.ts` 与 `app/src/components/Icon.tsx` 内的 App 自有资源；账号使用 `POST /auth/app/login`，支付未来必须走 Apple/Google IAP。

## App 代码地图

- `app/App.tsx`：四 Tab、App 内页面路由、播放器常驻层。
- `app/src/screens/StoryScreen.tsx`：故事首页、目录与章节。
- `app/src/screens/SongScreen.tsx`：43 类歌曲目录及整歌单入队。
- `app/src/screens/GrowthScreen.tsx`：成长首页与真实词表预览。
- `app/src/screens/ParentScreen.tsx`：登录、权益、家长功能入口、协议与注销。
- `app/src/screens/CommonScreens.tsx`：免费区、搜索、收藏、历史、孩子、设置、会员、课程、收集册、挑战。
- `app/src/state/SessionContext.tsx`：安装会话与 profile；`can_access_all` 是唯一权益门禁。
- `app/src/state/PlayerContext.tsx`：expo-audio、队列、倍速、模式、定时、历史、后台/锁屏。
- `app/src/components/PlayerBar.tsx`：迷你播放器和完整播放器 UI、收藏、歌词、队列。
- `app/src/services/content.ts`：静态索引及故事/歌曲/课程 Track 构造。

## 约定与继续开发注意

1. 发布隔离：小程序只发 `miniapp/`，Android/iOS 只发 `app/`；不得把微信登录、微信订单、AppID/Secret 打入 App。
2. 权益隔离：登录状态不放行内容，只读取服务端 `profile.can_access_all`。
3. 预览隔离：`EXPO_PUBLIC_APP_PREVIEW_ACCESS=entitled` 仅开发视觉验收；release 模式强制忽略。
4. 媒体：故事/歌曲/课程统一转成 `Track`，播放器不要反向依赖某个页面。
5. 后续高优先级：教学场景/timeline、综合挑战、超长列表虚拟化、真机后台与锁屏、Apple/Google IAP、正式协议和商店物料。
6. 验收基准：`md/23-小程序测试与验收报告.md`、`md/09-页面清单与信息架构.md`、`测试/APP自核验_2026-08-06/APP与小程序逐页差异矩阵.md`。
