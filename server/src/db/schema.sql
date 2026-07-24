-- ============================================================
-- 酷酷儿童故事 — 数据库初始化脚本 (PostgreSQL 15)
-- 权威口径：md/08 §2.2（12 张表 + 全部索引）
-- 用途：本地/云端建表基线。应用以 kuku_app 连接，synchronize=false，实体仅映射不建表。
-- 执行：psql -U postgres -d kuku_stories -f schema.sql
-- ============================================================

-- 1. 用户表 -------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  openid VARCHAR(64) UNIQUE NOT NULL,
  union_id VARCHAR(64),
  nickname VARCHAR(64),
  avatar_url VARCHAR(512),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 监护人协议同意留痕 -------------------------------------
CREATE TABLE IF NOT EXISTS consent_records (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(32) NOT NULL DEFAULT 'guardian' CHECK (consent_type = 'guardian'),
  user_agreement_version VARCHAR(64) NOT NULL,
  privacy_version VARCHAR(64) NOT NULL,
  children_privacy_version VARCHAR(64) NOT NULL,
  agreed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  withdrawn_at TIMESTAMP,
  UNIQUE(user_id, user_agreement_version, privacy_version, children_privacy_version)
);
CREATE INDEX IF NOT EXISTS idx_consent_user_time ON consent_records(user_id, agreed_at DESC);

-- 3. 孩子档案表 (支持多孩子) --------------------------------
CREATE TABLE IF NOT EXISTS child_profiles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  child_name VARCHAR(32) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_child_user ON child_profiles(user_id);

-- 4. 收藏表 (按账号共享，不分 child_id) ---------------------
CREATE TABLE IF NOT EXISTS favorites (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('story','song','lesson')),
  content_id VARCHAR(256) NOT NULL,
  content_title VARCHAR(256),
  subject_id VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_user_type ON favorites(user_id, content_type);

-- 5. 播放历史 (按 child_id 隔离) ----------------------------
CREATE TABLE IF NOT EXISTS play_history (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  child_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  content_type VARCHAR(16) NOT NULL CHECK (content_type IN ('story','song','lesson')),
  content_id VARCHAR(256) NOT NULL,
  content_title VARCHAR(256),
  subject_id VARCHAR(64),
  last_position_ms INT DEFAULT 0,
  last_segment INT,
  duration_ms INT DEFAULT 0,
  played_count INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_id, content_type, content_id)
);
CREATE INDEX IF NOT EXISTS idx_history_child_time ON play_history(child_id, updated_at DESC);

-- 6. 学习进度 (四级朋友系统，word 级) -----------------------
CREATE TABLE IF NOT EXISTS learning_progress (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  child_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  subject VARCHAR(16) NOT NULL CHECK (subject IN ('识字','英语','拼音')),
  word_id VARCHAR(64) NOT NULL,
  word_text VARCHAR(32),
  current_stage SMALLINT NOT NULL DEFAULT 0 CHECK (current_stage IN (0, 1, 2, 3)),
  study1_completed BOOLEAN DEFAULT FALSE,
  study2_completed BOOLEAN DEFAULT FALSE,
  study3_completed BOOLEAN DEFAULT FALSE,
  test_passed BOOLEAN DEFAULT FALSE,
  comprehensive_passed BOOLEAN DEFAULT FALSE,
  last_study_type VARCHAR(16) CHECK (last_study_type IN ('study1','study2','study3','test','comprehensive')),
  test_count INT DEFAULT 0,
  comprehensive_count INT DEFAULT 0,
  last_test_failed BOOLEAN DEFAULT FALSE,
  last_test_at TIMESTAMP,
  retry_used INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_id, word_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_child ON learning_progress(child_id);
CREATE INDEX IF NOT EXISTS idx_progress_subject ON learning_progress(child_id, subject);
CREATE INDEX IF NOT EXISTS idx_progress_stage ON learning_progress(child_id, subject, current_stage);
-- 只升不降·无惩罚·无间隔复习：已移除 last_reviewed_at/review_due_at/needs_review 三列与 idx_progress_review 索引。
-- 已建库升级（本地执行一次）：
--   DROP INDEX IF EXISTS idx_progress_review;
--   ALTER TABLE learning_progress DROP COLUMN IF EXISTS last_reviewed_at,
--                                 DROP COLUMN IF EXISTS review_due_at,
--                                 DROP COLUMN IF EXISTS needs_review;

-- 7. 综合挑战记录 -------------------------------------------
CREATE TABLE IF NOT EXISTS comprehensive_tests (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  child_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  subject VARCHAR(16) NOT NULL CHECK (subject IN ('识字','英语','拼音')),
  trigger_type VARCHAR(8) NOT NULL CHECK (trigger_type IN ('auto', 'manual')),
  word_ids JSONB NOT NULL,
  question_ids JSONB NOT NULL,
  answers JSONB,
  per_char_results JSONB,
  correct_count INT,
  passed BOOLEAN,
  tested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_comp_test_child ON comprehensive_tests(child_id, tested_at DESC);

-- 8. 孩子成就 (陪伴养成正反馈) ------------------------------
CREATE TABLE IF NOT EXISTS child_achievements (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  child_id BIGINT NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
  achievement_type VARCHAR(32) NOT NULL CHECK (achievement_type IN ('sticker', 'title', 'tree_node')),
  achievement_key VARCHAR(64) NOT NULL,
  achievement_name VARCHAR(64) NOT NULL,
  subject VARCHAR(16) CHECK (subject IN ('识字', '英语', '拼音')),
  metadata JSONB,
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(child_id, achievement_type, achievement_key)
);
CREATE INDEX IF NOT EXISTS idx_achievement_child ON child_achievements(child_id, achievement_type);

-- 9. 家长设置 ----------------------------------------------
CREATE TABLE IF NOT EXISTS parent_settings (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT UNIQUE NOT NULL REFERENCES users(id),
  timer_minutes INT DEFAULT 30,
  settings_json JSONB,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 埋点事件 ---------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  child_id BIGINT REFERENCES child_profiles(id), -- 故意不设 ON DELETE：删档时由应用层置空(children.controller: UPDATE events SET child_id=NULL)，保留埋点行
  event_name VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL CHECK (event_type IN ('story', 'song', 'lesson', 'parent', 'system')),
  content_type VARCHAR(16) CHECK (content_type IN ('story', 'song', 'lesson')),
  content_id VARCHAR(256),
  properties JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_events_user_time ON events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(event_name, created_at DESC);

-- 11. 会员订阅 ---------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  plan_type VARCHAR(16) NOT NULL CHECK (plan_type IN ('monthly','quarterly','yearly')),
  status VARCHAR(16) NOT NULL CHECK (status IN ('active','expired','cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_membership_user ON memberships(user_id, status);

-- 12. 订单 -------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id BIGINT NOT NULL REFERENCES users(id),
  order_no VARCHAR(64) UNIQUE NOT NULL,
  plan_type VARCHAR(16) NOT NULL CHECK (plan_type IN ('monthly','quarterly','yearly')),
  amount DECIMAL(10,2) NOT NULL,
  payment_channel VARCHAR(16),
  status VARCHAR(16) NOT NULL CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

-- 授权给应用账号 kuku_app ----------------------------------
GRANT ALL ON SCHEMA public TO kuku_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO kuku_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO kuku_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kuku_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kuku_app;
