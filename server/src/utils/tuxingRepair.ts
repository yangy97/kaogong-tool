import type { TuxingData, TuxingFigure, TuxingGridFigure } from '../types/tuxing'
import { isGridTuxing } from './tuxingAnalysisSync'
import { figureSignature } from './tuxingFigures'
import {
  synthesizeJiemianTuxing,
  synthesizeKongjianTuxing,
  syncTuxingWithAnalysis,
} from './tuxingSynthesize'

function isGrid(fig: TuxingFigure | null | undefined): fig is TuxingGridFigure {
  return !!fig && fig.kind === 'grid'
}

export function gridSignature(fig: TuxingGridFigure): string {
  return [...fig.filled].map(([r, c]) => `${r},${c}`).sort().join('|')
}

function parseAnswerIndex(answer: string): number {
  const m = answer.trim().toUpperCase().match(/[A-D]/)
  const idx = m ? 'ABCD'.indexOf(m[0]) : 0
  return idx >= 0 ? idx : 0
}

/** 在 rows×cols 内生成 count 个涂黑格，variant 控制分布避免与已有图形雷同 */
export function makeGridWithCount(
  rows: number,
  cols: number,
  count: number,
  variant: number,
): TuxingGridFigure {
  const filled: [number, number][] = []
  const used = new Set<string>()
  const target = Math.min(Math.max(count, 1), rows * cols)
  let r = variant % rows
  let c = (variant * 2) % cols
  let guard = 0
  while (filled.length < target && guard < rows * cols * 4) {
    const key = `${r},${c}`
    if (!used.has(key)) {
      used.add(key)
      filled.push([r, c])
    }
    c = (c + 1 + variant) % cols
    if (c === 0) r = (r + 1) % rows
    guard++
  }
  return { kind: 'grid', rows, cols, filled }
}

function inferNextFilledCount(tuxing: TuxingData): number {
  const seqGrids = tuxing.sequence.filter(isGrid)
  const counts = seqGrids.map((g) => g.filled.length).filter((n) => n > 0)
  if (counts.length === 0) {
    const optCounts = tuxing.options.filter(isGrid).map((g) => g.filled.length).filter((n) => n > 0)
    if (optCounts.length) return Math.max(...optCounts)
    return 5
  }
  if (counts.length === 1) return counts[0]! + 1
  const diff = counts[counts.length - 1]! - counts[counts.length - 2]!
  return counts[counts.length - 1]! + (diff !== 0 ? diff : 1)
}

function buildDistractorCounts(correct: number, correctIdx: number): number[] {
  const pool = [correct, correct - 1, correct + 1, correct + 2, correct - 2, correct + 3].filter(
    (v, i, arr) => v >= 1 && arr.indexOf(v) === i,
  )
  const result: number[] = new Array(4)
  result[correctIdx] = correct
  const distractors = pool.filter((v) => v !== correct)
  let di = 0
  for (let i = 0; i < 4; i++) {
    if (i === correctIdx) continue
    result[i] = distractors[di++] ?? correct + i + 2
  }
  return result
}

function sequenceNeedsRepair(tuxing: TuxingData): boolean {
  const valid = tuxing.sequence.filter((f) => isGrid(f) && f.filled.length > 0)
  return valid.length < 2
}

function repairSequence(
  rows: number,
  cols: number,
  nextCount: number,
  variantSeed = 0,
): (TuxingFigure | null)[] {
  const step = 1
  const c3 = Math.max(1, nextCount - step)
  const c2 = Math.max(1, c3 - step)
  const c1 = Math.max(1, c2 - step)
  const base = variantSeed * 5
  return [
    makeGridWithCount(rows, cols, c1, base + 0),
    makeGridWithCount(rows, cols, c2, base + 1),
    makeGridWithCount(rows, cols, c3, base + 2),
    null,
  ]
}

