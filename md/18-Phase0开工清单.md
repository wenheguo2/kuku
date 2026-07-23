# 18 - Phase 0 开工清单

> **定位**: Phase 0（第 1-3 周）的**可勾选执行清单**，是 [04-开发计划与里程碑](04-开发计划与里程碑.md) §2 排期与 [08-本地开发实施步骤](08-本地开发实施步骤.md) 的执行提炼。**本文只列"做什么/做没做"，具体命令与 SQL 以 08 号为准，不重复正文。**
> **目标读者**: 一人团队（你自己）/ 开工执行
> **落地方式**: 按三条并行泳道推进；R5 硬门槛——泳道 B 依赖 TTS 全部生成完成，不与代码开发抢跑上线。

---

## 0. 建表脚本核对结论（✅ 已核对，可直接开工）

08 §2.2 的 **12 张表**与 02 §3 / 11 号 API 权威口径一致，作为当前建库基线：

| 检查项 | 结论 |
|:--|:--|
| 表齐全 | users / consent_records / child_profiles / favorites / play_history / learning_progress / comprehensive_tests / child_achievements / parent_settings / events / memberships / orders |
| 四级朋友 | `learning_progress.current_stage SMALLINT CHECK IN (0,1,2,3)`（对齐 02/11/13） |
| 学习标志 | `study1/2/3_completed`、`test_passed`、`comprehensive_passed` |
| 服务端判分 | `comprehensive_tests.per_char_results / question_ids / answers`（题目答案不下发前端） |
| 会员支付(R3) | `memberships`(plan_type monthly/quarterly/yearly) + `orders`(amount/status/payment_channel) 已就绪 |
| 埋点(R3) | `events.event_name` 承载 pay_show/pay_click/pay_success/member_expire |
| 睡眠定时(R1) | `parent_settings.timer_minutes` |
| 废弃字段 | 08 无 `used_question_ids`（仅 02 保留 + 注释废弃），干净 |

> ⚠️ **开工必读**：`learning_progress` / `comprehensive_tests` 的 `child_id` 为 `NOT NULL`，成长/四级朋友模块 Sprint 2 即使用。**MVP 虽为"单孩子"，微信登录 API 必须"无档案则自动创建默认 `child_profile`"**，否则成长数据无法落库。多孩子档案管理仍在 Phase 2。

---

## 1. 🟢 泳道 A：立即可做（不依赖 TTS，本周启动）

- [x] PostgreSQL 15 + Redis(Memurai) 本地部署（08 §1.1/§1.2）
- [x] 本地 `kuku_stories` 已幂等创建 `consent_records`，验证 12 表、8 列、唯一约束与索引；15/15 e2e 通过（2026-07-23）
- [x] NestJS 后端骨架初始化，凭据统一引用 `.env`（不入库）
- [x] Taro（React + TypeScript + **SCSS**）小程序骨架
- [x] Vue 3 + Element Plus 管理后台基线：独立服务端鉴权、只读内容索引、真实数据库聚合统计（P1，非 MVP 阻塞）
- [ ] 生产管道脚本开发 + 单测（08 §3）：
  - [ ] 故事整曲 MP3 合并
  - [ ] 教学合并 MP3 + timeline.json
  - [ ] 歌曲 LRC 生成（Whisper，远端 4080 已就绪，用现有数据先测）
- [x] **`_global.json` 全局索引构建脚本**（现由脚本生成；资产数量仍以 08 §0.1 为准）
- [x] 索引校验脚本（`11_validate_index.py`，用于检查已产出的索引）
- [x] 微信登录 API：无档案建默认 `child_profile`，并强制监护人同意版本留痕

---

## 2. 🟠 泳道 B：等 TTS 全部完成才能做（R5 硬门槛）

> 触发条件：故事 / 教学 / 歌曲 TTS **全部生成完成**（口径见 06 §2.5）。

- [ ] 批量执行管道：整曲 MP3 / timeline.json / LRC 全量生成（对应里程碑 M0.2）
- [ ] 透明底立绘 / 场景 / 封面 WebP 已完成，新增封面增量重跑规格化
- [ ] 全量资产上传 OSS + CDN 刷新（索引 / 音频 / 图片）
- [ ] 按 06 §2.5 ETA 公式持续测算关键路径（当前缺口：歌曲差 ~1,501 首、教学 F3 拼音 <15%）

---

## 3. 🔵 泳道 C：并行前置（不依赖代码，周期最长，越早越好）

> 依据 [17-合规资质备案执行指南](17-合规资质备案执行指南.md)，本周即可启动。

- [ ] 主体资质（营业执照，建议企业主体）
- [ ] 域名 + 云服务器采购 + 域名实名认证
- [ ] ICP 备案（云商初审 1-2 天 + 管局 ≤20 工作日）
- [ ] 微信小程序备案 + 微信认证（¥300/年）
- [ ] 微信支付商户号申请（付费前必备，配合 R3）
- [ ] 软著登记（MVP 代码能跑后提交，提前约 1 个月排队）

---

## 4. ⏰ 月底前（2026-07-31）遗留项

> 详见 [审查归档/文档一致性审查报告_v3_修订说明](审查归档/文档一致性审查报告_v3_修订说明.md) §六。当前先不动，到期前处理。

- [ ] 轮换密钥/凭据（历史明文凭据在服务商侧重置，确认 `.env` 已进 `.gitignore`）
- [ ] 物理目录改名 `瞎编的歌曲/` → `原创儿歌/`，同步管道脚本路径常量、索引 JSON 字段、CDN 已上传路径
- [ ] `_global.json` 生成（同泳道 A）

---

## 5. Phase 0 里程碑（出自 04 §2.3）

| 里程碑 | 时点 | 判据 |
|:--|:--|:--|
| **M0.1** | 第 1 周末 | 索引文件完整、生产管道脚本就绪（先用已有数据测试） |
| **M0.2** | 第 2 周末 | 整曲 MP3 + timeline + LRC + 透明底立绘全部生成（**依赖 TTS 全完成**），本地静态服务可访问 |
| **M0.3** | 第 3 周末 | 后端骨架可运行、PostgreSQL 部署完成、小程序可启动 |

---

> 维护提示：本清单为执行视图，排期口径以 04 号为准、实施细节以 08 号为准；如有冲突以 04/08 正文为权威。
