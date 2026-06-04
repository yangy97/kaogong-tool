/**
 * 修正 question_sets #4 中因答案分散导致的错题（Q2/Q3）
 * 运行：npx tsx scripts/fix-set-4.ts
 */
import 'dotenv/config'
import { initMysql, getPool } from '../src/db/mysql'
import type { Question } from '../src/types/index'
import { formatLocalDate } from '../src/services/postArchiveService'
import { serializeQuestionsForDb } from '../src/utils/questionArchive'

const SET_ID = 4

function parseQs(raw: unknown): Question[] {
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as Question[])
}

await initMysql()
const pool = getPool()

const [rows] = await pool.query(
  'SELECT id, post_date, questions FROM question_sets WHERE id = ?',
  [SET_ID],
)
const row = (rows as Array<{ id: number; post_date: string; questions: unknown }>)[0]
if (!row) {
  console.error('未找到 question_sets id=', SET_ID)
  process.exit(1)
}

const questions = parseQs(row.questions)
const postDate =
  row.post_date instanceof Date
    ? formatLocalDate(row.post_date)
    : String(row.post_date).slice(0, 10)

// Q1：答案 D（乙=上海+Java）正确，仅精简解析
const q0 = questions[0]
if (q0) {
  q0.answer = 'D'
  q0.analysis =
    '由(2)(6)乙=上海且擅Java，与选项D一致；A中甲=深圳=Rust可成立但非必然；C中丙=Python与(8)戊=Python冲突；B中丁擅Go与(7)冲突。选D。'
}

// Q2：题干条件(1)(5)与(2)互斥，标答改为说明性解析（建议重新生成）
const q1 = questions[1]
if (q1) {
  q1.answer = 'A'
  q1.analysis =
    '由(1)(3)得E>C>A>B且E>C>D；又(5)要求B=(E+C)/2，则E>B>C，与C>A>B矛盾。条件(2)亦使E不能为最高。本题条件自相矛盾，建议重新生成；若强行排序则E>C>A>B>D最接近(1)(3)。'
}

// Q3：正确答案为 D（研发部 2 人 30-35）
const q2 = questions[2]
if (q2) {
  q2.answer = 'D'
  q2.analysis =
    '行政2H+1L→M=0；财务1H+2L→M=0；全公司H=5、L=4→余H=2归销售、L=1归研发；销售M=1，研发M=2。选D。'
}

const json = serializeQuestionsForDb(questions)
await pool.query('UPDATE question_sets SET questions = ? WHERE id = ?', [json, SET_ID])

// 仅当 prepare 已写入当日打卡时才同步 daily_posts（勿用 UTC 日期误改昨日）
const [dailyRows] = await pool.query(
  'SELECT post_date FROM daily_posts WHERE post_date = ? LIMIT 1',
  [postDate],
)
if ((dailyRows as unknown[]).length > 0) {
  await pool.query(`UPDATE daily_posts SET questions = ? WHERE post_date = ?`, [json, postDate])
  console.log('已更新 question_sets #' + SET_ID + ' 与 daily_posts ' + postDate)
} else {
  console.log('已更新 question_sets #' + SET_ID + '（未改动 daily_posts，请执行 prepare 或 restore-daily-dates）')
}
questions.forEach((q, i) => {
  console.log(`Q${i + 1} answer=${q.answer}`)
  console.log('  ', q.analysis)
})
