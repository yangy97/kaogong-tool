import type {
  NetFaceMark,
  TuxingCubeFigure,
  TuxingFigure,
  TuxingNetFigure,
  TuxingPolygonFigure,
  TuxingSolidFigure,
  TuxingSolidPreset,
  TuxingVoxelFigure,
} from '../types/tuxing'

export type TuxingKindHint = 'kongjian' | 'jiemian' | 'grid'

/** 从考点/解析判断图形子类型，避免空间题被当成截面题 */
export function inferTuxingKindHint(
  topicId?: string,
  analysis?: string,
  stem?: string,
): TuxingKindHint {
  if (topicId?.includes('kongjian')) return 'kongjian'
  if (topicId?.includes('jiemian')) return 'jiemian'
  const text = `${stem ?? ''}${analysis ?? ''}`
  if (/相对面|公共边|展开图|折叠|面[1-6]/.test(text)) return 'kongjian'
  if (/截面|剖面|三视图|圆柱|圆锥|五边形|六边形/.test(text)) return 'jiemian'
  return 'grid'
}

export function polygonFigure(
  points: [number, number][],
  fill: 'black' | 'white' | 'gray' = 'black',
): TuxingPolygonFigure {
  return { kind: 'polygon', polygons: [{ points, fill, stroke: true }] }
}

/** 正 n 边形，cx/cy 中心，radius 外接圆半径 */
export function regularPolygon(
  sides: number,
  cx: number,
  cy: number,
  radius: number,
): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i < sides; i++) {
    const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
    pts.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)])
  }
  return pts
}

export function voxelFigure(
  cubes: [number, number, number][],
  showCut = false,
): TuxingVoxelFigure {
  return { kind: 'voxel', cubes, showCut }
}

export function solidFigure(preset: TuxingSolidPreset, showCut = false): TuxingSolidFigure {
  return { kind: 'solid', preset, showCut }
}

const DEFAULT_NET_FACES: TuxingNetFigure['faces'] = [
  { id: 1, row: 0, col: 1, mark: 'arrow-up' },
  { id: 2, row: 1, col: 1, mark: 'arrow-right' },
  { id: 3, row: 2, col: 1, mark: 'dot' },
  { id: 4, row: 1, col: 0, mark: 'none' },
  { id: 5, row: 1, col: 2, mark: 'arrow-up' },
  { id: 6, row: 1, col: 3, mark: 'dot' },
]

export function netFigure(highlight?: number[]): TuxingNetFigure {
  return { kind: 'net', faces: DEFAULT_NET_FACES, highlight }
}

export function cubeFigure(
  top: NetFaceMark | number = 'arrow-up',
  left: NetFaceMark | number = 'arrow-right',
  right: NetFaceMark | number = 'dot',
): TuxingCubeFigure {
  return { kind: 'cube', top, left, right }
}

/** 从解析/题干推断应使用的旋转体预设 */
export function inferSolidPreset(analysis?: string, stem?: string): TuxingSolidPreset | 'cube' {
  const text = `${stem ?? ''}${analysis ?? ''}`
  if (/圆柱/.test(text) && /圆锥/.test(text)) return 'cylinderCone'
  if (/圆锥/.test(text)) return 'cone'
  if (/圆柱/.test(text)) return 'cylinder'
  return 'cube'
}

export function figureSignature(fig: TuxingFigure): string {
  if (fig.kind === 'grid') {
    return `g:${fig.filled.map(([r, c]) => `${r},${c}`).sort().join('|')}`
  }
  if (fig.kind === 'polygon') {
    return `p:${fig.polygons.map((p) => p.points.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(';')).join('|')}`
  }
  if (fig.kind === 'voxel') {
    return `v:${fig.cubes.map(([x, y, z]) => `${x},${y},${z}`).sort().join('|')}${fig.showCut ? ':cut' : ''}`
  }
  if (fig.kind === 'solid') {
    return `so:${fig.preset}${fig.showCut ? ':cut' : ''}`
  }
  if (fig.kind === 'net') {
    return `n:${fig.faces.map((f) => `${f.id}@${f.row},${f.col}:${f.mark ?? ''}`).join('|')}`
  }
  if (fig.kind === 'cube') {
    return `c:${fig.top ?? ''}|${fig.left ?? ''}|${fig.right ?? ''}`
  }
  return `s:${fig.items.length}`
}
