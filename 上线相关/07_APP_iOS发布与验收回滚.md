# 07 · iOS App 发布、验收与回滚

> 只处理 `app/` 的 iOS 包。不要执行微信开发者工具上传流程。

## 一、上线前阻断门槛

- [ ] Apple Developer 账号、App Store Connect 应用与 `com.kukustory.app` Bundle ID 已建立。
- [ ] 法务协议、隐私政策 URL、儿童类目年龄分级、数据收集声明与客服信息已定稿。
- [ ] 正式图标、启动图、iPhone 截图和审核说明已准备。
- [ ] 后端 App 登录开启，微信小程序认证/支付按独立开关处理。
- [ ] 会员静态媒体强门控已解决，或首版仅发布免费内容。
- [ ] 如售卖数字会员，已使用 Apple In-App Purchase，并完成 App Store Server API/通知与服务端票据校验；当前代码未实现，不能在 App 内引导微信支付或外部购买。
- [ ] 至少两台 iPhone 完成刘海/灵动岛、安全区、锁屏、静音键、耳机、来电中断与注销测试。

## 二、生产配置与构建

生产 `EXPO_PUBLIC_*` 与 Android 使用同一套公开 API/CDN/协议版本，但构建 profile 独立：

```powershell
cd app
npm ci
npm run type-check
npm run doctor

# TestFlight / App Store 包
eas build --platform ios --profile production-ios
```

正式构建前递增 `ios.buildNumber`；营销版本变化时同步递增 `version`。

## 三、TestFlight 验收

- 四 Tab、目录、播放、成长与家长功能完整。
- 锁屏和控制中心显示标题/封面，切后台持续播放。
- 静音模式仍可按用户主动操作播放；音频中断行为符合预期。
- 监护人同意不默认勾选，协议版本留痕成功。
- 账号注销入口无需跳网页即可完成，重新登录不能看到已删除数据。
- App 登录不调用 `wx.login`，不要求安装微信。
- 卸载重装后的账号恢复限制已明确；正式商业版建议增加手机号/Apple/微信开放平台绑定与账号合并。

## 四、提交与回滚

先 TestFlight 内部测试，再外部测试，最后提交 App Review。审核说明中写明：儿童内容、监护人入口、账号注销路径、是否含付费、测试账号/测试步骤。

已发布版本不能降 `buildNumber` 覆盖。发现 P0 时在 App Store Connect 停止分阶段发布或下架当前版本，修复后用更高 `buildNumber` 重新提交。iOS 回滚不触碰小程序版本。
