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
  /** 整组旋转角度（绕 cx,cy） */
  rotate?: number
  cx?: number
  cy?: number
}

export type TuxingFigure = TuxingGridFigure | TuxingShapesFigure

export interface TuxingData {
  sequence: (TuxingFigure | null)[]
  options: TuxingFigure[]
}

export function isTuxingTopicId(topicId?: string): boolean {
  return !!topicId?.includes('tuxing')
}
