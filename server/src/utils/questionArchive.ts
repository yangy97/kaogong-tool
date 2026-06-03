import type { Question } from '../types/index'
import { normalizeStemTables } from './stemFormat'
import { isGridTuxing, syncTuxingAnalysis } from './tuxingAnalysisSync'
import { normalizeTuxingFromAi } from './tuxingNormalize'

export interface QuestionContentFlags {
  hasTuxing: boolean
  hasTable: boolean
}

const TABLE_PATTERN = /\|.+\|/

/** 写入数据库：整题 JSON 序列化（含 tuxing、stem 内 Markdown 表格等） */
export function serializeQuestionsForDb(questions: Question[]): string {
  return JSON.stringify(questions)
}

/** 从数据库读出后规范化，确保图形与表格可正确渲染 */
export function parseQuestionsFromDb(raw: string | Question[]): Question[] {
  const list: Question[] = Array.isArray(raw)
    ? structuredClone(raw)
    : (JSON.parse(raw) as Question[])

  if (!Array.isArray(list)) {
    throw new Error('题目存档格式无效')
  }

  return list.map(normalizeQuestionFromDb)
}

function normalizeQuestionFromDb(q: Question): Question {
  const stem = normalizeStemTables(q.stem ?? '')
  let tuxing = q.tuxing
  let analysis = q.analysis

  if (tuxing) {
    const normalized = normalizeTuxingFromAi(tuxing)
    if (normalized) tuxing = normalized
  }

  if (tuxing && isGridTuxing(tuxing)) {
    analysis = syncTuxingAnalysis(tuxing, q.answer)
  }

  return { ...q, stem, tuxing, analysis }
}

export function detectQuestionContentFlags(questions: Question[]): QuestionContentFlags {
  return {
    hasTuxing: questions.some((q) => !!q.tuxing),
    hasTable: questions.some((q) => TABLE_PATTERN.test(q.stem ?? '')),
  }
}

export function formatPreviewStem(stem: string, maxLen = 60): string {
  const plain = stem
    .replace(TABLE_PATTERN, '[表格]')
    .replace(/\n+/g, ' ')
    .trim()
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain
}
