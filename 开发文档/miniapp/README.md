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
| `types/content.ts` | ★ 索引数据模型（中文 subject_id + structure_type/display_as/path/cover/entries/sub_categories + HomeIndex/WorkIndex） |

## services（服务层）
| 文件 | 职责 |
|:--|:--|
| `config.ts` | 编译期注入 api/static 地址、`USE_MOCK`、release 标志；release 禁止 mock/example 域名 |
| `api.ts` | Taro.request 封装：15 秒超时、HTTP/业务双层错误、JWT、401 去重跳登录 |
| `storage.ts` | Taro Storage 封装（Token/Child/Theme/睡眠截止时间）——小程序无 localStorage |
| `tracker.ts` | 登录、故事播放、付费点击等行为上报；失败不阻断主流程但保留告警 |
| `indexLoader.ts` | 四级索引懒加载；15 秒超时、HTTP/JSON 校验、1 小时 TTL、并发请求合并、手动清缓存、失败回退过期旧缓存(stale-on-error 降级)；USE_MOCK 时返回 mock |
| `audioPlayer.ts` | 全局 FullTrackPlayer：微信端 BackgroundAudioManager（锁屏/后台元数据），其他端 InnerAudioContext；可取消页面订阅、跨页续播、睡眠截止时间、显式 destroy |
| `playbackQueue.ts` | ★ 故事集/歌单续播全局驱动（App 级 initPlaybackQueue 注册一次）：曲终→queueAdvance(按播放模式)→按 type 分派 playStory/playSong；手动 skip(±1)；与播放页存活无关；playStory 用令牌防切曲竞态(丢弃过期加载) |
| `mock.ts` | 全局/分类/segments/歌曲 mock（结构同真实） |
| `songCatalog.ts` | 歌曲 mock 目录(SONG_CATEGORIES/ALL_SONGS)；song/list 与 搜索(song scope) 共用，避免重复维护 |

## utils（可复用算法，纯函数）
| 文件 | 职责 |
|:--|:--|
| `path.ts` | ★ `buildAssetUrl`(中文路径逐段 encodeURIComponent，方式A) / `buildCoverUrl`(封面补 illustrations/ 前缀) / `buildIndexUrl` |
| `lrc.ts` | LRC 解析 + `findLrcIndex` 二分定位高亮行 |
| `timeline.ts` | `locateSegment` 按 currentMs 二分定位教学当前段 |

## stores（Zustand）
- `userStore`：login/restore/logout；统一缓存用户与会员状态；401 回调完整清 token、child、会员和播放器状态
- `settingsStore`：主题 system/light/dark（D-06）+ **睡前模式全局夜间** + 可关闭/持久化/跨页生效的睡眠定时
- `playerStore`：迷你播放栏跨页状态 + **故事集/歌单续播队列**（泛化 QueueItem: type/id/audioUrl/lrc/cover）+ **播放模式** playMode(order/repeat-one/repeat-all) + queueAdvance/queueSkip
- `tabStore`：当前 Tab（自定义 TabBar 高亮用；各 tab 页 useDidShow setTab）

## hooks
- `useNight`：★ 全局睡前/夜间模式（所有页通用）。每次页面显示重算 isNight，返回根节点类名(`theme-dark`)，并同步小程序页面背景色，避免页面边缘闪白

## components（组件）
- `Icon`：★ 跨端 SVG 图标（SVG→dataURI→Image，28 图标；weapp 不支持 `<use>`，颜色烘焙进 SVG）
- `MiniPlayer`：GL-02 玻璃迷你播放栏（跨页常驻；tab 页上移避让 TabBar，非 tab 页贴底）
- `StateView`：U-03/04/05 通用状态视图（SVG 图标、加载/空/错误+重试），用于收藏/历史/首页/列表/搜索

## custom-tab-bar（自定义底栏）
- Taro 约定目录 `src/custom-tab-bar/`（+`app.config` custom:true）；用 `Icon` 渲染 4 个 SVG 线性图标(书/音符/嫩芽/家庭)；顶部橙色选中条；读 `tabStore` 高亮 + 点击 switchTab；随 `isNight` 夜间换色

