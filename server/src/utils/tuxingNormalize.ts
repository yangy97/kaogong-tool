import type {
  TuxingData,
  TuxingFigure,
  TuxingGridFigure,
  TuxingPolygonFigure,
  TuxingShapeItem,
  TuxingShapesFigure,
  TuxingCubeFigure,
  TuxingNetFigure,
  TuxingSolidFigure,
  TuxingVoxelFigure,
} from '../types/tuxing'

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

function isPolygonFigure(v: unknown): v is TuxingPolygonFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingPolygonFigure
  return o.kind === 'polygon' && Array.isArray(o.polygons) && o.polygons.length > 0
}

function isVoxelFigure(v: unknown): v is TuxingVoxelFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingVoxelFigure
  return o.kind === 'voxel' && Array.isArray(o.cubes) && o.cubes.length > 0
}

function isSolidFigure(v: unknown): v is TuxingSolidFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingSolidFigure
  return o.kind === 'solid' && ['cylinderCone', 'cylinder', 'cone'].includes(o.preset)
}

function isNetFigure(v: unknown): v is TuxingNetFigure {
  if (!v || typeof v !== 'object') return false
  const o = v as TuxingNetFigure
  return o.kind === 'net' && Array.isArray(o.faces) && o.faces.length >= 4
}

function isCubeFigure(v: unknown): v is TuxingCubeFigure {
  if (!v || typeof v !== 'object') return false
  return (v as TuxingCubeFigure).kind === 'cube'
}

function normalizeFigure(v: unknown): TuxingFigure | null {
  if (isGridFigure(v)) {
    const rows = Math.min(Math.max(Math.round(v.rows), 1), 8)
    const cols = Math.min(Math.max(Math.round(v.cols), 1), 8)
    const filled = v.filled
      .filter((p) => Array.isArray(p) && p.length >= 2)
      .map(([r, c]) => [Math.round(r!), Math.round(c!)] as [number, number])
      .filter(([r, c]) => r >= 0 && c >= 0 && r < rows && c < cols)
    if (filled.length === 0) return null
    return { kind: 'grid', rows, cols, filled }
  }
  if (isShapesFigure(v)) {
    const items: TuxingShapeItem[] = v.items
      .filter((it) => it && ['circle', 'rect', 'triangle'].includes(it.shape))
      .map((it) => {
        const item: TuxingShapeItem = {
          shape: it.shape,
          x: Math.min(Math.max(Number(it.x) || 50, 5), 95),
          y: Math.min(Math.max(Number(it.y) || 50, 5), 95),
          size: Math.min(Math.max(Number(it.size) || 20, 8), 40),
          fill: it.fill === 'white' ? 'white' : 'black',
        }
        if (it.rotate != null) item.rotate = Number(it.rotate)
        return item
      })
    if (items.length === 0) return null
    return {
      kind: 'shapes',
      items,
      ...(v.rotate != null ? { rotate: Number(v.rotate), cx: v.cx ?? 50, cy: v.cy ?? 50 } : {}),
    }
  }
  if (isPolygonFigure(v)) {
    const polygons = v.polygons
      .map((p) => {
        const fill: 'black' | 'white' | 'gray' =
          p.fill === 'white' ? 'white' : p.fill === 'gray' ? 'gray' : 'black'
        return {
          points: (p.points ?? [])
            .filter((pt) => Array.isArray(pt) && pt.length >= 2)
            .map(([x, y]) => [Math.min(Math.max(Number(x) || 0, 0), 100), Math.min(Math.max(Number(y) || 0, 0), 100)] as [number, number]),
          fill,
          stroke: p.stroke !== false,
        }
      })
      .filter((p) => p.points.length >= 3)
    if (polygons.length === 0) return null
    return { kind: 'polygon', polygons }
  }
  if (isVoxelFigure(v)) {
    const cubes = v.cubes
      .filter((p) => Array.isArray(p) && p.length >= 3)
      .map(([x, y, z]) => [Math.round(x!), Math.round(y!), Math.round(z!)] as [number, number, number])
    if (cubes.length === 0) return null
    return { kind: 'voxel', cubes, showCut: !!v.showCut }
  }
  if (isSolidFigure(v)) {
    return { kind: 'solid', preset: v.preset, showCut: !!v.showCut }
  }
  if (isNetFigure(v)) {
    const faces = v.faces
      .filter((f) => f && f.id >= 1 && f.id <= 6)
      .map((f) => ({
        id: Math.round(f.id),
        row: Math.round(f.row),
        col: Math.round(f.col),
        mark: f.mark,
      }))
    if (faces.length < 4) return null
    return { kind: 'net', faces, highlight: v.highlight?.map((n) => Math.round(n)) }
  }
  if (isCubeFigure(v)) {
    return { kind: 'cube', top: v.top, left: v.left, right: v.right }
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

  const validSeq = sequence.filter((f) => f != null).length
  const has3dSeq = sequence.some(
    (f) => f?.kind === 'voxel' || f?.kind === 'solid' || f?.kind === 'net',
  )
  if (validSeq < (has3dSeq ? 1 : 2)) return undefined

  return { sequence, options: options.slice(0, 4) }
}
