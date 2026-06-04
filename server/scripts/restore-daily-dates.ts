/**
 * 恢复误改的 daily_posts：
 * - 2026-06-03 ← question_sets #3（昨日：前提假设）
 * - 2026-06-04 ← question_sets #4（今日：分析推理，已修正答案）
 */
import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'
import type { Question } from '../src/types/index'
import { serializeQuestionsForDb } from '../src/utils/questionArchive'

function parseQs(raw: unknown): Question[] {
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as Question[])
}

await initMysql()
const pool = getPool()

async function loadSet(id: number): Promise<Question[]> {
  const [rows] = await pool.query('SELECT questions FROM question_sets WHERE id = ?', [id])
  const row = (rows as Array<{ questions: unknown }>)[0]
  if (!row) throw new Error(`question_sets #${id} 不存在`)
  return parseQs(row.questions)
}

const yesterday = '2026-06-03'
const today = '2026-06-04'

const qsYesterday = await loadSet(3)
const qsToday = await loadSet(4)

// 只改题目 JSON，不碰 saved_at / updated_at（时间由 fix-daily-timestamps 单独处理）
await pool.query(`UPDATE daily_posts SET questions = ? WHERE post_date = ?`, [
  serializeQuestionsForDb(qsYesterday),
  yesterday,
])
await pool.query(`UPDATE daily_posts SET questions = ? WHERE post_date = ?`, [
  serializeQuestionsForDb(qsToday),
  today,
])

console.log(`已恢复 daily_posts[${yesterday}] ← question_sets #3（${qsYesterday[0]?.topicName}）`)
console.log(`已同步 daily_posts[${today}] ← question_sets #4（${qsToday[0]?.topicName}）`)

const [check] = await pool.query(
  `SELECT DATE_FORMAT(post_date,'%Y-%m-%d') AS d,
          JSON_UNQUOTE(JSON_EXTRACT(questions,'$[0].topicName')) AS topic
   FROM daily_posts ORDER BY post_date`,
)
console.log('当前 daily_posts:', check)
