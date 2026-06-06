/**
 * 同步 daily_posts 为正确的昨日答案数据源：
 * 1. 某日有 publish_logs → 按平台取最近发布的 question_set
 * 2. 否则同日多套题 → 优先 AI 刷题，取最晚一套（排除后续词汇误生成）
 * 3. 已知日期可手动指定（修复历史误覆盖）
 *
 * 用法：cd server && npx tsx scripts/sync-daily-posts.ts
 */
import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'
import type { Question } from '../src/types/index'
import { upsertDailyPost } from '../src/services/postArchiveService'

interface SetRow {
  id: number
  post_date: string
  source: 'ai' | 'vocab'
  saved_at: string | Date
  questions: string | Question[]
  published_xhs_at: string | Date | null
  published_douyin_at: string | Date | null
  module_name: string
  topic_name: string | null
}

/** 手动纠正：post_date → question_set id */
const MANUAL_MAP: Record<string, number> = {
  '2026-06-03': 3,
  '2026-06-04': 4,
  '2026-06-05': 5,
  '2026-06-06': 7,
}

function parseQs(raw: string | Question[]): Question[] {
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

function toTime(raw: string | Date | null): number {
  if (!raw) return 0
  const t = raw instanceof Date ? raw.getTime() : Date.parse(String(raw))
  return Number.isNaN(t) ? 0 : t
}

function pickBestSet(sets: SetRow[], manualId?: number): SetRow {
  if (manualId) {
    const hit = sets.find((s) => s.id === manualId)
    if (hit) return hit
  }

  const published = sets
    .filter((s) => s.published_xhs_at || s.published_douyin_at)
    .sort((a, b) => {
      const ta = Math.max(toTime(a.published_xhs_at), toTime(a.published_douyin_at))
      const tb = Math.max(toTime(b.published_xhs_at), toTime(b.published_douyin_at))
      return tb - ta
    })
  if (published.length) return published[0]

  const aiSets = sets
    .filter((s) => s.source === 'ai')
    .sort((a, b) => toTime(b.saved_at) - toTime(a.saved_at))
  if (aiSets.length) return aiSets[0]

  return [...sets].sort((a, b) => toTime(b.saved_at) - toTime(a.saved_at))[0]
}

await initMysql()
const pool = getPool()

const [rows] = await pool.query<SetRow[]>(
  `SELECT id, DATE_FORMAT(post_date,'%Y-%m-%d') AS post_date, source, saved_at, questions,
          published_xhs_at, published_douyin_at, module_name, topic_name
   FROM question_sets ORDER BY post_date, saved_at`,
)

const byDate = new Map<string, SetRow[]>()
for (const row of rows) {
  const list = byDate.get(row.post_date) ?? []
  list.push(row)
  byDate.set(row.post_date, list)
}

for (const [date, sets] of byDate) {
  const best = pickBestSet(sets, MANUAL_MAP[date])
  const questions = parseQs(best.questions)
  await upsertDailyPost(date, questions, {
    questionSetId: best.id,
    xhsQuestionSetId: best.id,
    douyinQuestionSetId: best.id,
  })
  console.log(
    `daily_posts[${date}] ← #${best.id} ${best.module_name}/${best.topic_name ?? '-'} (${best.source})`,
  )
}

const [check] = await pool.query(
  `SELECT DATE_FORMAT(dp.post_date,'%Y-%m-%d') AS d,
          dp.question_set_id AS set_id,
          dp.xhs_question_set_id AS xhs_id,
          dp.douyin_question_set_id AS dy_id,
          JSON_UNQUOTE(JSON_EXTRACT(dp.questions,'$[0].moduleName')) AS module,
          JSON_UNQUOTE(JSON_EXTRACT(dp.questions,'$[0].topicName')) AS topic
   FROM daily_posts dp ORDER BY dp.post_date`,
)
console.log('\n当前 daily_posts:', check)
