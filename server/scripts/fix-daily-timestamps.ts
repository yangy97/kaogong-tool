/**
 * 恢复 daily_posts 时间戳：昨日不应出现今日的 updated_at；统一为本地时间。
 */
import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'
import { toLocalDateTimeString } from '../src/services/postArchiveService'

await initMysql()
const pool = getPool()

const [sets] = await pool.query(
  'SELECT id, post_date, saved_at FROM question_sets WHERE id IN (3, 4)',
)
const byId = new Map(
  (sets as Array<{ id: number; saved_at: Date | string }>).map((r) => [r.id, r]),
)

const saved3 = toLocalDateTimeString(byId.get(3)!.saved_at)
const saved4 = toLocalDateTimeString(byId.get(4)!.saved_at)

// 昨日：仅恢复内容时已误触 updated_at，改回与首次打卡 saved_at 一致
await pool.query(
  `UPDATE daily_posts SET saved_at = ?, updated_at = ? WHERE post_date = '2026-06-03'`,
  [saved3, saved3],
)

// 今日：saved_at 对齐 question_sets #4；updated_at 与 saved_at 一致（内容修正不单独刷时间）
await pool.query(
  `UPDATE daily_posts SET saved_at = ?, updated_at = ? WHERE post_date = '2026-06-04'`,
  [saved4, saved4],
)

const [check] = await pool.query(
  `SELECT DATE_FORMAT(post_date,'%Y-%m-%d') AS d, saved_at, updated_at,
          JSON_UNQUOTE(JSON_EXTRACT(questions,'$[0].topicName')) AS topic
   FROM daily_posts ORDER BY post_date`,
)
console.log('daily_posts 时间已恢复（本地时间，与 question_sets 对齐）：')
console.table(check)
