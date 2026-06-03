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

function normalizeSavedAt(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString()
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString()
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

  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO question_sets
      (post_date, module_id, module_name, topic_id, topic_name, question_count, questions, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      postDate,
      meta.moduleId,
      meta.moduleName,
      meta.topicId,
      meta.topicName,
      meta.questionCount,
      serializeQuestionsForDb(questions),
      meta.source,
    ],
  )

  const saved = await getQuestionSetById(Number(result.insertId))
  if (!saved) throw new Error('题目存档失败')
  return saved
}

/** 兼容次日答案：仍更新 daily_posts（当日最后一次生成作为「正式打卡」） */
export async function upsertDailyPost(date: string, questions: Question[]): Promise<void> {
  const pool = getPool()
  const savedAt = new Date().toISOString().slice(0, 19).replace('T', ' ')
  await pool.query(
    `INSERT INTO daily_posts (post_date, questions, saved_at)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE questions = VALUES(questions), saved_at = VALUES(saved_at)`,
    [date, serializeQuestionsForDb(questions), savedAt],
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
