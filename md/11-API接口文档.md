# API接口详细文档

> **版本**: v2.0  
> **日期**: 2026-07-16  
> **说明**: 本文档以 [02-技术架构设计](02-技术架构设计.md) §4 为**权威口径**重写，统一：`/api/v1` 前缀、`{code, message, data}` 响应包络、JWT Bearer 认证、**服务端判分**（题目不下发答案）、`current_stage 0/1/2/3` 朋友等级枚举、账号注销/数据删除接口。索引与媒体文件走 CDN 静态（不经 `/api/v1`），见 02 §4.3/§4.4。
> **v2.0变更**: 从 v1.0（`/api/...` 无版本前缀、`{success/error_code}` 双轨格式、题目内含 `is_correct` 客户端判分、缺注销接口）重写对齐 02。
> **安全约束（2026-07-23）**：所有接收 `child_id` 的接口必须先校验该档案属于当前 JWT 用户；越权统一返回 404。普通/综合挑战均由服务端保存正确答案，客户端不得提交 `is_correct`。

> ★ **现状补记（以代码为准，2026-07-31）** — 下文部分早期示例已漂移，以本补记为准：
> - **登录/拉新**：`POST /auth/login` 新增可选 `inviter`（邀请人 userId）；新用户注册送 3 天免费期，拉新每人 +3 天（有上限，可累加）。
> - **`GET /user/profile`** 响应新增：`free_until`、`can_access_all`（会员 active 或免费期内）、`entitlement_until`（赠送+会员累加的较晚到期）、`referral_count`。
> - **免费专区/免费池**：走静态 `/(cdn)/index/generated_stories/_free_pool.json`（50 故事+100 歌曲，不经 `/api/v1`）。
> - **教学付费边界**：识字/英语 **前 10 课（编号 0-9）整课免费**；第 11 课起 `POST /progress/study` 对 `seq>=10` 且非 `can_access_all` 返回 **403**；`GET /vocabulary/:id` 的 `learning_modules.is_vip` 按 seq。**拼音已下线**。
> - **挑战通过标准**：真题统一“答对 ≥75%”（`isNormalPassed`），非分学科（md/00 §4.3 旧分学科标准作废）。
> - **`GET /progress/summary`** 实际返 `child_id` / `overall_stats{total_words_learned,total_words_friends,total_words_mastered}` / `subject_progress[]`（无 `progress_percentage`/`recent_activities`）。
> - **歌曲内容路径**：`generated_stories/瞎编的歌曲/{43分类}/{语言子类}/{歌名}.mp3`（SONG_SUBJECT 为本地内容名，前端展示已清洗）。
> - **传输**：后端已开 gzip（compression 中间件），索引/接口 JSON 传输体积大幅下降。

---

## 📋 目录