## pages（页面，编号对应 md/09）
| 页面 | ID | 说明 |
|:--|:--|:--|
| story/index | S-01 | 首页推荐聚合：继续收听(历史) + 🔥热点 + 📚大IP章回 + 🎧单篇轮动(换一换) + 学科网格（数据源 _home.json） |
| story/subject | S-02 | 学科页：分类卡片（subject_index.categories） |
| story/list | S-03/05/06 | 通用浏览：按 structure_type 自适应；长列表每批渲染 50 项，避免千级内容一次挂载；加载/错误/空态接 StateView |
| story/work | S-04 | **章回作品总入口**（如三国演义）：作品信息 + 章节目录 + 从第1章连续播放 |
| story/player | PL-01 | **故事灯**：后台/锁屏整曲播放、字幕、历史/埋点、收藏/分享/定时/列表、队列续播（★续播由全局 playbackQueue 驱动，页面只做展示订阅） |
| song/index | M-01 | 音乐厅：Hero + 分类 tiles(可点→song/list) + 最近播放（青绿主题） |
| song/player | PL-02 | 真实 audio/lrc/cover + 后台音频 + LRC 高亮与可拖动进度；★接歌单队列：上/下一首(skip) + 播放模式切换(顺序/列表循环/单曲循环)；mock 才用模拟时钟 |
| song/list | M-02/M-03 | 歌曲分类下钻：分类→歌曲列表→播放器；★点歌将本分类整体设为播放队列(同类续播/循环基础)；当前 mock(共享 songCatalog，与搜索同源)，接真实歌曲索引后替换数据源 |
| growth/index | G-01 | 朋友收集册：四级进度条+图例 + 三学科统计 |
| growth/lesson | G-02/03 | 字词列表 + 学习1(免费) + 学习2/3会员锁 UI + 去挑战；★每字显亲密度级别徽章 + 顶部按亲密度筛选(拉 /progress/:subject 合并 stage)；真实词库仍待内容接入 |
| growth/player | PL-03 | 横屏三区(eland)：场景65%+衬线大字面板+生字金色高亮字幕条 |
| growth/challenge | G-04 | 取题→选答→服务端判分→结果；★无惩罚·未过始终可再试；★一题一屏分步+逐题正误+加载/失败态 | 
| growth/comprehensive | G-05/06 | 综合挑战：自动触发检查→10字作答→服务端逐字判定·只升不降→结果（会员门控） |
| growth/collection | — | 朋友收集册可视化 + 成就贴纸（会员门控） |
| parent/index | C-01 | 轻奢磨砂：孩子卡 + 本周统计 + 功能行 + 鎏金入口 |
| common/login | A-01 | 狐狸吉祥物 + 微信一键登录/手机号 |
| common/favorites | C-03 | 收藏列表；★故事/歌曲分段 + 歌曲段“循环播放全部收藏歌曲”(设歌单队列+列表循环) |
| common/history | C-04 | 播放历史（child_id 隔离）；★条目可点续播(story→故事灯/song→歌曲)、清空二次确认 |
| common/settings | C-06 | 外观主题 + **睡前模式(定时/手动)+故事灯开关** + 睡眠定时 |
| common/member | A-03 | **鎏金故事书匣**：缓存/刷新真实会员状态 + 三档书匣 + 下单（仅开发 stub 可自动开通） |
| common/search | C-05 | ★按 Tab 隔离检索(scope=story/song/growth 各搜各的不串)：story→_global 学科+_home 作品→学科/作品/播放器；song→songCatalog 标题→歌曲播放器；growth→识字/英语/拼音→课程页；+ StateView |
| common/children | A-02 | 孩子档案 CRUD + 切换 selectedChildId；★删当前选中档案自动切到剩余首个(防悬空) |
| common/agreement | — | 用户协议、隐私政策、儿童个人信息规则草案阅读页；法务定稿前 release 门禁不放行 |
| common/account-delete | A-05 | 二次确认后调用 `DELETE /user`，成功后清理全部本地会话 |

## 待优化 / 已知
- [x] ~~UI v4 典藏绘本 + 全局睡前模式 + 自定义 SVG TabBar~~ 已落地（type-check+weapp 双通）
- [ ] **真实封面/整曲/立绘场景** 依赖内容产出：开发态 `USE_MOCK=true` 封面会 404→柔和底色块；产出后 `USE_MOCK=false` 显示
- [ ] 真机验证：自定义 TabBar 切换/夜间换色/安全区；glass/blur 已按 weapp 能力近似(半透实底)
- [ ] 教学/歌曲真实音频依赖 TTS 产出（R5）；真实词库/笔画数据接入
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
