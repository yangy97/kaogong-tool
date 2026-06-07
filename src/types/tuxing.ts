/** 图形推理可视化数据结构 */

export interface TuxingGridFigure {
  kind: 'grid'
  rows: number
  cols: number
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
  rotate?: number
  cx?: number
  cy?: number
}

export interface TuxingPolygonFigure {
  kind: 'polygon'
  polygons: Array<{
    points: [number, number][]
    fill?: 'black' | 'white' | 'gray'
    stroke?: boolean
  }>
}

export interface TuxingVoxelFigure {
  kind: 'voxel'
  cubes: [number, number, number][]
  showCut?: boolean
}

export type TuxingSolidPreset = 'cylinderCone' | 'cylinder' | 'cone'

export interface TuxingSolidFigure {
  kind: 'solid'
  preset: TuxingSolidPreset
  showCut?: boolean
}

export type NetFaceMark = 'arrow-up' | 'arrow-right' | 'dot' | 'none'

export interface TuxingNetFigure {
  kind: 'net'
  faces: Array<{
    id: number
    row: number
    col: number
    mark?: NetFaceMark
  }>
  highlight?: number[]
}

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

export interface TuxingImageUrls {
  sequence: (string | null)[]
  options: string[]
  seqSize?: number
  optSize?: number
  renderVersion?: string
}

export interface TuxingData {
  sequence: (TuxingFigure | null)[]
  options: TuxingFigure[]
  imageUrls?: TuxingImageUrls
}

export function isTuxingTopicId(topicId?: string): boolean {
  return !!topicId?.includes('tuxing')
}
