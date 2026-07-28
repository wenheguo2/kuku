# miniapp/ — 前端模块文档

> 对应 `miniapp/src/`。细粒度见各文件 header + TSDoc（层1）。本文为模块级总览（层2）。
> 技术栈：Taro 3.6 + React 18 + TS + SCSS + Zustand（KD-01）。✅ 本轮 `type-check` 通过；真实 AppID/域名/内容到位后仍需真机回归。
> ⚠️ Node 24 下需删除 Taro `webpackbar` 进度条插件（见 config/index.ts webpackChain），否则 ProgressPlugin schema 报错。
> 构建口径：`npm run build:weapp` 用于本地联调；正式提审必须使用 `npm run build:weapp:release`，该命令强制校验真实 AppID、HTTPS 域名、关闭 mock 和协议定稿状态。
> 尺寸口径：Taro `designWidth=750`，代码样式数值按设计稿 375px 的约 2 倍书写；不要把 375 基准数值直接复制进代码。TypeScript 已启用 `noImplicitAny`。

---

## 全局
| 文件 | 职责 |
|:--|:--|
| `app.config.ts` | 4-Tab（故事/歌曲/成长/家长，**custom:true 自定义 TabBar**）+ 24 页面注册 + `requiredBackgroundModes:['audio']` |
| `app.tsx` | 启动恢复登录态 + 应用主题 + 全局 ErrorBoundary(渲染异常兜底防白屏、回首页自救) |
| `config/agreements.ts` | 三份协议版本的前端单一真源，登录留痕与阅读页共同引用 |
| `styles/variables.scss` | 设计令牌（= md/UI设计/design-tokens **v4.0**）：日/**夜间(--night-*)/鎏金(--gold-*)/故事灯(--lamp)/衬线(--font-serif)** CSS 变量；`.theme-dark`=夜间蓝，config 全局注入 |
| `types/content.ts` | ★ 索引数据模型（中文 subject_id + structure_type/display_as/path/cover/entries/sub_categories + HomeIndex/WorkIndex）；SegmentItem 兼容真实产出 start_ms/duration_ms；`NON_STORY_SUBJECT_IDS`(瞎编的歌曲/学科启蒙) 供故事 tab 过滤 |
| `assets/loading.jpg` | 入包加载插画(360×360，44KB，源自 production/.../载入1.png 中心裁剪)；StateView 加载态专用，替换只需同名覆盖并控制 <60KB |
| `assets/avatar.jpg` | 默认小听众头像(128×128，6KB，用户定稿：小程序图标缩图)；故事/歌曲/家长/会员四页 .avatar 共用，weapp 构建自动内联 base64 |

## services（服务层）
| 文件 | 职责 |
|:--|:--|
| `config.ts` | 编译期注入 api/static 地址、`USE_MOCK`、release 标志；release 禁止 mock/example 域名 |
| `api.ts` | Taro.request 封装：15 秒超时、HTTP/业务双层错误、JWT、401 去重跳登录 |
| `storage.ts` | Taro Storage 封装（Token/Child/Theme/睡眠截止时间/播放倍速 RateStore）——小程序无 localStorage |
| `tracker.ts` | 登录、故事播放、付费点击等行为上报；失败不阻断主流程但保留告警 |
| `indexLoader.ts` | 四级索引懒加载；15 秒超时、HTTP/JSON 校验、1 小时 TTL、并发请求合并、手动清缓存、失败回退过期旧缓存(stale-on-error 降级)；USE_MOCK 时返回 mock |
| `audioPlayer.ts` | 全局 FullTrackPlayer：微信端 BackgroundAudioManager（锁屏/后台元数据），其他端 InnerAudioContext；可取消页面订阅、跨页续播、睡眠截止时间、显式 destroy；★倍速 setRate/cycleRate（固定五挡 0.8/0.9/1.0/1.1/1.2，换曲自动保持+持久化+回写 store，低版本基础库静默降级原速） |
| `playbackQueue.ts` | ★ 故事集/歌单续播全局驱动（App 级 initPlaybackQueue 注册一次）：曲终→queueAdvance(按播放模式)→按 type 分派 playStory/playSong；手动 skip(±1)；与播放页存活无关；playStory 用令牌防切曲竞态(丢弃过期加载) |
| `mock.ts` | 全局/分类/segments/歌曲 mock（结构同真实） |
| `songCatalog.ts` | 歌曲 mock 目录(SONG_CATEGORIES/ALL_SONGS)；song/list 与 搜索(song scope) 共用，避免重复维护 |

## utils（可复用算法，纯函数）
| 文件 | 职责 |
|:--|:--|
| `path.ts` | ★ `buildAssetUrl`(中文路径逐段 encodeURIComponent，方式A) / `buildCoverUrl`(封面补 illustrations/ 前缀) / `buildIndexUrl` |
| `lrc.ts` | 歌词双方案：`parseLyrics` 统一入口——含时间标签→lrc 逐句(parseLrc+findLrcIndex 二分)；无标签纯文本→plain 整首；空→none |
| `timeline.ts` | `locateSegment` 按 currentMs 二分定位教学当前段 |

## stores（Zustand）
- `userStore`：login/restore/logout；统一缓存用户与会员状态；401 回调完整清 token、child、会员和播放器状态
- `settingsStore`：主题 system/light/dark（D-06）+ **睡前模式全局夜间** + 可关闭/持久化/跨页生效的睡眠定时
- `playerStore`：迷你播放栏跨页状态 + **故事集/歌单续播队列**（泛化 QueueItem: type/id/audioUrl/lrc/cover）+ **播放模式** playMode(order/repeat-one/repeat-all) + queueAdvance/queueSkip；★`PLAYBACK_RATES=[0.8,0.9,1.0,1.1,1.2]` 倍速挡位单一来源 + playbackRate 展示态(持久化恢复，脏值回退 1.0)
- `tabStore`：当前 Tab（自定义 TabBar 高亮用；各 tab 页 useDidShow setTab）

## hooks
- `useNight`：★ 全局睡前/夜间模式（所有页通用）。每次页面显示重算 isNight，返回根节点类名(`theme-dark`)，并同步小程序页面背景色，避免页面边缘闪白

## components（组件）
- `Icon`：★ 跨端 SVG 图标（SVG→dataURI→Image，28 图标；weapp 不支持 `<use>`，颜色烘焙进 SVG）
- `MiniPlayer`：GL-02 玻璃迷你播放栏（跨页常驻；tab 页上移避让 TabBar，非 tab 页贴底）
- `TabBarV4`：★跨端共享自定义 SVG 底栏实现（书/音符/嫩芽/家庭 + 选中色条 + 夜间换色）；weapp 由 custom-tab-bar 包装注入、h5 由四个 tab 页条件渲染(内置文字 tabbar 已隐藏)；尺寸口径：Icon 内联 style 为物理 px(icon 26)、scss 数值过 pxTransform(栏高 130)
- `StateView`：U-03/04/05 通用状态视图（加载/空/错误+重试），用于收藏/历史/首页/列表/搜索；★加载态用入包插画 `assets/loading.jpg`(44KB)+呼吸动画（兜底图必须入包，弱网时远程图恰好加载不出）

## custom-tab-bar（自定义底栏）
- Taro weapp 约定目录 `src/custom-tab-bar/`（+`app.config` custom:true）；实现已抽到共享组件 `components/TabBarV4`，此处仅包装（h5 端不加载本目录，由 tab 页直接渲染 TabBarV4）

## pages（页面，编号对应 md/09）
| 页面 | ID | 说明 |
|:--|:--|:--|
| story/index | S-01 | 首页推荐聚合：继续收听(历史) + 🔥热点 + 📚大IP章回 + 🎧单篇轮动(换一换) + 学科网格（数据源 _home.json；★学科网格过滤 NON_STORY_SUBJECT_IDS，歌曲/学科启蒙不入故事 tab） |
| story/subject | S-02 | 学科页：分类卡片（subject_index.categories） |
| story/list | S-03/05/06 | 通用浏览：按 structure_type 自适应；长列表每批渲染 50 项，避免千级内容一次挂载；加载/错误/空态接 StateView |
| story/work | S-04 | **章回作品总入口**（如三国演义）：作品信息 + 章节目录 + 从第1章连续播放 |
| story/player | PL-01 | **故事灯**：后台/锁屏整曲播放、字幕（★时间轴自适应：mock 用 start_time/end_time 秒，真实数据按 duration_ms 累计推算近似轴）、历史/埋点、收藏/分享/倍速/定时/列表、队列续播（★续播由全局 playbackQueue 驱动，页面只做展示订阅；★倍速固定五挡循环切换） |
| song/index | M-01 | 音乐厅：Hero + 分类 tiles(可点→song/list) + 最近播放（青绿主题） |
| song/player | PL-02 | 真实 audio/cover + 后台音频；★歌词双方案：有时间标签→LRC 逐句高亮、纯文本→整首限高可滚、拉不到→暂无歌词(拉队列项 lrcUrl，切歌 seq 防竞态)；★接歌单队列：上/下一首(skip) + 播放模式切换(顺序/列表循环/单曲循环) + 倍速五挡循环；mock 才用模拟时钟 |
| song/list | M-02/M-03 | 歌曲分类下钻：分类→歌曲列表→播放器；★点歌将本分类整体设为播放队列(同类续播/循环基础)；当前 mock(共享 songCatalog，与搜索同源)，接真实歌曲索引后替换数据源 |
| growth/index | G-01 | 朋友收集册：四级进度条+图例 + 三学科统计 |
| growth/lesson | G-02/03 | 字词列表 + 学习1(免费) + 学习2/3会员锁 UI + 去挑战；★每字显亲密度级别徽章 + 顶部按亲密度筛选(拉 /progress/:subject 合并 stage)；真实词库仍待内容接入 |
| growth/player | PL-03 | 横屏三区(eland)：场景65%+衬线大字面板+生字金色高亮字幕条 |
| growth/challenge | G-04 | 取题→选答→服务端判分→结果；★无惩罚·未过始终可再试；★一题一屏分步+逐题正误+加载/失败态 | 
| growth/comprehensive | G-05/06 | 综合挑战：自动触发检查→10字作答→服务端逐字判定·只升不降→结果（会员门控；★锁定态话术家长化“请爸爸妈妈帮忙打开”，不对孩子直接曝露付费墙） |
| growth/collection | — | 朋友收集册可视化 + 成就贴纸（会员门控） |
| parent/index | C-01 | 轻奢磨砂：孩子卡 + 本周统计 + 功能行 + 鎏金入口 |
| common/login | A-01 | 狐狸吉祥物 + 微信一键登录/手机号 |
| common/favorites | C-03 | 收藏列表；★故事/歌曲分段 + 歌曲段“循环播放全部收藏歌曲”(设歌单队列+列表循环) |
| common/history | C-04 | 播放历史（child_id 隔离）；★条目可点续播(story→故事灯/song→歌曲)、清空二次确认 |
| common/settings | C-06 | 外观主题 + **睡前模式(定时/手动)+故事灯开关** + 睡眠定时 |
| common/member | A-03 | **鎏金故事书匣**：缓存/刷新真实会员状态 + 三档书匣 + 下单（仅开发 stub 可自动开通） |
| common/search | C-05 | ★按 Tab 隔离检索(scope=story/song/growth 各搜各的不串)：story→_global 学科+_home 作品→学科/作品/播放器；song→songCatalog 标题→歌曲播放器；growth→识字/英语/拼音→课程页；+ StateView |
| common/children | A-02 | 孩子档案 CRUD + 切换 selectedChildId；★删当前选中档案自动切到剩余首个(防悬空) |
| common/agreement | — | 用户协议、隐私政策、儿童个人信息规则草案阅读页；★儿童规则页登录态提供“撤回监护人同意”(二次确认→POST /user/consent/withdraw→登出)；法务定稿前 release 门禁不放行 |
| common/account-delete | A-05 | 二次确认后调用 `DELETE /user`，成功后清理全部本地会话 |

## 待优化 / 已知
- [x] ~~UI v4 典藏绘本 + 全局睡前模式 + 自定义 SVG TabBar~~ 已落地（type-check+weapp 双通）
- [ ] **真实封面/整曲/立绘场景** 依赖内容产出：开发态 `USE_MOCK=true` 封面会 404→柔和底色块；产出后 `USE_MOCK=false` 显示
- [ ] 真机/微信开发者工具回归未做（本机未装开发者工具）：h5 已测 R1-R7 不覆盖 weapp 专属路径——BackgroundAudioManager(后台/锁屏/倍速)、custom-tab-bar 原生注入、wx.login、原生弹窗/页面栈、安全区；装工具后可用 miniprogram-automator 重跑同套脚本
- [ ] 真机验证：自定义 TabBar 切换/夜间换色/安全区；glass/blur 已按 weapp 能力近似(半透实底)
- [ ] 教学真实音频已产出(audio/学科启蒙/…/学习1·2·3/full.mp3)；PL-03 仍 mock 时间轴，接入待真词库/课程索引（F1 工作项）；歌曲真实音频仍待产出
- [ ] 真实音频联调验收环境：`dist-h5/`(USE_MOCK=false 产物) + 本地 server，截图存 工作区/tmp/测试截图/；正式 dist 保持 weapp 产包
- [ ] 协议当前是开发草案；主体、联系方式、保存期限、第三方 SDK 清单需法务定稿
- [ ] 微信 AppID、合法域名、支付凭据未申请；仅允许开发 mock/stub
- [x] ~~ST-020/ST-001 首页推荐~~ → 已由 _home.json(脚本12) + 首页分区实现；热点现为抽样，后续可接 events 播放量

## 变更记录
| 日期 | 变更 | 原因 |
|:--|:--|:--|
| 2026-07-22 | 新建前端骨架 + 三大内容链路 + 通用页；type-check 通过 | Batch 3-5 落地 |
| 2026-07-22 | 新增 G-05/06 综合挑战 + 收集册 + C-05 搜索 + A-02 孩子档案；type-check 通过 | 不依赖 AppID 的增量 |
| 2026-07-22 | GL-02 迷你播放栏 + 故事集自动续播队列；**build:weapp 成功产包** | 体验完善 + 可发布性验证（附 Node24 webpackbar 修复） |
| 2026-07-22 | 故事浏览改造：新增 S-02 学科页 + S-04 章回作品总入口；list 改为按 structure_type 自适应(单篇/混合分组/多层下钻)；章回连续播放；type-check+weapp 双通 | 三国演义等章回作品需总入口（ST-013/14/15） |
| 2026-07-22 | 首页推荐：脚本12 生成 _home.json(30部章回大IP+60单篇池+热点)；首页新增 继续收听/热点/大IP章回/单篇换一换 分区；type-check+weapp 双通 | ST-001/020 推荐（单篇从上下五千年/神州之外选、全章回大IP、轮动） |
| 2026-07-22 | 样式对齐设计稿：app.scss 新增设计稿组件(kk-search/kk-banner/kk-dots/sec-h/list-row/thumb/bar/play-s/tag-lv)；首页改 banner轮播+行卡分区；S-02 banner+色条行；S-03 新增顶部“✨为你推荐 换一换”；S-04 banner+编号章节行；type-check+weapp 双通 | 按 酷酷UI设计稿_优化版.html 对齐 + 分类顶部推荐 |
| 2026-07-22 | 修复 multi_level 渲染空白(用 sub_categories 而非 entries)；分类推荐兑底(无单篇则推荐章回)；歌曲M-01/成长G-01/家长C-01 三 tab 首页按设计稿对齐(青绿/绿色主题+sgrid+growth-card)；type-check+weapp 双通 | 分类推荐覆盖核查(154/182有内容分类均覆盖，28个为多层导航) + 全 tab 风格统一 |
| 2026-07-22 | **全量样式对齐**：app.scss 补齐播放器/按钮/chip/状态/选项卡类(cover-lg/prog/ctrls/cbtn/fns/btn-green/btn-ghost/chip/center/opt-card)；thumb/gr/nm/ds 提升为全局；剩余 15 页全部重样(PL-01/02播放器、G-02~06课程/挑战/综合/收集册、A-01登录/A-02孩子/A-03会员、C-04/05/06 历史/搜索/设置、收藏)；type-check exit0 + weapp 产包 | 22 页全部对齐 酷酷UI设计稿_优化版.html |
| 2026-07-22 | **UI 大改版 v4（典藏绘本·日夜双主题）**：① variables.scss 增夜间/鎏金/灯/衬线令牌；② 新增跨端 **Icon 组件**(SVG→dataURI，28图标，weapp 不支持<use>)；③ app.scss v4 组件库(greet/hero/cont/scard/tile/sbhead/mini玻璃/故事灯播放器/夜/鎏金/徽章墙/磨砂卡/横屏教学)；④ path.buildCoverUrl(真封面)；⑤ 重构 首页/故事灯播放器/歌曲首页+播放器/成长/会员/家长/列表/MiniPlayer；type-check exit0 + weapp 产包 | 对齐 酷酷UI_融合版_v4.html + design-tokens v4.0；glass/blur 按 weapp 能力近似 |
| 2026-07-22 | **全局睡前模式 + v4 补齐**：睡前模式=全局夜间(settingsStore.isNight，定时20:00~6:00/手动)，新增 **useNight hook** 应用到全部内容页(4tab+列表/学科/作品/搜索/收藏/历史/孩子/课程/挑战/综合/收集册/登录/设置) + 原生 TabBar 夜间色；设置页加睡前模式(定时/手动)+故事灯开关；首页添月亮快捷切换；subject/work 深度 v4(真封面 sbhead)；PL-03 教学横屏 v4(eland)；type-check exit0 + weapp 产包 | 睡前模式是全局主题(N-01 仅样例)；待办：自定义 SVG TabBar |
| 2026-07-22 | **自定义 SVG TabBar**：app.config `custom:true` + `src/custom-tab-bar`(Icon 渲染书/音符/嫩芽/家庭 + 顶部选中条 + 夜间联动) + `tabStore`(各 tab 页 useDidShow setTab)；tab 页 `has-tab` 预留底部 + MiniPlayer 避让；type-check exit0 + weapp 产包(dist/custom-tab-bar 齐全) | 底栏对齐 v4（原生 TabBar 不支持 SVG） |
| 2026-07-22 | 文档审计对齐：同步 00-代码地图/miniapp/server 文档到代码(页数 21、custom TabBar、Icon/useNight/tabStore/buildCoverUrl、夜间、server 11 模块/e2e 8/8) | 代码↔文档一致 |
| 2026-07-23 | 播放器事件解绑/跨页续播、睡眠定时、请求错误处理、注销清会话、协议与注销页面、监护人同意提交、release 门禁；type-check 通过 | 落实三份审查并区分开发就绪与上线就绪 |
| 2026-07-23 | 微信后台音频、真实歌曲参数/LRC、会员状态刷新、索引 TTL/并发合并、统一状态图标与可操作播放器按钮；type-check + weapp 构建通过 | 完成不依赖外部凭据和内容产物的体验整改 |
| 2026-07-23 | 开启 `noImplicitAny`、故事长列表分批渲染、减少动态效果媒体查询、补 750/375 尺寸口径 | 完成审查中的工程化与可访问性低风险项 |
| 2026-07-23 | 补审查可落地缺口：搜索扩到 _global 学科+_home 作品标题+StateView、歌曲 M-02/M-03 下钻(song/list)、story/list 接 StateView；lesson 护栏因教学播放器未上报完成暂不改(已标注)；type-check+weapp 双通 | 顺手补齐三份审查的代码缺口 |
| 2026-07-23 | 第四轮走查整改：MiniPlayer/story-index/growth-index 改逐字段 selector 订阅(防播放中每秒重渲染,M-10/11/12)、story/player hasQueue 改响应式订阅并队列播放时仍显字幕(M-01/M-13)、成长首页修累计口径重复计数(用 total_words_friends 算独占分段,M-6)、comprehensive useEffect 补 subject 依赖 + submit 加 try/catch(M-06/M-14) | 落实第四轮报告前端可独立闭环项 |
| 2026-07-23 | 第五轮(CTO)走查整改：member/challenge 页改逐字段 selector 订阅(补 M-10/11/12 遗漏的两页,M-5)、challenge submit 加 try/catch(L-7)；type-check 通过 | 落实第五轮报告前端可独立闭环项 |
| 2026-07-23 | 亲密度温柔化+课表筛选：lesson 拉 /progress/:subject 合并每字 stage、显亲密度级别徽章、顶部按亲密度(未遇见/已相识/好朋友/好伙伴)chips 筛选；challenge 失败态始终可“再试一次”(无惩罚)；type-check 通过 | 配合后端只升不降/无限重试/删复习，满足“看得到亲密度级别+可筛选” |
| 2026-07-24 | 第六轮走查整改：新增 services/playbackQueue 全局续播驱动(App 级注册一次)，story/player 移除页级 onEnded、改为随 playerStore.current 展示订阅(修 M-4 离页后续播断链/isPlaying 残留)；修复 comprehensive/challenge/service 头注释与用户文案“回落/1次重试”矛盾(R1-1/R1-2)；type-check+weapp 双通 | 落实 2026-07-24 报告 P1(M-4)+P2 文案矛盾 |
| 2026-07-24 | 播放队列泛化+歌曲续播+收藏拆分：playerStore QueueItem 泛化(story/song)+playMode 三态(顺序/单曲循环/列表循环)；playbackQueue 按 type 分派 playStory/playSong+skip；song/list 点歌设同类队列、song/player 接上/下首+模式切换；favorites 故事/歌曲分段+循环播放全部收藏歌曲；type-check+weapp 双通 | 歌曲同类续播/顺序/循环 + 收藏按类型拆分 |
| 2026-07-24 | 修复 N-H1(P0 回归)：登出/401→player.destroy() 清掉 App 级续播回调致重登后续播永久失效——audioPlayer 新增独立 endedDriver 槽(destroy 不清)、playbackQueue 改 setEndedDriver 注册；按“播放时长以 MP3 为准”移除 story/list、story/work 基于索引文件 duration_ms 的不准“X 分钟”提示(播放器进度已用音频实际时长)；type-check+weapp 双通 | 修复 2026-07-24 报告 P0 续播回归 + 时长口径以 MP3 为准 |
| 2026-07-24 | 高频体验硬伤修复：历史条目可点续播+清空二次确认(UX-H1/H3)、audioPlayer onError 复位 isPlaying 并去技术 errMsg 文案(UX-H8/M14)、综合挑战加载失败错误态+重试(N-M11)、删当前选中孩子自动切换兜底+删除 try/catch(N-M12/UX-H7)；type-check+weapp 双通 | 落实 2026-07-24 报告 C 组高频体验硬伤 |
| 2026-07-24 | 健壮性/体验批量整改：reportOnce 去重键加 childId+登出/切孩子清理(M6/N-M7)、6 页 zustand 改逐字段 selector 订阅(M9/N-M10)、children add/rename 与 account-delete 补 try/catch(N-L7)、故事播放器列表键 navigateBack 失败兑底 switchTab(N-L8)、word_id/歌曲id 跳转编码(N-L9/L13)、睡眠定时到点回写 store 清除+复位播放态(N-L6)、subject/work 加载失败错误态+重试(UX-17/30)；type-check+weapp 双通 | 落实 2026-07-24 报告 P2/P3 健壮性与体验项 |
| 2026-07-24 | 学习/会员 UX Phase1(不依赖真实内容)：首页“继续听”改“最近播放/重新播放”并去掉写死 42% 假进度(UX-01)、普通挑战与综合挑战改一题一屏分步(进度 N/M+上一/下一题+未答禁用提交,UX-10)、结果页逐题/逐字正误(用后端 results[]/per_char_results[],UX-11)、会员套餐选中→确认开通两步+submitting 禁用防重提+失败明确提示(UX-26)；app.scss 加通用 .disabled；type-check+weapp 双通 | 落实 UX-01/10/11/26；真实题库/字词表待内容就绪后 Phase2 |
| 2026-07-24 | UX Phase1 自审补漏：challenge 补加载/失败错误态+重试(对齐 comprehensive)；清理死代码(member 未用 Plan.tip 字段、app.scss 未引用 .c-bar)；type-check+weapp 双通 | Phase1 自审发现的健壮性缺口与清理 |
| 2026-07-24 | 五轮审核前端健壮性整改：indexLoader 失败回退过期旧缓存(stale-on-error,弱网不白屏,FE-H02)、playbackQueue playStory 令牌防切曲竞态(丢弃过期加载,FE-H01)、app.tsx 加全局 ErrorBoundary(渲染异常兜底+回首页,FE-H03)；type-check+weapp 双通 | 落实 2026-07-24 五轮审核前端健壮性项 |
| 2026-07-24 | 搜索 Tab 隔离(H-01)：搜索页加 scope(story/song/growth) 各搜各域不串——story 搜学科+作品、song 搜 songCatalog 歌曲、growth 搜三学科；歌曲 mock 抽 services/songCatalog 共享；story/song 入口带 scope、growth 新增搜索入口；type-check+weapp 双通 | 落实搜索 Tab 隔离原则(故事/歌曲/成长分开) |
| 2026-07-24 | member 页文案“跟读与场景运用”→“场景运用与拓展”(去掉与决策 C-13/E-04“不做跟读”冲突的宣称，F11) | 落实五视角审查 F11 |
| 2026-07-24 | 20 轮自审闭环：唯一真缺口——后端合规接口 POST /user/consent/withdraw 前端无入口(R2)，在 agreement 儿童规则页登录态补“撤回监护人同意”(二次确认+登出+重登需重新同意)；其余 19 轮均通过；type-check+weapp+单测三绿 | 20 轮自审报告见 md/审核归档/ |
| 2026-07-25 | 三份多视角审核整改：综合挑战锁定态话术家长化(“这里需要爸爸妈妈帮忙打开”，儿童心理护栏，不对孩子硬曝付费墙)；mock 脏标题“还多表”→“温酒斩华雄”；type-check+weapp 双通 | 落实专家/从业者/模拟用户报告有界项 |
| 2026-07-25 | StateView 加载态升级：纯 CSS spinner → 入包插画 assets/loading.jpg(用户供图 载入1.png 中心裁剪 360×360 JPG 44KB)+呼吸动画；types 补 *.jpg 声明；主包 0.50MB；视频转 GIF 实测 3秒/320px 即 2.8MB 否决入包方案(试样存 md/UI设计/图标与载入素材/)；type-check+weapp 双通 | 用户提供载入图/视频素材的落地与取舍 |
| 2026-07-25 | 歌词双方案：lrc.ts 新增 parseLyrics 统一入口(有时间标签→lrc 逐句/纯文本→plain 整首/空→none)；song/player 真实态首次消费队列项 lrcUrl(此前只有 mock 有歌词)、切歌 seq 防竞态、plain 模式限高可滚(.lyr-full)；type-check+weapp 双通 | 内容侧有无 LRC 时间文件均可自适应展示歌词 |
| 2026-07-25 | 播放倍速（产品定固定五挡 0.8/0.9/1.0/1.1/1.2，不做其他）：playerStore 新增 PLAYBACK_RATES 单一来源+playbackRate；audioPlayer 新增 setRate/cycleRate(换曲自动保持、RateStore 持久化、低版本静默降级)；故事灯功能行加“倍速”、歌曲播放器加倍速 chip，均点击循环；教学 PL-03 按既有决策不加；type-check+weapp 双通 | 用户需求：仅提供 0.8~1.2 五挡倍速 |
| 2026-07-28 | 真实音频联调测试+两修复：①字幕时间轴自适应（真实 segments 为 start_ms=0+duration_ms，改累计推算，修字幕永停第一段）；②故事 tab 学科网格/story 搜索过滤 NON_STORY_SUBJECT_IDS（瞎编的歌曲不对用户展示、学科启蒙归成长）；③补 src/index.html(h5 模板缺失)；验收：full.mp3 206 流式播放/字幕推进/倍速持久化/封面全 200（截图存工作区/tmp/测试截图）；tsc+h5+weapp 三通 | 故事/教学 full 音频到位后首次真实联调（报告见 md/审核归档/） |
| 2026-07-28 | 视觉巡检修复(用户反馈 TabBar/头像空)：①TabBar 抽共享 TabBarV4，h5 端四 tab 页渲染同一套 SVG 底栏(隐藏内置文字栏)，修图标尺寸口径(icon 26 物理px/栏高 130)不再裁字；②默认头像 assets/avatar.jpg(用户定稿小程序图标 128×128 6KB)接入故事/歌曲/家长/会员四处空头像圆；③夜间黑字压深底修复(成长/家长页标题补 var(--color-text))；tsc+h5+weapp 三通，主包 0.51MB，截图 04-10 复验 | 用户反馈 TabBar 空框/头像空圆 + 巡检连带发现 |
| 2026-07-28 | 多轮全按钮交互测试(R1-R7，150+次点击，含登录态全链路/会员 stub 开通/挑战判分)：修①歌曲播放器歌名夜间色②上/下首图标夜间随 night 换色③会员页“800+”→“12000+”故事(实数口径)；澄清月亮/黑字/登录门槛为非缺陷；tsc+h5+weapp 三通 | 用户要求每按钮≥5次全面测试(报告见 md/审核归档/) |
