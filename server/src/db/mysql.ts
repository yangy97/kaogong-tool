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
    })

    const conn = await pool.getConnection()
    await conn.query(`
      CREATE TABLE IF NOT EXISTS daily_posts (
        post_date DATE NOT NULL PRIMARY KEY,
        questions JSON NOT NULL,
        saved_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
        INDEX idx_post_date (post_date),
        INDEX idx_saved_at (saved_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
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
