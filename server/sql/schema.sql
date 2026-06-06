-- 考公助手 kaogong_tool 数据库结构
-- 与 server/src/db/mysql.ts 中 initMysql() 保持一致
-- 使用：mysql -u root -p < server/sql/schema.sql

CREATE DATABASE IF NOT EXISTS `kaogong_tool`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `kaogong_tool`;

-- ---------------------------------------------------------------------------
-- daily_posts：每日正式打卡（仅用户点击发布时写入，供「昨日答案揭晓」）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `daily_posts` (
  `post_date` DATE NOT NULL COMMENT '打卡日期 YYYY-MM-DD',
  `questions` JSON NOT NULL COMMENT '当日完整题目 JSON（含 options/answer/analysis/tuxing）',
  `question_set_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '最近发布关联 question_sets.id',
  `xhs_question_set_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '小红书正式打卡 question_sets.id',
  `douyin_question_set_id` BIGINT UNSIGNED DEFAULT NULL COMMENT '抖音正式打卡 question_sets.id',
  `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '首次写入时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后一次覆盖时间',
  PRIMARY KEY (`post_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='每日打卡：仅发布时写入，分平台记录正式题目套号';

-- ---------------------------------------------------------------------------
-- publish_logs：每次点击「一键发布」记一条
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `publish_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键',
  `question_set_id` BIGINT UNSIGNED NOT NULL COMMENT '发布的题目套 question_sets.id',
  `platform` ENUM('xhs', 'douyin') NOT NULL COMMENT '发布平台',
  `post_date` DATE NOT NULL COMMENT '题目所属日期',
  `published_at` DATETIME NOT NULL COMMENT '点击发布时间',
  PRIMARY KEY (`id`),
  INDEX `idx_set_platform` (`question_set_id`, `platform`),
  INDEX `idx_post_date` (`post_date`),
  INDEX `idx_published_at` (`published_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='发布点击日志：统计次数、追溯哪套题发到哪个平台';

-- ---------------------------------------------------------------------------
-- question_sets：每次生成 INSERT 一条，历史列表不互相覆盖
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `question_sets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '自增主键，历史列表 #id',
  `post_date` DATE NOT NULL COMMENT '生成日期',
  `module_id` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '模块 ID，如 panduan',
  `module_name` VARCHAR(64) NOT NULL DEFAULT '' COMMENT '模块名，如 判断推理',
  `topic_id` VARCHAR(64) DEFAULT NULL COMMENT '考点 ID',
  `topic_name` VARCHAR(128) DEFAULT NULL COMMENT '考点名，如 前提假设',
  `question_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '题目数量',
  `questions` JSON NOT NULL COMMENT '完整题目 JSON 数组',
  `source` ENUM('ai', 'vocab') NOT NULL DEFAULT 'ai' COMMENT '来源：AI 出题 / 词汇题',
  `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '存档时间',
  `published_xhs_at` DATETIME DEFAULT NULL COMMENT '最近发布到小红书时间',
  `published_douyin_at` DATETIME DEFAULT NULL COMMENT '最近发布到抖音时间',
  `xhs_publish_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '小红书发布点击次数',
  `douyin_publish_count` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '抖音发布点击次数',
  PRIMARY KEY (`id`),
  INDEX `idx_post_date` (`post_date`),
  INDEX `idx_saved_at` (`saved_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='历史题目：每次生成都新增一条';

-- ---------------------------------------------------------------------------
-- questions JSON 单题字段说明（非表列，存于 JSON 内）
-- ---------------------------------------------------------------------------
-- id, moduleId, moduleName, topicId, topicName
-- type: single | multiple | essay | vocab
-- stem, options[{key,text}], answer, analysis, difficulty
-- expertTag, expertStyleLabel, tags[], tuxing（图形题）

-- ---------------------------------------------------------------------------
-- 常用查询示例
-- ---------------------------------------------------------------------------

-- 历史列表（按时间倒序）
-- SELECT id, post_date, module_name, topic_name, question_count, source, saved_at
-- FROM question_sets ORDER BY saved_at DESC LIMIT 20;

-- 某日打卡内容（昨日答案）
-- SELECT post_date, JSON_LENGTH(questions) AS cnt, saved_at, updated_at
-- FROM daily_posts WHERE post_date = '2026-06-03';

-- 打卡天数（发布标题 DAY{n}）
-- SELECT COUNT(*) FROM daily_posts WHERE post_date <= '2026-06-03';

-- 查看某套题答案分布
-- SELECT id,
--   JSON_EXTRACT(questions, '$[0].answer') AS q1,
--   JSON_EXTRACT(questions, '$[1].answer') AS q2,
--   JSON_EXTRACT(questions, '$[2].answer') AS q3
-- FROM question_sets WHERE id = 3;
