import type { TuxingData, TuxingFigure, TuxingSolidPreset } from '../types/tuxing'
import {
  cubeFigure,
  inferSolidPreset,
  inferTuxingKindHint,
  netFigure,
  polygonFigure,
  regularPolygon,
  solidFigure,
  voxelFigure,
} from './tuxingFigures'
import { repairGridTuxing, validateAndRepairTuxing } from './tuxingRepair'
import { normalizeTuxingFromAi } from './tuxingNormalize'

function parseAnswerIndex(answer: string): number {
  const m = answer.trim().toUpperCase().match(/[A-D]/)
  const idx = m ? 'ABCD'.indexOf(m[0]) : 0
  return idx >= 0 ? idx : 0
}

function cube2x2(): [number, number, number][] {
  const cubes: [number, number, number][] = []
  for (let x = 0; x < 2; x++) {
    for (let y = 0; y < 2; y++) {
      for (let z = 0; z < 2; z++) cubes.push([x, y, z])
    }
  }
  return cubes
}

function buildJiemianSequence(
  preset: TuxingSolidPreset | 'cube',
  analysis?: string,
  stem?: string,
): (TuxingFigure | null)[] {
  const solid = inferSolidPreset(analysis, stem)
  const usePreset = preset === 'cube' ? solid : preset
  if (usePreset === 'cube') {
    const cubes = cube2x2()
    return [voxelFigure(cubes, false), voxelFigure(cubes, true), null]
  }
  return [solidFigure(usePreset, false), solidFigure(usePreset, true), null]
}

function buildJiemianOptions(answer: string, analysis?: string): TuxingFigure[] {
  const ansIdx = parseAnswerIndex(answer)
  const shapes: TuxingFigure[] = [
    polygonFigure(regularPolygon(3, 50, 52, 28)),
    polygonFigure(regularPolygon(4, 50, 52, 26)),
    polygonFigure(regularPolygon(5, 50, 52, 28)),
    polygonFigure(regularPolygon(6, 50, 52, 26)),
  ]

  let correctIdx = 0
  const text = `${analysis ?? ''}${answer}`
  if (/六边形|hexagon/i.test(text)) correctIdx = 3
  else if (/五边形|pentagon/i.test(text)) correctIdx = 2
  else if (/正方形|四边形|矩形|square/i.test(text)) correctIdx = 1
  else if (/三角形|triangle/i.test(text)) correctIdx = 0
  else correctIdx = ansIdx

  return reorderWithCorrectAt(shapes, correctIdx, ansIdx)
}

/** 截面类：立体 + 四种截面多边形选项 */
export function synthesizeJiemianTuxing(answer: string, analysis?: string, stem?: string): TuxingData {
  const preset = inferSolidPreset(analysis, stem)
  return {
    sequence: buildJiemianSequence(preset, analysis, stem),
    options: buildJiemianOptions(answer, analysis),
  }
}

/** 空间折叠类：展开图 + 四种折后立方体选项 */
export function synthesizeKongjianTuxing(answer: string): TuxingData {
  const ansIdx = parseAnswerIndex(answer)
  const cubeOpts: TuxingFigure[] = [
    cubeFigure('arrow-up', 'arrow-right', 'dot'),
    cubeFigure('arrow-right', 'dot', 'arrow-up'),
    cubeFigure('dot', 'arrow-up', 'arrow-right'),
    cubeFigure('arrow-up', 'dot', 'arrow-right'),
  ]
  const options = reorderWithCorrectAt(cubeOpts, 0, ansIdx)
  return {
    sequence: [netFigure(), netFigure([2, 4]), null],
    options,
  }
}

