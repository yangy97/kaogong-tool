import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'

await initMysql()
const pool = getPool()
const [sets] = await pool.query(
  `SELECT id, DATE_FORMAT(post_date,'%Y-%m-%d') as d, module_name, topic_name, source,
          published_xhs_at, published_douyin_at
   FROM question_sets ORDER BY id`,
)
const [daily] = await pool.query(
  `SELECT DATE_FORMAT(post_date,'%Y-%m-%d') as d, question_set_id,
          JSON_UNQUOTE(JSON_EXTRACT(questions,'$[0].topicName')) as topic
   FROM daily_posts ORDER BY post_date`,
)
console.log('question_sets:', sets)
console.log('daily_posts:', daily)
