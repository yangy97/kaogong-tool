import type { TuxingData, TuxingFigure, TuxingGridFigure } from '../types/tuxing'

function isGrid(fig: TuxingFigure | null | undefined): fig is TuxingGridFigure {
  return !!fig && fig.kind === 'grid'
}

function gridFilledCount(fig: TuxingFigure | null | undefined): number | null {
  return isGrid(fig) ? fig.filled.length : null
}

function parseAnswerKey(answer: string): string {
  const m = answer.trim().toUpperCase().match(/[A-D]/)
  return m?.[0] ?? 'A'
}

/** 根据 tuxing 实际涂黑格数重写解析，避免 AI 文案与图形不一致 */
export function syncTuxingAnalysis(
  tuxing: TuxingData,
  answer: string,
  expertPrefix?: string,
): string {
  const seqFigs = tuxing.sequence.filter(isGrid)
  if (seqFigs.length < 2) {
    return buildShapesFallback(tuxing, answer, expertPrefix)
  }

  const seqCounts = seqFigs.map((f) => f.filled.length)
  const key = parseAnswerKey(answer)
  const idx = 'ABCD'.indexOf(key)
  const ansFig = idx >= 0 ? tuxing.options[idx] : null
  const ansCount = gridFilledCount(ansFig)

  const diff = seqCounts.length >= 2 ? seqCounts[seqCounts.length - 1]! - seqCounts[seqCounts.length - 2]! : 0
  const nextExpected =
    seqCounts.length >= 1 && diff !== 0
      ? seqCounts[seqCounts.length - 1]! + diff
      : seqCounts[seqCounts.length - 1]! + 1

  const countsLabel = seqCounts.join('、')
  let rule = ''
  if (diff === 1 || seqCounts.every((c, i) => i === 0 || c - seqCounts[i - 1]! === 1)) {
    rule = `涂黑格数依次为 ${countsLabel}，规律为每次增加 1，下一图应为 ${nextExpected} 格`
  } else if (diff !== 0) {
    rule = `涂黑格数依次为 ${countsLabel}，差值为 ${diff}，下一图应为 ${nextExpected} 格`
  } else {
    rule = `涂黑格数依次为 ${countsLabel}，下一图应为 ${nextExpected} 格`
  }

  const optPart =
    ansCount != null
      ? ansCount === nextExpected
        ? `选项 ${key} 为 ${ansCount} 格，符合规律，选 ${key}。`
        : `选项 ${key} 为 ${ansCount} 格，选 ${key}。`
      : `选 ${key}。`

  const body = `${rule}，${optPart}`
  return expertPrefix ? `${expertPrefix}${body}` : body
}

function buildShapesFallback(tuxing: TuxingData, answer: string, expertPrefix?: string): string {
  const key = parseAnswerKey(answer)
  const body = `观察图形变化规律，选项 ${key} 符合，选 ${key}。`
  return expertPrefix ? `${expertPrefix}${body}` : body
}

/** 校验 grid 题型：序列与选项均为 grid */
export function isGridTuxing(tuxing: TuxingData): boolean {
  const seqOk = tuxing.sequence.filter(Boolean).every((f) => isGrid(f))
  const optOk = tuxing.options.every(isGrid)
  return seqOk && optOk && tuxing.sequence.filter(Boolean).length >= 2
}
