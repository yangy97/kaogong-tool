import type { TuxingData, TuxingFigure, TuxingGridFigure, TuxingShapesFigure } from '../types/tuxing.js'

function isGridFigure(v: unknown): v is TuxingGridFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingGridFigure
  return o.kind === 'grid' && o.rows >= 1 && o.cols >= 1 && Array.isArray(o.filled)
}

function isShapesFigure(v: unknown): v is TuxingShapesFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingShapesFigure
  return o.kind === 'shapes' && Array.isArray(o.items) && o.items.length > 0
}

function normalizeFigure(v: unknown): TuxingFigure | null {
  if (isGridFigure(v)) {
    return {
      kind: 'grid',
      rows: Math.min(Math.max(Math.round(v.rows), 1), 8),
      cols: Math.min(Math.max(Math.round(v.cols), 1), 8),
      filled: v.filled
        .filter((p) => Array.isArray(p) && p.length >= 2)
        .map(([r, c]) => [Math.round(r!), Math.round(c!)] as [number, number])
        .filter(([r, c]) => r >= 0 && c >= 0 && r < 8 && c < 8),
    }
  }
  if (isShapesFigure(v)) {
    return {
      kind: 'shapes',
      items: v.items
        .filter((it) => it && ['circle', 'rect', 'triangle'].includes(it.shape))
        .map((it) => ({
          shape: it.shape,
          x: Math.min(Math.max(Number(it.x) || 50, 5), 95),
          y: Math.min(Math.max(Number(it.y) || 50, 5), 95),
          size: Math.min(Math.max(Number(it.size) || 20, 8), 40),
          fill: it.fill === 'white' ? 'white' : 'black',
          ...(it.rotate != null ? { rotate: Number(it.rotate) } : {}),
        })),
      ...(v.rotate != null ? { rotate: Number(v.rotate), cx: v.cx ?? 50, cy: v.cy ?? 50 } : {}),
    }
  }
  return null
}

export function normalizeTuxingFromAi(raw: unknown): TuxingData | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const o = raw as TuxingData
  if (!Array.isArray(o.sequence) || !Array.isArray(o.options)) return undefined

  const sequence = o.sequence.map((item) => (item == null ? null : normalizeFigure(item)))
  const options = o.options.map(normalizeFigure).filter((f): f is TuxingFigure => f != null)

  if (options.length < 4) return undefined
  if (sequence.filter(Boolean).length < 2) return undefined

  return { sequence, options: options.slice(0, 4) }
}