/** 按考点/解析对齐图形子类型（空间折叠 ≠ 截面） */
export function syncTuxingWithAnalysis(
  tuxing: TuxingData,
  answer: string,
  analysis?: string,
  stem?: string,
  topicId?: string,
): TuxingData {
  const hint = inferTuxingKindHint(topicId, analysis, stem)
  const hasNet = tuxing.sequence.some((f) => f?.kind === 'net')
  const hasCubeOpt = tuxing.options.some((f) => f.kind === 'cube')
  const hasJiemian =
    tuxing.sequence.some((f) => f?.kind === 'voxel' || f?.kind === 'solid') ||
    tuxing.options.some((f) => f.kind === 'polygon')

  if (hint === 'kongjian') {
    if (hasNet && hasCubeOpt) return tuxing
    if (hasJiemian || !hasNet) return synthesizeKongjianTuxing(answer)
    return tuxing
  }

  if (hint === 'jiemian') {
    if (hasJiemian && !hasNet) {
      const preset = inferSolidPreset(analysis, stem)
      if (preset !== 'cube') {
        const seqSolids = tuxing.sequence.filter((f) => f?.kind === 'solid')
        if (seqSolids.length >= 2 && seqSolids.every((f) => f.preset === preset)) return tuxing
        const optionsOk =
          tuxing.options.length === 4 &&
          new Set(tuxing.options.map((f) => JSON.stringify(f))).size === 4
        return {
          sequence: buildJiemianSequence(preset, analysis, stem),
          options: optionsOk ? tuxing.options : buildJiemianOptions(answer, analysis),
        }
      }
      return tuxing
    }
    if (hasNet || !hasJiemian) return synthesizeJiemianTuxing(answer, analysis, stem)
  }

  const preset = inferSolidPreset(analysis, stem)
  if (preset === 'cube' || hint === 'grid') return tuxing

  const seqSolids = tuxing.sequence.filter((f) => f?.kind === 'solid')
  const presetMatch = seqSolids.length >= 2 && seqSolids.every((f) => f.preset === preset)
  if (presetMatch) return tuxing

  const hasWrongVoxel = tuxing.sequence.some((f) => f?.kind === 'voxel')
  const hasWrongSolid = seqSolids.some((f) => f.preset !== preset)
  if (!hasWrongVoxel && !hasWrongSolid) return tuxing

  const optionsOk =
    tuxing.options.length === 4 &&
    new Set(tuxing.options.map((f) => JSON.stringify(f))).size === 4

  return {
    sequence: buildJiemianSequence(preset, analysis, stem),
    options: optionsOk ? tuxing.options : buildJiemianOptions(answer, analysis),
  }
}

function reorderWithCorrectAt(shapes: TuxingFigure[], correctIdx: number, ansIdx: number): TuxingFigure[] {
  const correct = shapes[correctIdx] ?? shapes[0]!
  const distractors = shapes.filter((_, i) => i !== correctIdx)
  const result: TuxingFigure[] = new Array(4)
  result[ansIdx] = correct
  let di = 0
  for (let i = 0; i < 4; i++) {
    if (i !== ansIdx) result[i] = distractors[di++] ?? shapes[i]!
  }
  return result
}

/** 从 AI 文案关键词推断截面/形状题 */
export function tryInferTuxingFromText(
  topicId: string | undefined,
  answer: string,
  analysis?: string,
  stem?: string,
): TuxingData | undefined {
  const hint = inferTuxingKindHint(topicId, analysis, stem)
  if (hint === 'kongjian') return synthesizeKongjianTuxing(answer)
  if (hint === 'jiemian') return synthesizeJiemianTuxing(answer, analysis, stem)
  return undefined
}

/** AI 未返回合法 tuxing 时的兜底合成 */
export function synthesizeTuxingFallback(
  topicId: string | undefined,
  answer: string,
  analysis?: string,
  stem?: string,
  rawTuxing?: unknown,
): TuxingData {
  if (rawTuxing) {
    const normalized = normalizeTuxingFromAi(rawTuxing)
    if (normalized) return validateAndRepairTuxing(normalized, answer, topicId, analysis, stem)
  }

  const inferred = tryInferTuxingFromText(topicId, answer, analysis, stem)
  if (inferred) return inferred

  if (topicId?.includes('jiemian')) return synthesizeJiemianTuxing(answer, analysis, stem)
  if (topicId?.includes('kongjian')) return synthesizeKongjianTuxing(answer)

  return repairGridTuxing(
    {
      sequence: [null, null, null, null],
      options: [
        polygonFigure([[30, 30], [70, 30], [70, 70], [30, 70]]),
        polygonFigure(regularPolygon(3, 50, 55, 25)),
        polygonFigure(regularPolygon(5, 50, 55, 25)),
        polygonFigure(regularPolygon(6, 50, 55, 24)),
      ],
    },
    answer,
  )
}
