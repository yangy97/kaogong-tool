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
  publishedXhsAt?: string | null
  publishedDouyinAt?: string | null
  xhsPublishCount: number
  douyinPublishCount: number
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
  publishedXhsAt?: string | null
  publishedDouyinAt?: string | null
  xhsPublishCount: number
  douyinPublishCount: number
}

export interface PublishLogRecord {
  id: number
  questionSetId: number
  platform: 'xhs' | 'douyin'
  postDate: string
  publishedAt: string
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
  published_xhs_at?: Date | string | null
  published_douyin_at?: Date | string | null
  xhs_publish_count?: number
  douyin_publish_count?: number
}

interface DailyPostRow extends RowDataPacket {
  post_date: Date | string
  questions: string | Question[]
  question_set_id: number | null
  xhs_question_set_id: number | null
  douyin_question_set_id: number | null
}

interface PublishLogRow extends RowDataPacket {
  id: number
  question_set_id: number
  platform: 'xhs' | 'douyin'
  post_date: Date | string
  published_at: Date | string
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
  return getDayBefore(getTodayDateStr())
}

/** 指定日期的前一天（本地日历） */
export function getDayBefore(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  return formatLocalDate(date)
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
    publishedXhsAt: row.published_xhs_at ? normalizeSavedAt(row.published_xhs_at) : null,
    publishedDouyinAt: row.published_douyin_at ? normalizeSavedAt(row.published_douyin_at) : null,
    xhsPublishCount: row.xhs_publish_count ?? 0,
    douyinPublishCount: row.douyin_publish_count ?? 0,
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
    publishedXhsAt: row.published_xhs_at ? normalizeSavedAt(row.published_xhs_at) : null,
    publishedDouyinAt: row.published_douyin_at ? normalizeSavedAt(row.published_douyin_at) : null,
    xhsPublishCount: row.xhs_publish_count ?? 0,
    douyinPublishCount: row.douyin_publish_count ?? 0,
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

export interface DailyPostSnapshot {
  date: string
  questions: Question[]
  questionSetId: number | null
  xhsQuestionSetId: number | null
  douyinQuestionSetId: number | null
}

async function getDailyPostRow(date: string): Promise<DailyPostRow | null> {
  const pool = getPool()
  const [rows] = await pool.query<DailyPostRow[]>(
    `SELECT post_date, questions, question_set_id, xhs_question_set_id, douyin_question_set_id
     FROM daily_posts WHERE post_date = ? LIMIT 1`,
    [date],
  )
  return rows[0] ?? null
}

/** 正式打卡：脚本修复或发布时写入 */
export async function upsertDailyPost(
  date: string,
  questions: Question[],
  options?: {
    questionSetId?: number
    xhsQuestionSetId?: number
    douyinQuestionSetId?: number
  },
): Promise<void> {
  const pool = getPool()
  const nowLocal = formatLocalDateTime()
  const setId = options?.questionSetId ?? null
  const xhsId = options?.xhsQuestionSetId ?? null
  const douyinId = options?.douyinQuestionSetId ?? null
  await pool.query(
    `INSERT INTO daily_posts
      (post_date, questions, question_set_id, xhs_question_set_id, douyin_question_set_id, saved_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       questions = VALUES(questions),
       question_set_id = VALUES(question_set_id),
       xhs_question_set_id = COALESCE(VALUES(xhs_question_set_id), xhs_question_set_id),
       douyin_question_set_id = COALESCE(VALUES(douyin_question_set_id), douyin_question_set_id),
       updated_at = ?`,
    [date, serializeQuestionsForDb(questions), setId, xhsId, douyinId, nowLocal, nowLocal, nowLocal],
  )
}

async function updateDailyPostOnPublish(
  record: QuestionSetRecord,
  platform: 'xhs' | 'douyin',
): Promise<void> {
  const pool = getPool()
  const nowLocal = formatLocalDateTime()
  const questionsJson = serializeQuestionsForDb(record.questions)
  const platformCol = platform === 'xhs' ? 'xhs_question_set_id' : 'douyin_question_set_id'
  const existing = await getDailyPostRow(record.postDate)

  if (!existing) {
    await pool.query(
      `INSERT INTO daily_posts
        (post_date, questions, question_set_id, xhs_question_set_id, douyin_question_set_id, saved_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        record.postDate,
        questionsJson,
        record.id,
        platform === 'xhs' ? record.id : null,
        platform === 'douyin' ? record.id : null,
        nowLocal,
        nowLocal,
      ],
    )
    return
  }

  await pool.query(
    `UPDATE daily_posts
     SET questions = ?, question_set_id = ?, ${platformCol} = ?, updated_at = ?
     WHERE post_date = ?`,
    [questionsJson, record.id, record.id, nowLocal, record.postDate],
  )
}

/** 记录发布点击：写日志、累加次数、更新分平台打卡 */
export async function recordQuestionSetPublish(
  questionSetId: number,
  platform: 'xhs' | 'douyin',
): Promise<{ record: QuestionSetRecord; publishCount: number }> {
  const record = await getQuestionSetById(questionSetId)
  if (!record) throw new Error('历史记录不存在')

  const pool = getPool()
  const nowLocal = formatLocalDateTime()
  const countCol = platform === 'xhs' ? 'xhs_publish_count' : 'douyin_publish_count'
  const atCol = platform === 'xhs' ? 'published_xhs_at' : 'published_douyin_at'

  await pool.query(
    `INSERT INTO publish_logs (question_set_id, platform, post_date, published_at)
     VALUES (?, ?, ?, ?)`,
    [questionSetId, platform, record.postDate, nowLocal],
  )
  await pool.query(
    `UPDATE question_sets SET ${countCol} = ${countCol} + 1, ${atCol} = ? WHERE id = ?`,
    [nowLocal, questionSetId],
  )
  await updateDailyPostOnPublish(record, platform)

  const updated = await getQuestionSetById(questionSetId)
  if (!updated) throw new Error('发布记录更新失败')
  const publishCount = platform === 'xhs' ? updated.xhsPublishCount : updated.douyinPublishCount
  return { record: updated, publishCount }
}

/** @deprecated 使用 recordQuestionSetPublish */
export async function markQuestionSetPublished(
  questionSetId: number,
  platform: 'xhs' | 'douyin',
): Promise<QuestionSetRecord> {
  const { record } = await recordQuestionSetPublish(questionSetId, platform)
  return record
}

export async function listPublishLogsForSet(questionSetId: number): Promise<PublishLogRecord[]> {
  const pool = getPool()
  const [rows] = await pool.query<PublishLogRow[]>(
    `SELECT id, question_set_id, platform, post_date, published_at
     FROM publish_logs WHERE question_set_id = ?
     ORDER BY published_at DESC`,
    [questionSetId],
  )
  return rows.map((row) => ({
    id: row.id,
    questionSetId: row.question_set_id,
    platform: row.platform,
    postDate: normalizeDate(row.post_date),
    publishedAt: normalizeSavedAt(row.published_at),
  }))
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

async function loadQuestionsForSetId(setId: number | null): Promise<Question[] | null> {
  if (!setId) return null
  const record = await getQuestionSetById(setId)
  return record?.questions ?? null
}

/** 按平台取某日正式打卡（优先分平台 ID，回退通用 ID / JSON） */
export async function getPostByDateForPlatform(
  date: string,
  platform: 'xhs' | 'douyin',
): Promise<{ date: string; questions: Question[]; questionSetId: number | null } | null> {
  const row = await getDailyPostRow(date)
  if (!row) return null

  const platformSetId =
    platform === 'xhs' ? row.xhs_question_set_id : row.douyin_question_set_id
  const fallbackSetId = row.question_set_id
  const resolvedSetId = platformSetId ?? fallbackSetId

  const fromSet = await loadQuestionsForSetId(resolvedSetId)
  const questions = fromSet ?? parseQuestions(row.questions)

  return {
    date: normalizeDate(row.post_date),
    questions,
    questionSetId: resolvedSetId,
  }
}

export async function getPostByDate(date: string): Promise<{ date: string; questions: Question[] } | null> {
  const snap = await getPostByDateForPlatform(date, 'xhs')
  if (snap) return { date: snap.date, questions: snap.questions }
  const row = await getDailyPostRow(date)
  if (!row) return null
  return {
    date: normalizeDate(row.post_date),
    questions: parseQuestions(row.questions),
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
            question_count, questions, source, saved_at,
            published_xhs_at, published_douyin_at,
            xhs_publish_count, douyin_publish_count
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
            question_count, questions, source, saved_at,
            published_xhs_at, published_douyin_at,
            xhs_publish_count, douyin_publish_count
     FROM question_sets WHERE id = ? LIMIT 1`,
    [id],
  )
  if (!rows.length) return null
  return toRecord(rows[0])
}
