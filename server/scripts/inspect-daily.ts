import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'
import type { Question } from '../src/types/index'

await initMysql()
const pool = getPool()

const [sets] = await pool.query(
  `SELECT id, post_date, module_name, topic_name, saved_at FROM question_sets ORDER BY id`,
)
console.log('question_sets:')
for (const s of sets as Array<Record<string, unknown>>) {
  console.log(s.id, s.post_date, s.topic_name, s.saved_at)
}

const [days] = await pool.query(
  `SELECT post_date, JSON_LENGTH(questions) AS n,
          JSON_UNQUOTE(JSON_EXTRACT(questions, '$[0].topicName')) AS t0,
          updated_at FROM daily_posts ORDER BY post_date`,
)
console.log('\ndaily_posts:')
for (const d of days as Array<Record<string, unknown>>) {
  console.log(d.post_date, 'n=' + d.n, 'topic0=' + d.t0, d.updated_at)
}
