import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null
let ready = false

export function getMysqlConfig() {
  return {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'kaogong_tool',
  }
}

export function isMysqlReady(): boolean {
  return ready
}

export async function initMysql(): Promise<boolean> {
  const cfg = getMysqlConfig()
  try {
    const admin = await mysql.createConnection({
      host: cfg.host,
      port: cfg.port,
      user: cfg.user,
      password: cfg.password,
    })
    await admin.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    )
    await admin.end()

    pool = mysql.createPool({
      ...cfg,
      waitForConnections: true,
      connectionLimit: 10,
      /** 与 Node 进程本地时区一致，读写 DATETIME 不按 UTC 偏移 */
      timezone: process.env.MYSQL_TIMEZONE || 'local',
    })

    const conn = await pool.getConnection()
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_posts (
        post_date DATE NOT NULL PRIMARY KEY,
        questions JSON NOT NULL,
        question_set_id BIGINT UNSIGNED DEFAULT NULL,
        xhs_question_set_id BIGINT UNSIGNED DEFAULT NULL,
        douyin_question_set_id BIGINT UNSIGNED DEFAULT NULL,
        saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS publish_logs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        question_set_id BIGINT UNSIGNED NOT NULL,
        platform ENUM('xhs', 'douyin') NOT NULL,
        post_date DATE NOT NULL,
        published_at DATETIME NOT NULL,
        INDEX idx_set_platform (question_set_id, platform),
        INDEX idx_post_date (post_date),
        INDEX idx_published_at (published_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS question_sets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        post_date DATE NOT NULL,
        module_id VARCHAR(64) NOT NULL DEFAULT '',
        module_name VARCHAR(64) NOT NULL DEFAULT '',
        topic_id VARCHAR(64) DEFAULT NULL,
        topic_name VARCHAR(128) DEFAULT NULL,
        question_count INT UNSIGNED NOT NULL DEFAULT 0,
        questions JSON NOT NULL,
        source ENUM('ai', 'vocab') NOT NULL DEFAULT 'ai',
        saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        published_xhs_at DATETIME DEFAULT NULL,
        published_douyin_at DATETIME DEFAULT NULL,
        xhs_publish_count INT UNSIGNED NOT NULL DEFAULT 0,
        douyin_publish_count INT UNSIGNED NOT NULL DEFAULT 0,
        INDEX idx_post_date (post_date),
        INDEX idx_saved_at (saved_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    const migrations = [
      'ALTER TABLE daily_posts ADD COLUMN question_set_id BIGINT UNSIGNED DEFAULT NULL',
      'ALTER TABLE daily_posts ADD COLUMN xhs_question_set_id BIGINT UNSIGNED DEFAULT NULL',
      'ALTER TABLE daily_posts ADD COLUMN douyin_question_set_id BIGINT UNSIGNED DEFAULT NULL',
      'ALTER TABLE question_sets ADD COLUMN published_xhs_at DATETIME DEFAULT NULL',
      'ALTER TABLE question_sets ADD COLUMN published_douyin_at DATETIME DEFAULT NULL',
      'ALTER TABLE question_sets ADD COLUMN xhs_publish_count INT UNSIGNED NOT NULL DEFAULT 0',
      'ALTER TABLE question_sets ADD COLUMN douyin_publish_count INT UNSIGNED NOT NULL DEFAULT 0',
    ]
    for (const sql of migrations) {
      try {
        await conn.query(sql)
      } catch (err) {
        const code = (err as { code?: string }).code
        if (code !== 'ER_DUP_FIELDNAME') throw err
      }
    }
    conn.release()

    ready = true
    console.log(`[mysql] 已连接 ${cfg.host}:${cfg.port}/${cfg.database}`)
    return true
  } catch (err) {
    ready = false
    console.error('[mysql] 初始化失败:', err instanceof Error ? err.message : err)
    console.error(
      '[mysql] 请检查 server/.env 中的 MYSQL_* 配置，并确认本地 MySQL 已启动',
    )
    return false
  }
}

export function getPool(): mysql.Pool {
  if (!pool || !ready) {
    throw new Error('MySQL 未就绪，请检查数据库配置与服务是否已启动')
  }
  return pool
}
