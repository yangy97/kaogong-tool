import type { TuxingData } from '../types/tuxing'
import { figureSignature } from './tuxingFigures'
import { isGridTuxing, syncTuxingAnalysis } from './tuxingAnalysisSync'
import { repairGridTuxingWithVariant } from './tuxingRepair'

export interface TuxingQuestionLike {
  stem?: string
  answer: string
  analysis: string
  tuxing?: TuxingData
}

/** 整题图形指纹（不含 imageUrls） */
export function tuxingDataSignature(tuxing: TuxingData): string {
  const seq = tuxing.sequence.map((f) => (f ? figureSignature(f) : 'null')).join('>')
  const opt = tuxing.options.map(figureSignature).join('>')
  return `${seq}::${opt}`
}

export function findDuplicateTuxingIndices(questions: TuxingQuestionLike[]): number[] {
  const seen = new Map<string, number>()
  const dupes: number[] = []
  questions.forEach((q, i) => {
    if (!q.tuxing) return
    const sig = tuxingDataSignature(q.tuxing)
    const prev = seen.get(sig)
    if (prev != null) dupes.push(i + 1)
    else seen.set(sig, i)
  })
  return dupes
}

export function hasDuplicateTuxingInBatch(questions: TuxingQuestionLike[]): boolean {
  return findDuplicateTuxingIndices(questions).length > 0
}

export function buildTuxingDiversityRetryHint(count: number, dupIndices: number[]): string {
  const idx = dupIndices.join('、')
  return [
    `上次输出不合格：第 ${idx} 题与前面某题 tuxing 图形完全相同（重复）。`,
    `请重新生成全部 ${count} 道题：每题 sequence 涂黑格坐标、规律须互不相同；`,
    '禁止复制上一题的 filled 坐标；黑白块题可选用平移/对称/递增等不同规律。',
  ].join('')
}

export interface DeduplicateBatchOptions {
  topicId?: string
  expertPrefix?: string
}

/** 批内重复图形：用不同 variant 重生成网格题，并同步解析 */
export function deduplicateBatchTuxing<Q extends TuxingQuestionLike>(
  questions: Q[],
  opts?: DeduplicateBatchOptions,
): Q[] {
  const used = new Set<string>()

  return questions.map((q, i) => {
    if (!q.tuxing) return q

    let sig = tuxingDataSignature(q.tuxing)
    if (!used.has(sig)) {
      used.add(sig)
      return q
    }

    if (!isGridTuxing(q.tuxing)) {
      used.add(sig)
      return q
    }

    let variant = i + 1
    let tuxing = q.tuxing
    let guard = 0
    while (used.has(tuxingDataSignature(tuxing)) && guard < 24) {
      tuxing = repairGridTuxingWithVariant(tuxing, q.answer, variant * 11 + i * 3)
      variant++
      guard++
    }

    const newSig = tuxingDataSignature(tuxing)
    used.add(newSig)

    const analysis = syncTuxingAnalysis(tuxing, q.answer, opts?.expertPrefix)
    return {
      ...q,
      tuxing: { ...tuxing, imageUrls: undefined },
      analysis,
    }
  })
}
