# 06 · Android App 发布、验收与回滚

> 只处理 `app/` 的 Android 包。不要执行小程序构建，也不要配置微信 AppID。

## 一、上线前阻断门槛

- [ ] 法务三份协议已定稿，App 内正文已替换草案。
- [ ] 已准备正式应用图标、启动图、截图、隐私政策 URL 和客服联系方式。
- [ ] `https://` API/CDN 已备案并可从公网访问。
- [ ] 后端 `APP_AUTH_ENABLED=true`、`WEAPP_AUTH_ENABLED` 按实际部署设置、`WECHAT_PAY_ENABLED=false`。
- [ ] 已解决会员媒体公开 URL 可绕过软门控问题，或明确本版仅发布免费内容。
- [ ] 如售卖会员，已完成 Google Play Billing、服务端 purchase token 校验、退款/撤销同步；当前代码尚未实现，不能开启付费商品。
- [ ] 至少两台 Android 真机完成弱网、锁屏、耳机拔出、来电中断和账号注销测试。

## 二、生产环境

在 EAS 的 `production` environment 配置，禁止把密钥写入 `EXPO_PUBLIC_*`：

```env
EXPO_PUBLIC_APP_RELEASE=true
EXPO_PUBLIC_API_BASE_URL=https://api.你的域名/api/v1
EXPO_PUBLIC_STATIC_BASE_URL=https://cdn.你的域名
EXPO_PUBLIC_AGREEMENTS_FINAL=true
EXPO_PUBLIC_USER_AGREEMENT_VERSION=2026-08-final
EXPO_PUBLIC_PRIVACY_VERSION=2026-08-final
EXPO_PUBLIC_CHILDREN_PRIVACY_VERSION=2026-08-final
```

`EXPO_PUBLIC_*` 会打进客户端，只能放公开配置。

## 三、构建

```powershell
cd app
npm ci
npm run type-check
npm run doctor

# 内测 APK
eas build --platform android --profile preview-android

# Google Play AAB
eas build --platform android --profile production-android
```

正式构建前递增 `app.config.ts` 的 `android.versionCode` 和产品版本号。

## 四、验收

- 冷启动无白屏；四 Tab 可切换。
- 推荐、章回目录、歌曲目录可从 CDN 加载。
- 播放/暂停/切后台/锁屏控制正常，媒体通知标题与封面正确。
- 监护人勾选默认关闭；不同意不能登录。
- App 登录不依赖微信；重启 App 会话可恢复。
- 成长数据、会员只读状态、永久注销正常。
- 卸载重装会生成新设备会话；当前版本没有跨设备账号找回，必须在商店说明或在正式版前补账号绑定。
- Android 7+、目标 API 36 的代表设备覆盖完成。

## 五、发布与回滚

先发 Google Play 内部测试，再封闭测试，最后分阶段发布。出现 P0 时在 Play Console 暂停 rollout；修复后递增 `versionCode` 构建新 AAB。已安装版本无法“覆盖回滚”为更低版本号。

回滚只操作 Android App 渠道，不回滚 `miniapp/dist`。若是共享后端契约问题，先保持旧 API 兼容，再分别发布各端修复。