0. [通用约定](#0-通用约定)
1. [索引与内容（CDN静态）](#1-索引与内容cdn静态)
2. [认证与用户接口](#2-认证与用户接口)
3. [故事相关接口](#3-故事相关接口)
4. [歌曲相关接口](#4-歌曲相关接口)
5. [教育学习接口](#5-教育学习接口)
6. [成长/家长/档案接口](#6-成长家长档案接口)
7. [会员与订单接口](#7-会员与订单接口)
8. [搜索接口](#8-搜索接口)
9. [埋点接口](#9-埋点接口)
10. [通用说明](#10-通用说明)

---

## 0. 通用约定

### 0.1 基础路径

所有业务接口统一前缀 **`/api/v1`**（RESTful 风格），例：`POST /api/v1/auth/login`。

> **索引文件与媒体文件不经 `/api/v1`**，直接从 CDN 获取静态资源（见 §1 与 02 §4.3/§4.4）。

### 0.2 认证方式

JWT Bearer Token：

```
Authorization: Bearer {jwt_token}
```

- 微信登录：`POST /api/v1/auth/login`（code 换取 token）
- 需登录的接口未携带/过期 token 返回 `code=401`

### 0.3 统一响应格式（包络）

**所有 `/api/v1` 接口**返回统一包络（对齐 02 §4.1）：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

| 字段 | 类型 | 说明 |
|:--|:--|:--|
| code | number | 业务码，`0`=成功；非0见 §0.4 |
| message | string | 提示信息，成功为 `"success"` |
| data | object/array/null | 业务数据；出错时为 `null` |

> 本文后续各接口的"返回数据"仅展示 `data` 内部结构，实际响应均包裹在上述包络中。

### 0.4 错误码（业务码 code）

| code | 说明 | 处理建议 |
|:--:|:--|:--|
| 0 | 成功 | - |
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未登录或 Token 过期 | 重新登录 |
| 403 | 无权限（如非会员访问会员内容） | 检查会员状态 |
| 404 | 资源不存在 | 检查 ID 是否正确 |
| 429 | 触发速率限制 | 稍后重试（见 §10.3） |
| 500 | 服务器内部错误 | 稍后重试 |

**错误响应示例**：

```json
{
  "code": 401,
  "message": "未登录或Token已过期",
  "data": null
}
```

### 0.5 分页约定

列表接口统一使用 `page`（默认1）、`page_size`（默认20，上限 100）查询参数；`data` 内含 `total`、`page`、`page_size`、`list`。

### 0.6 朋友等级枚举（current_stage）

教育学习/成长相关接口统一使用 `current_stage`（对齐 02 §3 DDL）：

| current_stage | 展示话术 | 历史字段名 |
|:--:|:--|:--|
| 0 | 未遇见 | unlearned |
| 1 | 已相识 | learned |
| 2 | 好朋友 | tested |
| 3 | 好伙伴 | mastered |

> 层级覆盖关系，由里程碑达成驱动（听/普通挑战/综合挑战）。展示层统一用养成话术，见 [13-陪伴养成系统设计](13-陪伴养成系统设计.md)。

---

## 1. 索引与内容（CDN静态）

> **重要**：索引文件为静态 JSON，**不走 `/api/v1`**，由前端直接从 CDN 拉取（对齐 02 §4.3）。以下为文件结构说明，不返回 §0.3 包络。资产数量口径详见 [08 §0.1](08-本地开发实施步骤.md)。

### 1.1 全局索引 `_global.json`

**CDN路径**: `https://cdn.example.com/index/generated_stories/_global.json`

**结构**:
```json
{
  "schema_version": "1.1",
  "index_type": "global",
  "generated_at": "2026-07-14",
  "stats": { "total_subjects": 11, "total_entries": 36848 },
  "subjects": [
    {
      "subject_id": "品格养成",
      "subject_name": "品格养成",
      "category_count": 9,
      "total_entries": 1565,
      "cover": { "cover_image_url": "covers/generated/品格养成/品格养成.jpg", "cover_level": "subject" }
    }
  ]
}
```

**字段说明**（真实结构，对齐 `miniapp/src/types/content.ts` 与 [10 号](10-索引与封面设计方案.md)）:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| schema_version / index_type / generated_at | string | 版本 / 索引类型(`global`) / 生成时间 |
| stats.total_subjects / total_entries | number | 学科数 / 条目总数（实测口径详见 08 §0.1） |
| subjects[].subject_id / subject_name | string | **中文学科名**（如 `品格养成`），既作 ID 又作显示名 |
| subjects[].category_count / total_entries | number | 该学科分类数 / 条目数 |
| subjects[].cover | object | `{ cover_image_url(相对路径 covers/generated/…), cover_level }` |

> ⚠️ 无 `recommendations` 字段：首页推荐由 `_home.json`（脚本 12 生成）承载，见 [10 §3.7](10-索引与封面设计方案.md)。

**缓存策略**: CDN 24小时；前端本地缓存 1小时。

### 1.2 学科索引 `_index.json`

**CDN路径**: `https://cdn.example.com/index/generated_stories/{学科}/_index.json`
（`{学科}` = **中文学科名**，如 `品格养成`；路径经 `buildAssetUrl` 逐段 `encodeURIComponent`）

**结构**（学科下分类清单；每个分类再指向自己的分类索引）:
```json
{
  "subject_id": "品格养成",
  "subject_name": "品格养成",
  "cover": { "cover_image_url": "covers/generated/品格养成/品格养成.jpg", "cover_level": "subject" },
  "categories": [
    {
      "id": "A1勇敢",
      "name": "勇敢",
      "path": "品格养成/A1勇敢",
      "structure_type": "standalone_collection",
      "display_as": "grid",
      "entry_count": 120,
      "cover": { "cover_image_url": "covers/generated/品格养成/A1勇敢/A1勇敢.jpg", "cover_level": "category" }
    }
  ]
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| subject_id / subject_name | string | 中文学科名 |
| categories[].id / name / path | string | 分类 ID / 名 / **中文相对路径**（下钻时用于拉分类索引） |
| categories[].structure_type | string | `standalone_collection` / `chaptered_work` / `mixed` / `multi_level` / `txt_collection` |
| categories[].display_as | string | 前端渲染方式（如 `grid`），驱动 S-02~S-06 差异化 |
| categories[].entry_count | number | 该分类条目数 |
| categories[].cover | object | 分类封面（相对路径 + cover_level） |

> **下钻的分类索引**（`CategoryIndex`）含 `entries[]`（`entry_id/title/structure_type/display_as/path/cover`）；`multi_level` 用 `sub_categories[]` 而非 `entries[]`；章回作品总入口为 `work_index`（`chapters[]`）。完整模型见 [10 号](10-索引与封面设计方案.md) 与 `types/content.ts`。

### 1.3 故事分段 `segments.json`

**CDN路径**: `https://cdn.example.com/generated_stories/{学科}/{分类}/{故事名}/segments.json`

**结构**:
```json
{
  "story_id": "孔融让梨",
  "title": "孔融让梨",
  "subject": "品格养成",
  "category": "A1勇敢",
  "level": "L5",
  "total_duration": 900,
  "cover_url": "illustrations/covers/generated/品格养成/A1勇敢/孔融让梨.jpg",
  "segments": [
    {
      "segment_id": 1,
      "start_time": 0,
      "end_time": 180,
      "audio_url": "audio/品格养成/A1勇敢/孔融让梨/sp_00001.mp3",
      "text": "从前有个孩子叫孔融..."
    }
  ],
  "full_audio_url": "audio/品格养成/A1勇敢/孔融让梨/full.mp3"
}
```

> **路径约定**：`cover_url`（含 `illustrations/` 前缀）/`audio_url`/`full_audio_url` 均为相对静态根路径，前端用 `buildAssetUrl` 逐段编码拼接；故事封面因 `cover_url` 已含前缀，**不再经 `buildCoverUrl`**（而索引的 `cover_image_url` 不含前缀，由 `buildCoverUrl` 补 `illustrations/`）。
> **播放策略**（对齐 02 决策2）：客户端播放**整曲 `full.mp3`**，通过 `segments`（教学场景为 `timeline.json`）二分查找定位当前段以同步字幕/立绘。分段文件命名 `sp_*.mp3` 或 `seg_*.mp3`（见 08 §0.1）。
> **timeline.json 权威口径**：教学音频合并产出 8 字段完整结构 `{seq, start_ms, end_ms, duration_ms, segment_id, character, text, voice_id}`，以 07 号 §脚本2 / 08 号 §3.2 为准。

**缓存策略**: CDN 7天（内容不变）；前端可永久缓存。

---

## 2. 认证与用户接口

### 2.1 POST /api/v1/auth/login

**用途**: 监护人明确同意协议后，用微信 code 换取 token；服务端记录协议版本并保证至少一个默认孩子档案。

**请求体**:
```json
{
  "code": "wx_js_code_xxx",
  "guardian_consent": true,
  "user_agreement_version": "2026-07-final",
  "privacy_version": "2026-07-final",
  "children_privacy_version": "2026-07-final"
}
```

> `guardian_consent` 缺失或不为 `true` 返回 400。三份版本号还必须与服务端环境配置一致，否则要求重新阅读；开发草案版本不得用于 release。

**data**:
```json
{
  "token": "eyJhbGciOi...",
  "expires_in": 604800,
  "user": { "user_id": "u_001", "nickname": "宝宝家长", "is_new": false },
  "default_child_id": "child_001"
}
```

### 2.2 GET /api/v1/user/profile

**用途**: 获取当前用户信息（需登录）

**data**:
```json
{
  "user_id": "u_001",
  "nickname": "宝宝家长",
  "avatar_url": "/avatars/u_001.jpg",
  "phone": "138****8888",
  "membership": { "status": "active", "plan_type": "yearly", "end_date": "2027-07-16" }
}
```

### 2.3 PUT /api/v1/user/profile

**用途**: 更新用户信息（需登录）

**请求体**:
```json
{ "nickname": "新昵称", "avatar_url": "/avatars/xxx.jpg" }
```

**data**: `{ "success": true }`

### 2.4 POST /api/v1/auth/logout

**用途**: 退出登录（使当前 token 失效）

**data**: `{ "success": true }`

### 2.5 DELETE /api/v1/user

**用途**: **账号注销与数据删除**（合规要求，对齐 15号合规 checklist / 二.16）。注销后删除用户及其名下所有孩子档案、学习进度、订单等个人数据，操作不可恢复。

**请求头**: `Authorization: Bearer {token}`

**请求体**:
```json
{ "confirm": true, "reason": "不再使用" }
```

**data**:
```json
{ "success": true, "deleted_at": "2026-07-16T10:30:00Z", "purge_completed": true }
```

### 2.6 POST /api/v1/user/consent/withdraw

**用途**: 监护人撤回同意（PIPL/《儿童个人信息网络保护规定》）。将最新一条未撤回的同意记录 `withdrawn_at` 置为当前时间。

**请求头**: `Authorization: Bearer {token}`（无请求体）

**data**:
```json
{ "success": true, "withdrawn_at": "2026-07-16T10:30:00Z" }
```

**说明**: 二次确认后执行；返回删除完成状态，供前端提示"账号及数据已删除"。

---

## 3. 故事相关接口

> 故事内容/分段/音频均为 CDN 静态资源（见 §1.3）。此处仅为需登录的进度/历史类接口。

### 3.1 POST /api/v1/history

**用途**: 记录播放历史（含故事播放完成，body 含 child_id）

**请求体**:
```json
{
  "child_id": "child_001",
  "content_type": "story",
  "content_id": "A001_孔融让梨",
  "play_duration": 900,
  "completed": true,
  "played_at": "2026-07-16T10:30:00Z"
}
```

**data**: `{ "history_id": "h_20260716_001", "saved": true }`

### 3.2 GET /api/v1/history?child_id={id}

**用途**: 获取指定孩子的播放历史（保留最近100条，见 05 决策 C-03）

**data**:
```json
{
  "total": 45,
  "page": 1,
  "page_size": 20,
  "list": [
    { "history_id": "h_001", "content_type": "story", "content_id": "A001_孔融让梨",
      "title": "孔融让梨", "played_at": "2026-07-16T10:30:00Z" }
  ]
}
```

### 3.3 DELETE /api/v1/history/{id}

**用途**: 删除单条历史。**data**: `{ "success": true }`

### 3.4 DELETE /api/v1/history?child_id={id}

**用途**: 清空指定孩子的历史。**data**: `{ "success": true, "deleted_count": 45 }`

### 3.5 收藏接口

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| GET | /api/v1/favorites | 获取当前家长账号共享的收藏列表（上限500） |
| POST | /api/v1/favorites | 添加收藏（body 含 content_type、content_id，不含 child_id） |
| DELETE | /api/v1/favorites/{id} | 取消收藏 |

**收藏列表 data**:
```json
{
  "total": 12,
  "list": [
    { "favorite_id": "f_001", "content_type": "story", "content_id": "A001_孔融让梨",
      "title": "孔融让梨", "cover_url": "/illustrations/covers/generated/A/A01诚实勇敢/A001.jpg" }
  ]
}
```

---

## 4. 歌曲相关接口

### 4.1 歌曲全局索引（CDN静态）

**CDN路径**: `https://cdn.example.com/index/songs/_global.json`（同索引，不走 `/api/v1`）

**结构**:
```json
{
  "schema_version": "1.0",
  "content_version": "2026-07-16",
  "categories": [
    { "id": "classic", "name": "经典儿歌", "cover_image_url": "/illustrations/song_covers/classic.jpg", "song_count": 1280 }
  ],
  "stats": { "total_categories": 4, "total_songs": 3100 },
  "featured_playlists": [
    { "playlist_id": "PL001_睡前摇篮曲", "title": "睡前摇篮曲", "scene": "🌙 睡前",
      "song_count": 23, "total_duration": 2700, "cover_url": "/illustrations/song_covers/PL001.jpg" }
  ],
  "hot_songs": [
    { "song_id": "S001_两只老虎", "title": "两只老虎", "category": "经典儿歌",
      "duration": 72, "play_count": 23456, "cover_url": "/illustrations/song_covers/S001.jpg" }
  ]
}
```

> `featured_playlists` 与 `hot_songs` 各 4 个；歌曲数量口径详见 08 §0.1。

### 4.2 歌曲详情（MVP 静态索引，不提供业务 API）

> 当前后端不提供 `/api/v1/songs/{song_id}`。歌曲信息、音频和 LRC 均由歌曲静态索引给出并走 CDN；以下仅作为静态索引条目结构示例。内容管线完成后由前端直接加载对应 JSON/LRC。

**路径参数**: `song_id`（如 `S001_两只老虎`）

**data**:
```json
{
  "song_id": "S001_两只老虎",
  "title": "两只老虎",
  "language": "zh",
  "duration": 72,
  "cover_url": "/illustrations/song_covers/S001.jpg",
  "audio_url": "/generated_stories/原创儿歌/经典儿歌/儿歌/S001_两只老虎.mp3",
  "lrc_url": "/generated_stories/原创儿歌/经典儿歌/儿歌/S001_两只老虎.lrc",
  "lyrics": [
    { "time": 0, "text_zh": "两只老虎，两只老虎", "text_en": "" },
    { "time": 5, "text_zh": "跑得快，跑得快", "text_en": "" }
  ]
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| language | string | `zh`/`en`/`bilingual` |
| audio_url / lrc_url | string | 歌曲音频/歌词（路径对齐 02 §4.4：`generated_stories/原创儿歌/{分类}/{子分类}/`） |
| lyrics[].time | number | 时间戳（秒） |
| lyrics[].text_zh / text_en | string | 中/英文歌词（双语歌曲填 text_en） |

---

## 5. 教育学习接口

> 朋友等级统一用 `current_stage 0/1/2/3`（见 §0.6）。**判分在服务端完成**，题目接口**不下发正确答案**。

### 5.1 GET /api/v1/progress/{subject}?child_id={id}

**用途**: 获取指定孩子的学科朋友等级列表（课程列表页用）

**路径参数**: `subject`（识字/拼音/英语）  
**查询参数**: `child_id`（必填）、`stage`（0/1/2/3 按等级筛选，可选）、`page`、`page_size`（`page_size` 上限 100）

**请求示例**:
```
GET /api/v1/progress/识字?child_id=child_001&stage=3&page=1&page_size=20
```

**data**:
```json
{
  "subject": "识字",
  "total": 2500,
  "page": 1,
  "page_size": 20,
  "words": [
    {
      "word_id": "的_001",
      "word": "的",
      "pinyin": "de",
      "current_stage": 3,
      "stage_name": "好伙伴",
      "stroke_count": 8
    },
    {
      "word_id": "是_001",
      "word": "是",
      "pinyin": "shì",
      "current_stage": 1,
      "stage_name": "已相识",
      "stroke_count": 9
    }
  ]
}
```

> 注：`pinyin` / `stroke_count` 需真实词库接入后才返回；当前 `listBySubject` 仅返回 `word_id / word / current_stage / stage_name`（真实词库到位前，上例两字段为占位，见深度审查 F12/F1）。

### 5.2 GET /api/v1/vocabulary/{word_id}?child_id={id}

**用途**: 获取字词详情（课程详情页用）

**data**:
```json
{
  "word_id": "的_001",
  "word": "的",
  "pinyin": "de",
  "current_stage": 1,
  "stage_name": "已相识",
  "stroke_count": 8,
  "strokes": [
    { "order": 1, "path": "M10,10 L50,10", "animation_duration": 500 }
  ],
  "learning_modules": [
    { "module_id": "learn_1", "title": "学习1：认读", "type": "recognition", "is_vip": false, "completed": true },
    { "module_id": "learn_2", "title": "学习2：组词", "type": "word_formation", "is_vip": true, "completed": false },
    { "module_id": "learn_3", "title": "学习3：造句", "type": "sentence_making", "is_vip": true, "completed": false }
  ],
  "examples": [
    { "sentence": "我的书", "audio_url": "/audio/学科启蒙/识字/例句/的_001_example.mp3" }
  ],
  "test_available": true
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| strokes | array | 笔画路径（用于动画） |
| learning_modules[].is_vip | boolean | 是否需权益（课程级付费：识字/英语前 10 课 seq0-9=false，第 11 课起=true；拼音下线） |
| test_available | boolean | 是否可发起普通挑战 |

### 5.3 POST /api/v1/progress/study

**用途**: 提交学习完成（听/学习模块），驱动 current_stage 0→1

**请求体**:
```json
{ "child_id": "child_001", "word_id": "的_001", "study_type": "recognition" }
```

**data**: `{ "success": true, "current_stage": 1, "stage_name": "已相识" }`

### 5.4 GET /api/v1/test/quiz/{word_id}?child_id={id}

**用途**: 获取普通挑战题目（随机4题：1听音+1选拼音+2选词，纯随机抽取）

> **服务端判分**：题目选项**不含 `is_correct`**，正确答案保存在服务端，前端仅提交所选。

**data**:
```json
{
  "test_id": "test_20260716_001",
  "word_id": "的_001",
  "questions": [
    {
      "question_id": "q1",
      "type": "recognition",
      "audio_url": "/audio/学科启蒙/识字/测试/的_001_test.mp3",
      "options": [
        { "option_id": "A", "character": "的" },
        { "option_id": "B", "character": "地" },
        { "option_id": "C", "character": "得" }
      ]
    }
  ]
}
```

### 5.5 POST /api/v1/test/quiz/{word_id}

**用途**: 提交普通挑战答案（服务端判分，全对则 test_passed→好朋友，current_stage 1→2）

**请求体**:
```json
{
  "test_id": "test_20260716_001",
  "child_id": "child_001",
  "answers": [
    { "question_id": "q1", "selected_option": "A", "answer_time": 5 }
  ]
}
```

**data**:
```json
{
  "test_passed": true,
  "score": 100,
  "results": [
    { "question_id": "q1", "is_correct": true, "correct_option": "A" }
  ],
  "feedback": "太棒了！你答对了！",
  "current_stage": 2,
  "stage_name": "好朋友"
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| test_passed | boolean | 是否全对通过 |
| results[].is_correct | boolean | 服务端判定的对错 |
| results[].correct_option | string | 正确选项（判分后返回，用于复盘） |
| current_stage | number | 更新后的朋友等级（见 §0.6） |

### 5.6 综合挑战接口

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| GET | /api/v1/test/comprehensive/auto?child_id={id} | 检查是否可自动触发（返回攒满10个好朋友的字列表） |
| POST | /api/v1/test/comprehensive/auto | 提交自动触发的综合挑战（body 含 child_id，10题，8/10 通过→好伙伴） |
| POST | /api/v1/test/comprehensive/manual/start | 主动选择 10 个不同字/词并获取 `test_id + questions` |
| POST | /api/v1/test/comprehensive/manual | 提交主动综合挑战答案（同自动挑战提交结构） |
| GET | /api/v1/test/comprehensive/history?child_id={id} | 综合挑战历史记录 |

**提交综合挑战 data**（服务端判分）:
先调用 GET 获取 `test_id` 和 10 道不含答案的 `questions`；提交时只传选择结果：

```json
{
  "child_id": "child_001",
  "subject": "识字",
  "test_id": "ct_1720000000000_xxxxxxxx",
  "answers": [
    { "question_id": "的_001_q1", "selected_option": "A" }
  ]
}
```

**响应 data**：
```json
{
  "passed": true,
  "correct_count": 9,
  "total": 10,
  "per_char_results": [
    { "word_id": "的_001", "passed": true, "current_stage": 3 },
    { "word_id": "是_001", "passed": false, "current_stage": 2 }
  ]
}
```

> **只升不降**（对齐 02/13）：综合挑战未通过时，答错的字/词（`per_char_results` 中 `passed=false`）**保持原等级，不回落**；答对才晋升至好伙伴。

---

## 6. 成长/家长/档案接口

### 6.1 GET /api/v1/progress/summary?child_id={id}

**用途**: 学习进度总览（成长首页用）

**data**:
```json
{
  "child_id": "child_001",
  "child_name": "小明",
  "age": 5,
  "overall_stats": {
    "total_words_learned": 156,
    "total_words_mastered": 89,
    "total_stories_played": 45
  },
  "subject_progress": [
    { "subject": "识字", "total_words": 2500, "learned": 120, "tested": 80, "mastered": 56, "progress_percentage": 4.8 },
    { "subject": "拼音", "total_words": 400, "learned": 50, "tested": 30, "mastered": 20, "progress_percentage": 12.5 }
  ],
  "recent_activities": [
    { "type": "story_completed", "content_id": "A001_孔融让梨", "completed_at": "2026-07-16T10:30:00Z" },
    { "type": "test_passed", "word_id": "的_001", "score": 100, "completed_at": "2026-07-16T09:15:00Z" }
  ]
}
```

### 6.2 陪伴养成（成就/收集册）

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| GET | /api/v1/achievements/{child_id} | 成就列表（贴纸+称号+朋友册节点） |
| GET | /api/v1/achievements/{child_id}/collection | 朋友收集册可视化（各学科好朋友/好伙伴数量，见 13号） |

### 6.3 家长中心

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| GET | /api/v1/parent/settings | 获取家长设置（含睡眠定时挡位等） |
| PUT | /api/v1/parent/settings | (settings 写入仅接受原始类型、限键数/长度) 更新家长设置 |
| GET | /api/v1/parent/progress/summary?child_id={id} | 当前孩子累计成长总览 |
| GET | /api/v1/parent/progress/weekly?child_id={id} | 本周成长概览（本周新增：已相识/好朋友/好伙伴） |
| GET | /api/v1/parent/progress/detail?child_id={id} | 成长明细（逐字/词状态及时间，支持学科筛选） |

**家长看板 data 示例**:
```json
{
  "children": [
    { "child_id": "child_001", "child_name": "小明", "age": 5, "avatar_url": "/avatars/child_001.jpg" }
  ],
  "weekly_stats": { "stories_completed": 8, "tests_passed": 15, "new_words_learned": 23 },
  "recommendations": [
    { "type": "encourage", "message": "已经交到 89 个好伙伴啦，真棒！", "action_url": "/growth" }
  ]
}
```

### 6.4 孩子档案

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| GET | /api/v1/children | 获取孩子档案列表 |
| POST | /api/v1/children | 创建孩子档案 |
| PUT | /api/v1/children/{id} | 编辑孩子档案 |
| DELETE | /api/v1/children/{id} | 至少保留 1 个(删最后一个→400)；孩子档案 |

---

## 7. 会员与订单接口

> 会员+支付进 MVP（决策 R3）。套餐定价见 01号 PR-010：月卡¥9.9（早鸟价）/季卡¥26/年卡¥88（主推）。

### 7.1 GET /api/v1/membership

**用途**: 获取当前会员状态

**data**:
```json
{
  "status": "active",
  "plan_type": "yearly",
  "start_date": "2026-07-16",
  "end_date": "2027-07-16",
  "auto_renew": false
}
```

> `plan_type`=monthly/quarterly/yearly；`status`=active/expired/cancelled（已过期会员在查询会员/门控校验时读时落库为 expired）（对齐 02 §3 memberships 表）。

### 7.2 订单接口

| 方法 | 路径 | 说明 |
|:--|:--|:--|
| POST | /api/v1/orders | 创建订单（发起微信支付，body 含 plan_type） |
| GET | /api/v1/orders | 获取订单列表 |
| GET | /api/v1/orders/{id} | 获取订单详情 |
| POST | /api/v1/orders/{id}/cancel | 取消订单 |

**创建订单 data**（返回微信支付调起参数）:
```json
{
  "order_no": "ORD20260716001",
  "plan_type": "yearly",
  "amount": 88.0,
  "status": "pending",
  "pay_params": {
    "timeStamp": "1737000000",
    "nonceStr": "xxxx",
    "package": "prepay_id=wx...",
    "signType": "RSA",
    "paySign": "xxxx"
  }
}
```

> `status`=待支付/已支付/失败/已退款/已取消（对齐 02 §3 orders 表）。支付结果由微信支付回调更新，前端可轮询 `GET /api/v1/orders/{id}` 确认；会员续期由服务端事务+行锁保证并发多笔订单不丢时长。

---

## 8. 搜索接口

### 8.1 MVP 搜索实现（客户端本地索引）

> 当前不提供 `/api/v1/search`。MVP 由小程序加载 `_global.json`/各级静态索引后在本地匹配标题与学科，避免引入一套与 CDN 内容重复的数据库。内容量或检索需求超过端侧能力后，再新增服务端搜索 API。

**客户端查询参数**: `q`（关键词）、`type`（all/story/song/word，默认all）

**data**:
```json
{
  "keyword": "孔融",
  "total": 5,
  "page": 1,
  "page_size": 20,
  "results": [
    { "type": "story", "id": "A001_孔融让梨", "title": "孔融让梨", "subject": "A", "level": "L5",
      "duration": 900, "cover_url": "/illustrations/covers/generated/A/A01诚实勇敢/A001.jpg", "match_field": "title" },
    { "type": "word", "id": "孔_001", "word": "孔", "pinyin": "kǒng", "current_stage": 0, "match_field": "word" }
  ],
  "hot_keywords": ["孔融让梨", "诚实", "孝顺", "勇敢"]
}
```

**字段说明**:
| 字段 | 类型 | 说明 |
|:--|:--|:--|
| results[].type | string | `story`/`song`/`word` |
| results[].match_field | string | 匹配字段：title/word/text |
| hot_keywords | array | 热门搜索词 |

> 服务端搜索为后续扩展：如启用，优先采用 PostgreSQL 全文检索/`ILIKE`，不提前引入 Elasticsearch。

---

## 9. 埋点接口

### 9.1 POST /api/v1/track

**用途**: 上报埋点事件（含付费漏斗事件，见 01号埋点清单）

**请求体**:
```json
{
  "child_id": "child_001",
  "event": "pay_show",
  "properties": { "page": "member", "plan_type": "yearly" },
  "timestamp": "2026-07-16T10:30:00Z"
}
```

**data**: `{ "success": true }`

> 付费相关事件：`pay_show`（付费页曝光）/`pay_click`（点击购买）/`pay_success`（支付成功）/`member_expire`（会员到期）等，口径以 01号《埋点清单》为准。
> `child_id` 可选；传入时服务端必须校验属于当前 JWT 用户，不能用埋点污染其他孩子档案。

---

## 10. 管理后台接口

> 管理后台使用独立的 `role=admin` 短期 JWT，不复用小程序用户 token。release/production 必须配置 `ADMIN_USERNAME` 和 scrypt 口令。

### 10.1 POST /api/v1/admin/auth/login

**认证**：Public（按 IP 20 次/分钟）

```json
{ "username": "ops-admin", "password": "至少12位管理密码" }
```

**data**：

```json
{ "access_token": "jwt...", "expires_in": "8h" }
```

账号或密码错误统一返回 `code=401`，不区分具体错误项。

### 10.2 GET /api/v1/admin/stats

**认证**：`Authorization: Bearer {admin_token}`

**data**：

```json
{
  "date": "2026-07-23",
  "active_users": 12,
  "story_plays": 48,
  "challenge_passes": 9,
  "paid_orders": 2,
  "payment_conversion": 0.25
}
```

`active_users` 按当日埋点去重用户计算；`payment_conversion` 为当日已支付订单数 / 当日全部订单数，无订单时为 0。

---

## 11. 通用说明

### 11.1 认证方式

见 §0.2。微信登录换取 JWT，后续请求统一携带 `Authorization: Bearer {token}`。

### 11.2 数据更新策略

| 数据类型 | 更新频率 | 缓存策略 |
|:--|:--|:--|
| 索引文件（CDN静态） | 每日凌晨更新 | CDN 24小时 |
| 故事/歌曲音频（CDN静态） | 一次性生成 | CDN 永久 |
| 用户进度/学习状态 | 实时更新 | 不缓存 |
| 订单/会员状态 | 实时更新 | 不缓存 |

### 11.3 速率限制

| 接口类型 | 限制 | 说明 |
|:--|:--|:--|
| 索引/音频（CDN） | 不限 | 走 CDN |
| 登录 / 订单接口 | 20次/分钟 | 防暴力登录与重复下单 |
| 学习/挑战接口 | 60次/分钟 | 防止刷分 |
| 搜索接口 | 30次/分钟 | 防止滥用 |
| 其他 `/api/v1` | 100次/分钟 | 通用限流 |

超限返回 `code=429`（见 §0.4）。

### 11.4 Mock数据说明

**开发环境使用 Mock 数据**（对齐 08 本地开发实施步骤）:
```javascript
// src/services/mock/api.ts
export const mockGlobalIndex = { schema_version: "1.1", content_version: "2026-07-14", subjects: [] };
```

**切换真实API**:
```javascript
// config/dev.ts
export const USE_MOCK = true; // 改为 false 使用真实API
```

---

## 🔗 相关文档

- [02-技术架构设计.md](02-技术架构设计.md) - **API 权威口径来源**（§4 规范、§3 DDL）
- [01-PRD产品需求文档.md](01-PRD产品需求文档.md) - 埋点清单、会员定价 PR-010
- [03-内容架构与数据流设计.md](03-内容架构与数据流设计.md) - 数据 Schema 定义
- [08-本地开发实施步骤.md](08-本地开发实施步骤.md) - 资产数量唯一源(§0.1)、建表 SQL
- [13-陪伴养成系统设计.md](13-陪伴养成系统设计.md) - 朋友等级/养成话术权威源

---

**最后更新**: 2026-07-23 by Codex（补后台鉴权/统计、限流与整改后契约）
