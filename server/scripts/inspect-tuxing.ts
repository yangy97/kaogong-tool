import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'

await initMysql()
const pool = getPool()
const [rows] = await pool.query(
  `SELECT id, topic_name, questions FROM question_sets
   WHERE topic_name LIKE '%图形%' OR JSON_EXTRACT(questions, '$[0].tuxing') IS NOT NULL
   ORDER BY id`,
)
for (const r of rows as Array<{ id: number; topic_name: string; questions: unknown }>) {
  const qs = typeof r.questions === 'string' ? JSON.parse(r.questions) : r.questions
  for (const q of qs as Array<{ tuxing?: { sequence: unknown[]; options: unknown[] } }>) {
    if (!q?.tuxing) continue
    console.log('--- set', r.id, r.topic_name)
    console.log(
      'sequence:',
      q.tuxing.sequence?.map((f) =>
        f && typeof f === 'object' && 'filled' in f
          ? (f as { filled: unknown[] }).filled?.length
          : 'null',
      ),
    )
    console.log(
      'options:',
      q.tuxing.options?.map((f, i) => {
        const filled =
          f && typeof f === 'object' && 'filled' in f
            ? (f as { filled: unknown[] }).filled
            : f
        return `${'ABCD'[i]}:${JSON.stringify(filled)}`
      }),
    )
  }
}
