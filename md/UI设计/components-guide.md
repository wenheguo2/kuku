# 组件库详细指南

> **版本**: v4.0  
> **日期**: 2026-07-22  
> **说明**: 本文档详细描述每个UI组件的变体、状态、交互细节和代码示例。v4.0 新增标志组件见第 8 章。

---

## 📋 目录

1. [Button 按钮](#1-button-按钮)
2. [Card 卡片](#2-card-卡片)
3. [Tag 标签](#3-tag-标签)
4. [BottomTabBar 底部导航栏](#4-bottomtabbar-底部导航栏)
5. [SearchBar 搜索栏](#5-searchbar-搜索栏)
6. [ProgressBar 进度条](#6-progressbar-进度条)
7. [EmptyState 空状态](#7-emptystate-空状态)

---

## 1. Button 按钮

### 1.1 变体类型

| 类型 | 用途 | 背景色 | 文字色 | 圆角 | 高度 |
|:--|:--|:--|:--|:--|:--|
| Primary | 主要操作（最重要） | `#FF8C42` | `#FFFFFF` | 24px | 48px |
| Secondary | 次要操作 | `#FFF3E0` | `#FF8C42` | 24px | 48px |
| Ghost | 幽灵按钮（不重要） | 透明 | `#FF8C42` | 24px | 48px |
| Icon | 图标按钮 | `#FFFFFF` | `#2D3142` | 50% | 48px |
| Play | 播放按钮 | `#FF8C42` | `#FFFFFF` | 50% | 80px |

### 1.2 状态样式

#### Primary Button（主按钮）

| 状态 | 样式 | CSS |
|:--|:--|:--|
| Default | 正常显示 | `background: #FF8C42; box-shadow: 0 2px 6px rgba(255,140,66,0.3)` |
| Hover | 鼠标悬停 | `transform: scale(0.97)` |
| Active | 按下 | `transform: scale(0.95); filter: brightness(0.9)` |
| Disabled | 禁用 | `opacity: 0.5; pointer-events: none` |
| Loading | 加载中 | 显示spinner动画，文字隐藏 |

**代码示例（Taro React）**：
```jsx
<Button 
  type="primary" 
  size="large"
  loading={false}
  disabled={false}
  onClick={handleClick}
>
  立即播放
</Button>
```

#### Play Button（播放按钮）

**特殊交互**：
- 尺寸：80px圆形
- 点击时有明显的缩放反馈（scale 0.92）
- 阴影加深效果
- 播放中变为暂停图标

**代码示例**：
```jsx
<View className="play-button" onClick={togglePlay}>
  {isPlaying ? <PauseIcon /> : <PlayIcon />}
</View>
```

```css
.play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: #FF8C42;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(255, 140, 66, 0.4);
  transition: transform 0.1s;
}

.play-button:active {
  transform: scale(0.92);
  box-shadow: 0 2px 8px rgba(255, 140, 66, 0.3);
}
```

---

## 2. Card 卡片

### 2.1 变体类型

| 类型 | 圆角 | 阴影 | 内边距 | 用途 |
|:--|:--|:--|:--|:--|
| 封面卡 | 16px | 有 | 12px | 学科/歌曲/歌单封面卡 |
| 通用卡 | 18px | 有 | 16px | 列表卡、内容卡 |
| Banner/大卡 | 20px | 有 | 16px | 首页 banner、大卡片 |

### 2.2 交互行为

**点击反馈**：
```css
.card {
  transition: transform 0.1s ease-out;
}

.card:active {
  transform: scale(0.97);
}
```

**左滑手势（收藏/分享）**：
- 向左滑动 > 50px 显示操作菜单
- 菜单包含：♡ 收藏、↗ 分享
- 松手后自动回弹或保持打开（取决于滑动距离）

---

## 3. Tag 标签

### 3.1 变体类型

| 类型 | 背景色 | 文字色 | 圆角 | 用途 |
|:--|:--|:--|:--|:--|
| Level (L1-L6) | `#F0E6D8` | `#2D3142` | 8px | 故事/歌曲级别 |
| Stage (朋友等级) | 等级色 | `#FFFFFF` | 8px | ⚪未遇见 🟡已相识 🔵好朋友 🟢好伙伴 |
| Subject (学科) | 辅助色 | `#FFFFFF` | 8px | 标识学科类型 |
| VIP | `#FFC93C` | `#2D3142` | 8px | 会员专属内容 |

### 3.2 使用规范

**Level Tag（级别标签）**：
```jsx
<Tag type="level">L5</Tag>
```

**Stage Tag（朋友等级标签）**：
```jsx
<Tag type="stage" stage="mastered">好伙伴</Tag>
// stage: unlearned | learned | tested | mastered
```

**VIP Tag**：
- 仅用于学习2/3入口、会员专属内容
- 金色背景突出显示

---

## 4. BottomTabBar 底部导航栏

### 4.1 规格

```
高度: 80px (含安全区)
背景: #FFFFFF
上边框: 1px solid #F0E6D8
```

### 4.2 Tab项

| Tab | 图标 | 文字 | 路由 |
|:--|:--|:--|:--|
| 故事 | 📖 | 故事 | /story |
| 歌曲 | 🎵 | 歌曲 | /song |
| 成长 | 🌱 | 成长 | /growth |
| 家长 | 👪 | 家长 | /parent |

### 4.3 选中态

```css
.tab-item.active {
  color: #FF8C42;  /* 橙色 */
  font-weight: bold;
}

.tab-item.active .icon {
  transform: scale(1.15);  /* 图标放大15% */
}
```

### 4.4 切换动画

- Tab切换时页面淡入淡出（200ms）
- 图标有轻微的缩放过渡效果

---

## 5. SearchBar 搜索栏

### 5.1 规格

```
高度: 48px
圆角: 24px (全圆角胶囊)
背景: #FFFFFF
图标: 20px 灰色
占位文字: "搜索故事、歌曲..." 16px #8B8D9E
```

### 5.2 状态

| 状态 | 样式 |
|:--|:--|
| Default | 浅色背景，灰色边框 |
| Focused | 边框变为 2px solid #FF8C42 |
| Has Value | 显示清除按钮 (×) |

### 5.3 交互

- 点击搜索栏 → 展开为全屏搜索页
- 输入文字 → 实时显示搜索结果
- 点击清除按钮 → 清空输入框

**代码示例**：
```jsx
<SearchBar 
  placeholder="搜索故事、歌曲..."
  onFocus={handleFocus}
  onChange={handleChange}
  onClear={handleClear}
/>
```

---

## 6. ProgressBar 进度条

### 6.1 变体类型

| 场景 | 已进度色 | 背景色 | 滑块尺寸 |
|:--|:--|:--|:--|
| 故事播放器 | `#FF8C42` | `#F0E6D8` | 20px 圆形 |
| 歌曲播放器 | `#3FC5BC` | `#F0E6D8` | 16px 圆形 |
| 教学播放器 | `#7FC96A` | `#F0E6D8` | 16px 圆形 |
| 学习进度 | 阶段色 | `#F0E6D8` | 无滑块（堆叠条形图） |

### 6.2 交互

**拖动seek**：
- 按住滑块拖动
- 松开后跳转到对应位置
- 播放时滑块有呼吸动画（scale 1.0 → 1.2，1秒循环）

**代码示例**：
```jsx
<ProgressBar 
  progress={0.45}  // 0-1
  duration={548}   // 总时长（秒）
  currentTime={247}
  onSeek={handleSeek}
  theme="story"    // story | song | education
/>
```

---

## 7. EmptyState 空状态

### 7.1 变体类型

| 场景 | 文案 | 图标 | 操作按钮 |
|:--|:--|:--|:--|
| 无搜索结果 | "没有找到相关内容，换个词试试？" | 🔍 | 返回热门搜索 |
| 无收藏 | "还没有收藏任何内容哦" | ♡ | 浏览推荐内容 |
| 无网络 | "网络开小差了，请检查网络后重试" | 📡 | 重试 |
| 播放失败 | "音频加载失败，点击重试" | ▶ | 重试 |
| 无播放历史 | "还没有听过故事呢，去听一个吧" | 🎧 | 去首页 |

### 7.2 设计规范

**布局**：
- 图标居中，大尺寸（80-120px）
- 文案在图标下方，次要文字色
- 操作按钮在文案下方，主按钮样式

**代码示例**：
```jsx
<EmptyState
  icon="🔍"
  title="没有找到相关内容"
  description="换个词试试？"
  actionText="返回热门搜索"
  onAction={handleGoBack}
/>
```

---

## 🎨 动画规范

### 微交互动画

| 组件 | 触发 | 动画 | 时长 | 缓动 |
|:--|:--|:--|:--|:--|
| 卡片点击 | 按下 | scale 0.97 | 100ms | ease-out |
| 卡片释放 | 松开 | scale 1.0 | 150ms | ease-in |
| 播放按钮 | 点击 | scale 0.92 + 阴影加深 | 100ms | ease |
| 进度点 | 播放中 | 呼吸动画 (scale 1.0→1.2) | 1s loop | linear |
| 收藏按钮 | 点击 | 心形缩放 + 颜色填充 | 300ms | spring |
| Tab切换 | 切换 | 淡入淡出 | 200ms | ease |

### 页面转场动画

| 场景 | 动画 | 时长 | 缓动 |
|:--|:--|:--|:--|
| 页面进入 | 从右向左滑入 | 300ms | ease-out |
| 页面返回 | 从左向右滑出 | 300ms | ease-in |
| 播放器展开 | 从底部向上滑入 | 400ms | spring |
| 播放器收起 | 向下滑出 | 300ms | ease-in |

---

## 📝 使用建议

### 最佳实践

1. **保持一致性**：同一类型的按钮在整个APP中使用相同的样式
2. **反馈及时**：所有可点击元素必须有明确的点击反馈（缩放/变色）
3. **状态完整**：每个组件都要实现 Default/Hover/Active/Disabled 四种状态
4. **无障碍**：确保触摸目标 ≥ 44×44pt，颜色对比度 ≥ 4.5:1

### 常见错误

❌ **错误**：按钮太小，儿童手指难以点击  
✅ **正确**：所有按钮最小 48px 高度

❌ **错误**：没有禁用状态，用户可以重复点击  
✅ **正确**：提交中设置 `disabled={true}`

❌ **错误**：颜色对比度不足，文字看不清  
✅ **正确**：使用设计令牌中的标准配色方案

---

## 8. v4.0 新增标志组件

> 以下组件为 v4.0 定稿新增，可视化效果见 [`酷酷UI_融合版_v4.html`](酷酷UI_融合版_v4.html)。

### 8.1 StoryLampPlayer 故事灯播放器（PL-01）

- 圆形封面（188px）+ 呼吸光晕（3.2s 循环，外环 10→13px + 外发光 60→85px）
- 封面高斯模糊铺底（blur 50px + 深色渐变蒙版），Apple Music 式氛围沉浸
- 控件：深夜蓝玻璃拟态（`rgba(255,255,255,.14)` + blur 8px），主按钮 78px 径向高光
- 进度条：暖灯金渐变（`#FFE0B0→#FFC98F`），进度点白色发光 + 呼吸动画

### 8.2 TeachingPlayer 教学播放器（PL-03，横屏）

| 区域 | 占比/高度 | 内容 |
|:--|:--|:--|
| 左场景区 | 65% | 1920×1080 场景图 + 透明底角色立绘（高约 84%，左下锚定） |
| 右字词面板 | 35% | 今日生字徽章 + 衬线大字 56px + 拼音 + 组词（面板从简） |
| 字幕条 | 40px | 深蓝底 `#171D33`，生字金色 `#FFD873` 高亮 |
| 控制栏 | 54px | 上一段 / 播放暂停 / 下一段 / 重听（圆形 36px，主按钮 44px 橙色） |

### 8.3 FriendBadgeWall 朋友收集册（G-01）

- 徽章：62px 圆形封面 + 3px 圆环，环色=四级朋友色（⚪`#D1D5DB` 🟡`#FFD93D` 🔵`#6BCBFF` 🟢`#7ED957`）
- 未遇见：2.5px 虚线环 + 奶油底 + 居中"?"，文案"再听 1 个故事遇见"（零压力悬念）
- 顶部统计卡：四级堆叠条形图（22px 高圆角）+ 图例

### 8.4 GildedBookBox 鎏金故事书匣（A-03）

- 底色 `#221E17→#37301F`，文字 `#F5E6C8`，点缀金 `#FFE9A8/#FFC93C`
- 权益行：暗金描边玻璃行；套餐卡 3 列，选中态金底深字
- CTA：金渐变胶囊"开启鎏金书匣"；底部"到期不自动续费"建立信任

### 8.5 MiniPlayerBar 迷你播放栏（GL-02）

- 高 62px 圆角 19px，玻璃拟态（`rgba(255,255,255,.66)` + blur 14px）
- 左封面 42px + 标题/副标题 + 右播放钮 38px，叠加 Tab 栏上方

### 8.6 NightTheme 夜主题（N-01 / PL-01）

- 深蓝渐变 `#141B31→#232F55`，月亮光晕 + 星光闪烁（2.4s）
- 列表行：`rgba(255,255,255,.07)` 玻璃行；CTA 金渐变 `#FFE9A8→#FFC93C` 深字 `#5A3D00`
- ★ 全局夜间靠 `.theme-dark` 类覆盖 CSS 变量；**必须在 `.theme-dark` 上重申 `color: var(--color-text)`**，
  否则未显式设色的文字（如 `.big`/`.nm`）会继承 `page` 的浅色计算值而几乎不可见（实测过的坑）

---

## 9. v4.1 新增通用组件（2026-07-30）

### 9.1 ShareBar 分享拉新按钮（全站通用）

代码：`miniapp/src/components/ShareBar/index.tsx` · 样式：`button.share-bar`

```tsx
import ShareBar from '@/components/ShareBar';
<ShareBar text="🎵 把好听的儿歌分享给小伙伴" />
```

| 规格 | 值 |
|:--|:--|
| 尺寸 | 宽自适应（366px @390 窗口）× 高 44px（热区达标） |
| 背景 | 橙色渐变 `#FFB067 → #FF8C42`，圆角 26rpx |
| 阴影 | `0 6px 16px rgba(255,140,66,.35)` |
| 文字 | 28rpx / 800，白字，建议带 emoji |

**关键约束**：
- 必须是 `Button` + `openType="share"`，**`View` 点了不会拉起转发面板**（微信限制）
- 青绿主题页（歌曲）、绿色主题页（成长）**也用橙色**，保持全站分享入口识别度
- 已接入：故事首页 / 歌曲首页 / 成长首页 / 家长中心（四 Tab 全覆盖）

### 9.2 useShareCard 分享内容 hook

代码：`miniapp/src/hooks/useShareCard.ts`

```ts
useShareCard({ title: '酷酷音乐厅 — 学科启蒙儿歌一起唱', card: 'E05_学科启蒙', path: '/pages/song/index/index' });
```

一次注册**转发好友**（`useShareAppMessage`）+ **分享朋友圈**（`useShareTimeline`）。
卡图取 `production/illustrations/share_cards/{card}.jpg`（500×400保原比例，经 `/static` 网络引用不占包体）。
注：朋友圈接口只接受 `title`/`query`/`imageUrl`（不接受完整 path），组件已自动拆参。

### 9.3 StateView 四态容器（U-03/04/05）

代码：`miniapp/src/components/StateView/index.tsx`

```tsx
<StateView loading={loading} error={error} empty={list.length === 0}
  emptyText="还没有收藏歌曲～" emptyIcon="star" onRetry={load}>
  {/* 内容 */}
</StateView>
```

统一排序：loading → error（带重试）→ empty（带插画/图标与文案）→ children。
**空态文案必须具体友好**（如“还没有收藏歌曲～”而非“暂无数据”）；报错回显用户输入时**超 12 字要截断加 `…`**。

### 9.4 插画图标规范

- 源图：`production/illustrations/covers/generated/（含 新建文件夹/）`；压缩产物：`miniapp/src/assets/`
- 规格：常规图标 96px PNG（~15-25KB）；迷你浮球 128px；登录 hero 640px 宽 JPG
- 完整图标清单与使用位置见 [README.md](README.md#-插画图标资产登记表小程序在用)
- 两态图标：夜间开关需 `night ? iconDay : iconNight`（当前模式显示“切去哪里”的图）

### 9.5 触控热区必须 ≥88rpx

文字型链接（“换一换/更多/换一个”）不能只靠字号撑高度，需：

```scss
.sec-h .m { font-size: 26px; padding: 26px 8px; margin: -26px -8px; } // padding 撑热区，负 margin 保布局
```

换算提醒：390px 窗口下 **1rpx ≈ 0.52px**，要凑 44px 高约需纵向 padding 26~34rpx。

---

## 🔗 相关文档

- [UI设计方案.md](UI设计方案.md) - 完整设计规范（v4.0 定稿设计语言见第 0 章）
- [酷酷UI_融合版_v4.html](酷酷UI_融合版_v4.html) - 定稿可视化设计稿（24屏）
- [design-tokens.json](design-tokens.json) - 设计令牌配置（v4.1 已同步对比度修正值）
- [README.md](README.md) - 插画图标资产登记表
- [../23-小程序测试与验收报告.md](../23-小程序测试与验收报告.md) - 组件实测结论与热区/对比度数据

---

**最后更新**: 2026-07-30（v4.1：新增 ShareBar/useShareCard/StateView 组件、插画图标与热区规范）
