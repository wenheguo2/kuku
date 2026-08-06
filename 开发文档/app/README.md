# Android / iOS App 工程

> 代码目录：`app/`。这是独立 Expo + React Native 工程，不导入 `miniapp/` 源码、配置或微信 API。

## 1. 边界

| 项目 | Android/iOS App | 微信小程序 |
|---|---|---|
| 工程 | `app/` | `miniapp/` |
| 运行时 | React Native / Expo SDK 57 | Taro / 微信基础库 |
| 登录 | `POST /auth/app/login`，安全存储中的安装凭据 | `POST /auth/login`，`wx.login` code |
| 音频 | `expo-audio`，系统锁屏与后台媒体服务 | Taro BackgroundAudioManager |
| 本地安全存储 | Keychain / Android Keystore | 微信 Storage |
| 支付 | 未开放；后续分别接 Apple/Google IAP | 微信支付（真实通道尚未实现） |
| 构建发布 | EAS Android/iOS profile | 微信开发者工具上传 |

两端只共享公开服务契约：NestJS `/api/v1`、CDN 静态索引与媒体目录。任何客户端专属代码都留在自己的工程中。

## 2. 当前功能

- 四 Tab：故事、歌曲、成长、家长；底栏与常用入口使用复制到 App 内的小程序原插画资源，不存在运行时目录耦合。
- 故事首页含免费/权益两套 Hero、50 个免费故事、章回推荐、每日推荐和 9 个学科；歌曲页含免费/权益 Hero、43 类歌单。
- 免费专区、故事/歌曲/成长搜索、收藏、历史、孩子档案、设置、权益说明、识字/英语课程、朋友收集册与友情挑战独立页面。
- 完整播放器：五档倍速、收藏、15/30/60 分钟定时、播放队列、上下首、三种播放模式、前后 15 秒、纯文本歌词、系统分享。
- 原生音频、后台播放、Android 媒体前台服务、iOS audio background mode、锁屏元数据。
- 独立 App 设备会话登录；安装标识只保存在系统安全存储，服务端保存 HMAC 派生身份。
- `profile.can_access_all` 是唯一权益门禁：非权益显示免费 Hero 且成长前 10 课免费，权益用户替换为全库 Hero 并开放全部课程。
- 成长总览、会员权益只读展示、退出登录、永久账号注销。
- 监护人协议不默认勾选；版本号随登录请求留痕。

这是可构建的 App MVP，不等于已具备商店上架资格。缺口见 `md/审核归档/2026-08-06-代码审查与APP实施报告.md`。

## 3. 本地运行

要求 Node.js 22.13+（Expo SDK 57 基线）。

```powershell
cd app
Copy-Item .env.example .env
npm install
npm run type-check
npm run doctor
npm start
```

真机不能使用电脑自身的 `localhost`。本地联调请给 `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_STATIC_BASE_URL` 配置真机可访问的 HTTPS 测试域名；不要在正式包里放局域网 HTTP 地址。

后端开发环境要显式启用 App 登录：

```env
APP_AUTH_ENABLED=true
APP_AUTH_PEPPER=至少32位随机值_只放服务端
```

## 4. 分平台后端开关

### 只发布小程序

```env
WEAPP_AUTH_ENABLED=true
APP_AUTH_ENABLED=false
WECHAT_PAY_ENABLED=false
```

### 只发布 Android/iOS App

```env
WEAPP_AUTH_ENABLED=false
APP_AUTH_ENABLED=true
APP_AUTH_PEPPER=<至少32位随机值>
WECHAT_PAY_ENABLED=false
```

### 同一 API 服务同时支持两端

```env
WEAPP_AUTH_ENABLED=true
APP_AUTH_ENABLED=true
APP_AUTH_PEPPER=<至少32位随机值>
WECHAT_PAY_ENABLED=false
```

`WECHAT_PAY_ENABLED` 只属于小程序微信支付；不得为 App 内购复用。App Store / Google Play 的商品、票据验证、退款与权益同步需要独立实现。

## 5. 验证

```powershell
cd app
npm run type-check
npm run doctor
$env:EXPO_NO_TELEMETRY='1'; $env:CI='1'; npm run export
```

2026-08-06 已验证：TypeScript 0 错误、Expo Doctor 20/20、Android 与 iOS Metro/Hermes bundle 均导出成功。

本机没有 Android SDK/模拟器，也不是 macOS/Xcode 环境，因此交互走查使用 Expo Web；真机后台/锁屏、系统分享、安全存储和商店内购不能用 Web 结果替代。逐页差异、操作记录和截图见 `测试/APP自核验_2026-08-06/`。

仅开发验收可设置：

```env
EXPO_PUBLIC_APP_PREVIEW_ACCESS=entitled
```

该值只模拟权益展示，不能代替真实登录；当 `EXPO_PUBLIC_APP_RELEASE=true` 时会被强制忽略。

## 6. 关键文件

| 文件 | 职责 |
|---|---|
| `app.config.ts` | Android/iOS 标识、后台音频、release fail-closed 校验 |
| `eas.json` | Android APK/AAB 与 iOS preview/production 独立 profile |
| `src/state/SessionContext.tsx` | App 会话、登录、注销 |
| `src/state/PlayerContext.tsx` | 原生音频与锁屏控制 |
| `src/services/content.ts` | CDN 索引、故事和歌曲地址 |
| `src/assets/embeddedImages.ts` | App 自有的插画 Tab 与常用功能图标副本 |
| `src/components/Icon.tsx` | App 自有的动作 SVG 图标路径 |
| `src/screens/*` | 四条主页面线与 App 独立功能页 |

参考：Expo SDK 57、`expo-audio` 和 EAS Build 使用方式以 Expo 官方文档为准。
