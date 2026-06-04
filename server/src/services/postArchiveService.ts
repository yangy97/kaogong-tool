import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import { getPool } from '../db/mysql'
import type { Question } from '../types/index'
import {
  detectQuestionContentFlags,
  formatPreviewStem,
  parseQuestionsFromDb,
  serializeQuestionsForDb,
} from '../utils/questionArchive'

export interface QuestionSetRecord {
  id: number
  postDate: string
  moduleId: string
  moduleName: string
  topicId?: string
  topicName?: string
  questionCount: number
  questions: Question[]
  source: 'ai' | 'vocab'
  savedAt: string
}

export interface QuestionSetSummary {
  id: number
  postDate: string
  moduleId: string
  moduleName: string
  topicId?: string
  topicName?: string
  questionCount: number
  source: 'ai' | 'vocab'
  savedAt: string
  previewStem: string
  hasTuxing: boolean
  hasTable: boolean
}

interface QuestionSetRow extends RowDataPacket {
  id: number
  post_date: Date | string
  module_id: string
  module_name: string
  topic_id: string | null
  topic_name: string | null
  question_count: number
  questions: string | Question[]
  source: 'ai' | 'vocab'
  saved_at: Date | string
}

interface CountRow extends RowDataPacket {
  total: number
}

export function formatLocalDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** MySQL DATETIME 用本地时区，避免 toISOString / NOW() 与北京时间差 8 小时 */
export function formatLocalDateTime(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const h = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  const s = String(d.getSeconds()).padStart(2, '0')
  return `${y}-${m}-${day} ${h}:${min}:${s}`
}

/** 将 DB 读出的 Date / 字符串格式化为本地 DATETIME 字符串 */
export function toLocalDateTimeString(value: Date | string): string {
  if (value instanceof Date) return formatLocalDateTime(value)
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) return s
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? s : formatLocalDateTime(d)
}

export function getTodayDateStr(): string {
  return formatLocalDate(new Date())
}

export function getYesterdayDateStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return formatLocalDate(d)
}

function normalizeDate(value: Date | string): string {
  if (value instanceof Date) {
    return formatLocalDate(value)
  }
  return String(value).slice(0, 10)
}

/** 返回给前端的存档时间（本地时间字符串，避免 toISOString 少 8 小时） */
function normalizeSavedAt(value: Date | string): string {
  return toLocalDateTimeString(value)
}

function parseQuestions(raw: string | Question[]): Question[] {
  return parseQuestionsFromDb(raw)
}

function toSummary(row: QuestionSetRow): QuestionSetSummary {
  const questions = parseQuestions(row.questions)
  const flags = detectQuestionContentFlags(questions)
  return {
    id: row.id,
    postDate: normalizeDate(row.post_date),
    moduleId: row.module_id,
    moduleName: row.module_name,
    topicId: row.topic_id ?? undefined,
    topicName: row.topic_name ?? undefined,
    questionCount: row.question_count,
    source: row.source,
    savedAt: normalizeSavedAt(row.saved_at),
    previewStem: formatPreviewStem(questions[0]?.stem ?? ''),
    hasTuxing: flags.hasTuxing,
    hasTable: flags.hasTable,
  }
}

function toRecord(row: QuestionSetRow): QuestionSetRecord {
  return {
    id: row.id,
    postDate: normalizeDate(row.post_date),
    moduleId: row.module_id,
    moduleName: row.module_name,
    topicId: row.topic_id ?? undefined,
    topicName: row.topic_name ?? undefined,
    questionCount: row.question_count,
    questions: parseQuestions(row.questions),
    source: row.source,
    savedAt: normalizeSavedAt(row.saved_at),
  }
}

function extractMeta(questions: Question[], source: 'ai' | 'vocab') {
  const first = questions[0]
  return {
    moduleId: first?.moduleId ?? '',
    moduleName: first?.moduleName ?? '考公',
    topicId: first?.topicId ?? null,
    topicName: first?.topicName ?? null,
    questionCount: questions.length,
    source,
  }
}

/** 每次生成都 INSERT 新记录，同一天多次生成不会互相覆盖 */
export async function saveQuestionSet(
  questions: Question[],
  source: 'ai' | 'vocab' = 'ai',
): Promise<QuestionSetRecord> {
  const pool = getPool()
  const postDate = getTodayDateStr()
  const meta = extractMeta(questions, source)

  const savedAtLocal = formatLocalDateTime()
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO question_sets
      (post_date, module_id, module_name, topic_id, topic_name, question_count, questions, source, saved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      postDate,
      meta.moduleId,
      meta.moduleName,
      meta.topicId,
      meta.topicName,
      meta.questionCount,
      serializeQuestionsForDb(questions),
      meta.source,
      savedAtLocal,
    ],
  )

  const saved = await getQuestionSetById(Number(result.insertId))
  if (!saved) throw new Error('题目存档失败')
  return saved
}

/** 兼容次日答案：仍更新 daily_posts（当日最后一次生成作为「正式打卡」） */
export async function upsertDailyPost(date: string, questions: Question[]): Promise<void> {
  const pool = getPool()
  const nowLocal = formatLocalDateTime()
  await pool.query(
    `INSERT INTO daily_posts (post_date, questions, saved_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       questions = VALUES(questions),
       updated_at = ?`,
    [date, serializeQuestionsForDb(questions), nowLocal, nowLocal, nowLocal],
  )
}

/** 按 daily_posts 累计打卡天数（含当日），用于标题 DAY 序号 */
export async function getDayNumberForDate(date: string): Promise<number> {
  const pool = getPool()
  const [rows] = await pool.query<CountRow[]>(
    'SELECT COUNT(*) AS total FROM daily_posts WHERE post_date <= ?',
    [date],
  )
  return Math.max(1, rows[0]?.total ?? 1)
}

export async function getPostByDate(date: string): Promise<{ date: string; questions: Question[] } | null> {
  const pool = getPool()
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT post_date, questions FROM daily_posts WHERE post_date = ? LIMIT 1',
    [date],
  )
  if (!rows.length) return null
  const row = rows[0]
  return {
    date: normalizeDate(row.post_date as Date | string),
    questions: parseQuestions(row.questions as string | Question[]),
  }
}

export async function listQuestionSets(
  page = 1,
  pageSize = 20,
): Promise<{ items: QuestionSetSummary[]; total: number; page: number; pageSize: number }> {
  const pool = getPool()
  const offset = (page - 1) * pageSize

  const [countRows] = await pool.query<CountRow[]>('SELECT COUNT(*) AS total FROM question_sets')
  const total = countRows[0]?.total ?? 0

  const [rows] = await pool.query<QuestionSetRow[]>(
    `SELECT id, post_date, module_id, module_name, topic_id, topic_name,
            question_count, questions, source, saved_at
     FROM question_sets
     ORDER BY saved_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset],
  )

  return {
    items: rows.map(toSummary),
    total,
    page,
    pageSize,
  }
}

export async function getQuestionSetById(id: number): Promise<QuestionSetRecord | null> {
  const pool = getPool()
  const [rows] = await pool.query<QuestionSetRow[]>(
    `SELECT id, post_date, module_id, module_name, topic_id, topic_name,
            question_count, questions, source, saved_at
     FROM question_sets WHERE id = ? LIMIT 1`,
    [id],
  )
  if (!rows.length) return null
  return toRecord(rows[0])
}
