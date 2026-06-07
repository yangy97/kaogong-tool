/** 图形推理可视化数据结构 */

export interface TuxingGridFigure {
  kind: 'grid'
  rows: number
  cols: number
  /** 涂黑单元格坐标 [row, col]，0 起算 */
  filled: [number, number][]
}

export interface TuxingShapeItem {
  shape: 'circle' | 'rect' | 'triangle'
  x: number
  y: number
  size: number
  fill?: 'black' | 'white'
  rotate?: number
}

export interface TuxingShapesFigure {
  kind: 'shapes'
  items: TuxingShapeItem[]
  /** 整组旋转角度（绕 cx,cy） */
  rotate?: number
  cx?: number
  cy?: number
}

/** 2D 截面/轮廓多边形（截面题选项） */
export interface TuxingPolygonFigure {
  kind: 'polygon'
  polygons: Array<{
    points: [number, number][]
    fill?: 'black' | 'white' | 'gray'
    stroke?: boolean
  }>
}

/** 等轴测立方体堆叠（立体题干） */
export interface TuxingVoxelFigure {
  kind: 'voxel'
  /** 单位立方体坐标 [x,y,z] */
  cubes: [number, number, number][]
  /** 是否绘制截面示意线 */
  showCut?: boolean
}

/** 预设旋转体（圆柱/圆锥等，截面题题干） */
export type TuxingSolidPreset = 'cylinderCone' | 'cylinder' | 'cone'

export interface TuxingSolidFigure {
  kind: 'solid'
  preset: TuxingSolidPreset
  showCut?: boolean
}

/** 六面体展开图（空间折叠题） */
export type NetFaceMark = 'arrow-up' | 'arrow-right' | 'dot' | 'none'

export interface TuxingNetFigure {
  kind: 'net'
  faces: Array<{
    id: number
    row: number
    col: number
    mark?: NetFaceMark
  }>
  /** 高亮面编号（第二格示意相对面/公共边） */
  highlight?: number[]
}

/** 折后立方体示意（空间题选项） */
export interface TuxingCubeFigure {
  kind: 'cube'
  top?: NetFaceMark | number
  left?: NetFaceMark | number
  right?: NetFaceMark | number
}

export type TuxingFigure =
  | TuxingGridFigure
  | TuxingShapesFigure
  | TuxingPolygonFigure
  | TuxingVoxelFigure
  | TuxingSolidFigure
  | TuxingNetFigure
  | TuxingCubeFigure

/** 服务端烘焙后的 PNG 地址（粉笔式展示） */
export interface TuxingImageUrls {
  sequence: (string | null)[]
  options: string[]
  seqSize?: number
  optSize?: number
  /** 与服务端 TUXING_RENDER_VERSION 对齐，变更后自动重烘焙 */
  renderVersion?: string
}

export interface TuxingData {
  /** 题干图形序列，null 表示问号占位 */
  sequence: (TuxingFigure | null)[]
  /** A/B/C/D 四个选项图形 */
  options: TuxingFigure[]
  /** 服务端渲染的 PNG 路径，前端优先使用 */
  imageUrls?: TuxingImageUrls
}

export function isTuxingTopicId(topicId?: string): boolean {
  return !!topicId?.includes('tuxing')
}