function buildGridTuxing(
  tuxing: TuxingData,
  answer: string,
  variantSeed: number,
  forceSequence: boolean,
): TuxingData {
  const ref = tuxing.options.find(isGrid) ?? tuxing.sequence.find(isGrid)
  const rows = ref?.rows ?? 4
  const cols = ref?.cols ?? 4
  const ansIdx = parseAnswerIndex(answer)
  const correctCount = inferNextFilledCount(tuxing)
  const counts = buildDistractorCounts(correctCount, ansIdx)
  const base = variantSeed * 5
  const options = counts.map((cnt, i) => makeGridWithCount(rows, cols, cnt, base + i * 3 + 1))
  const sequence =
    forceSequence || sequenceNeedsRepair(tuxing)
      ? repairSequence(rows, cols, correctCount, variantSeed)
      : tuxing.sequence
  return { sequence, options }
}

/** 修复重复/空白选项，按规律重新生成 A-D 四个互异网格 */
export function repairGridTuxing(tuxing: TuxingData, answer: string): TuxingData {
  return buildGridTuxing(tuxing, answer, 0, false)
}

/** 批内去重：用 variantSeed 生成不同涂黑格分布 */
export function repairGridTuxingWithVariant(
  tuxing: TuxingData,
  answer: string,
  variantSeed: number,
): TuxingData {
  return buildGridTuxing(tuxing, answer, Math.max(1, variantSeed), true)
}

function isValidFigure(f: TuxingFigure): boolean {
  if (f.kind === 'grid') return f.filled.length > 0
  if (f.kind === 'shapes') return f.items.length > 0
  if (f.kind === 'polygon') return f.polygons.length > 0 && f.polygons.every((p) => p.points.length >= 3)
  if (f.kind === 'voxel') return f.cubes.length > 0
  if (f.kind === 'solid') return !!f.preset
  if (f.kind === 'net') return f.faces.length >= 4
  if (f.kind === 'cube') return true
  return false
}

function hasSpecialTuxing(tuxing: TuxingData): boolean {
  const all = [...tuxing.sequence, ...tuxing.options].filter(Boolean) as TuxingFigure[]
  return all.some(
    (f) =>
      f.kind === 'polygon' ||
      f.kind === 'voxel' ||
      f.kind === 'solid' ||
      f.kind === 'net' ||
      f.kind === 'cube',
  )
}

export function validateTuxingData(tuxing: TuxingData): { ok: boolean; reason?: string } {
  if (tuxing.options.length < 4) return { ok: false, reason: '选项不足 4 个' }
  const seqValid = tuxing.sequence.filter((f) => f != null && isValidFigure(f)).length
  const minSeq = tuxing.sequence.some(
    (f) => f?.kind === 'voxel' || f?.kind === 'solid' || f?.kind === 'net',
  )
    ? 1
    : 2
  if (seqValid < minSeq) return { ok: false, reason: '题干序列有效图形不足' }

  if (!tuxing.options.every(isValidFigure)) {
    return { ok: false, reason: '选项含无效图形' }
  }

  const optSigs = new Set(tuxing.options.map(figureSignature))
  if (optSigs.size < 4) return { ok: false, reason: '选项图形完全相同' }

  if (isGridTuxing(tuxing)) {
    if (tuxing.options.some((f) => isGrid(f) && f.filled.length === 0)) {
      return { ok: false, reason: '选项含空网格' }
    }
  }
  return { ok: true }
}

/** 校验并在必要时自动修复图形题数据 */
export function validateAndRepairTuxing(
  tuxing: TuxingData,
  answer: string,
  topicId?: string,
  analysis?: string,
  stem?: string,
): TuxingData {
  let result = tuxing
  const first = validateTuxingData(result)
  if (!first.ok) {
    if (hasSpecialTuxing(result) || topicId?.includes('jiemian') || topicId?.includes('kongjian')) {
      const fallback = topicId?.includes('kongjian')
        ? synthesizeKongjianTuxing(answer)
        : synthesizeJiemianTuxing(answer, analysis, stem)
      if (validateTuxingData(fallback).ok) result = fallback
    } else {
      const repaired = repairGridTuxing(result, answer)
      if (validateTuxingData(repaired).ok) result = repaired
      else result = repaired
    }
  }

  return syncTuxingWithAnalysis(result, answer, analysis, stem, topicId)
}

export function tuxingNeedsRepair(tuxing: TuxingData): boolean {
  return !validateTuxingData(tuxing).ok
}
