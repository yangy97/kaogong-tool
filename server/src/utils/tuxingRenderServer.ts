import { createCanvas, type Canvas, type SKRSContext2D } from '@napi-rs/canvas'
import type {
  NetFaceMark,
  TuxingCubeFigure,
  TuxingFigure,
  TuxingGridFigure,
  TuxingNetFigure,
  TuxingPolygonFigure,
  TuxingShapesFigure,
  TuxingSolidFigure,
  TuxingVoxelFigure,
} from '../types/tuxing'

/** 渲染算法版本，变更后旧 PNG 缓存自动失效 */
export const TUXING_RENDER_VERSION = 'v4'

const LOGICAL = 100

type Ctx = SKRSContext2D

function fillBackground(ctx: Ctx, size: number) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
}

function scaleCoord(v: number, pixelSize: number): number {
  return (v / LOGICAL) * pixelSize
}

function getContentBounds(
  canvas: Canvas,
): { x: number; y: number; w: number; h: number } | null {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const data = ctx.getImageData(0, 0, width, height).data
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let found = false
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i]! < 250 || data[i + 1]! < 250 || data[i + 2]! < 250) {
        found = true
        if (x < minX) minX = x
        if (y < minY) minY = y
        if (x > maxX) maxX = x
        if (y > maxY) maxY = y
      }
    }
  }
  if (!found) return null
  const pad = 2
  return {
    x: Math.max(0, minX - pad),
    y: Math.max(0, minY - pad),
    w: Math.min(width, maxX - minX + 1 + pad * 2),
    h: Math.min(height, maxY - minY + 1 + pad * 2),
  }
}

/** 离屏绘制后裁切居中贴到目标画布 */
function blitCentered(ctx: Ctx, scratch: Canvas, pixelSize: number) {
  const bbox = getContentBounds(scratch)
  fillBackground(ctx, pixelSize)
  if (!bbox || bbox.w <= 0 || bbox.h <= 0) return
  const pad = Math.max(6, pixelSize * 0.08)
  const avail = pixelSize - pad * 2
  const scale = Math.min(avail / bbox.w, avail / bbox.h)
  const dw = bbox.w * scale
  const dh = bbox.h * scale
  const dx = (pixelSize - dw) / 2
  const dy = (pixelSize - dh) / 2
  ctx.drawImage(scratch, bbox.x, bbox.y, bbox.w, bbox.h, dx, dy, dw, dh)
}

function drawGrid(ctx: Ctx, fig: TuxingGridFigure, pixelSize: number) {
  const pad = scaleCoord(8, pixelSize)
  const inner = pixelSize - pad * 2
  const cellW = inner / fig.cols
  const cellH = inner / fig.rows
  const filled = new Set(fig.filled.map(([r, c]) => `${r},${c}`))
  ctx.strokeStyle = '#333'
  ctx.lineWidth = Math.max(1, pixelSize / 80)
  ctx.strokeRect(pad, pad, inner, inner)
  for (let r = 0; r < fig.rows; r++) {
    for (let c = 0; c < fig.cols; c++) {
      const x = pad + c * cellW
      const y = pad + r * cellH
      ctx.fillStyle = filled.has(`${r},${c}`) ? '#222' : '#fff'
      ctx.fillRect(x, y, cellW, cellH)
      ctx.strokeStyle = '#ccc'
      ctx.lineWidth = Math.max(0.5, pixelSize / 120)
      ctx.strokeRect(x, y, cellW, cellH)
    }
  }
}

function drawShapes(ctx: Ctx, fig: TuxingShapesFigure, pixelSize: number) {
  const cx = scaleCoord(fig.cx ?? 50, pixelSize)
  const cy = scaleCoord(fig.cy ?? 50, pixelSize)
  ctx.save()
  if (fig.rotate != null) {
    ctx.translate(cx, cy)
    ctx.rotate((fig.rotate * Math.PI) / 180)
    ctx.translate(-cx, -cy)
  }
  for (const item of fig.items) {
    const x = scaleCoord(item.x, pixelSize)
    const y = scaleCoord(item.y, pixelSize)
    const s = scaleCoord(item.size, pixelSize)
    ctx.fillStyle = item.fill === 'white' ? '#fff' : '#222'
    ctx.strokeStyle = '#333'
    ctx.lineWidth = Math.max(1, pixelSize / 70)
    if (item.shape === 'circle') {
      ctx.beginPath()
      ctx.arc(x, y, s / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    } else if (item.shape === 'rect') {
      ctx.fillRect(x - s / 2, y - s / 2, s, s)
      ctx.strokeRect(x - s / 2, y - s / 2, s, s)
    } else {
      const h = s * 0.866
      ctx.beginPath()
      ctx.moveTo(x, y - h / 2)
      ctx.lineTo(x - s / 2, y + h / 2)
      ctx.lineTo(x + s / 2, y + h / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawPolygonRaw(ctx: Ctx, fig: TuxingPolygonFigure, size: number) {
  for (const poly of fig.polygons) {
    if (poly.points.length < 3) continue
    ctx.beginPath()
    poly.points.forEach(([x, y], i) => {
      const px = scaleCoord(x, size)
      const py = scaleCoord(y, size)
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = poly.fill === 'white' ? '#fff' : poly.fill === 'gray' ? '#888' : '#222'
    ctx.fill()
    if (poly.stroke !== false) {
      ctx.strokeStyle = '#333'
      ctx.lineWidth = Math.max(1, size / 65)
      ctx.stroke()
    }
  }
}

function drawPolygon(ctx: Ctx, fig: TuxingPolygonFigure, pixelSize: number) {
  const scratchSize = 200
  const scratch = createCanvas(scratchSize, scratchSize)
  const sctx = scratch.getContext('2d')
  fillBackground(sctx, scratchSize)
  drawPolygonRaw(sctx, fig, scratchSize)
  blitCentered(ctx, scratch, pixelSize)
}

function drawVoxelIsoRaw(ctx: Ctx, fig: TuxingVoxelFigure, size: number) {
  if (!fig.cubes.length) return
  const xs = fig.cubes.map(([x]) => x)
  const ys = fig.cubes.map(([, y]) => y)
  const zs = fig.cubes.map(([, , z]) => z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  const spanX = maxX - minX + 1
  const spanY = maxY - minY + 1
  const spanZ = maxZ - minZ + 1
  const footprint = Math.max(spanX + spanZ, spanY + 1, 2)
  const tileW = Math.min(48, Math.max(14, (size * 0.7) / footprint))
  const tileH = tileW * 0.5
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const cz = (minZ + maxZ) / 2
  const ox = size / 2 - ((cx - minX - (cz - minZ)) * tileW)
  const oy = size / 2 + (cy - minY) * tileH * 2 - ((cx - minX + (cz - minZ)) * tileH)

  const toScreen = (x: number, y: number, z: number) => {
    const sx = ox + (x - minX - (z - minZ)) * tileW
    const sy = oy - (y - minY) * tileH * 2 + (x - minX + (z - minZ)) * tileH
    return [sx, sy] as [number, number]
  }

  const poly = (pts: [number, number][], fill: string) => {
    ctx.beginPath()
    pts.forEach(([px, py], i) => (i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = Math.max(0.8, size / 100)
    ctx.stroke()
  }

  const sorted = [...fig.cubes].sort((a, b) => a[0] + a[1] - b[0] - b[1])
  for (const [x, y, z] of sorted) {
    poly(
      [toScreen(x, y, z + 1), toScreen(x + 1, y, z + 1), toScreen(x + 1, y, z), toScreen(x, y, z)],
      '#6a6a6a',
    )
    poly(
      [toScreen(x + 1, y, z), toScreen(x + 1, y + 1, z), toScreen(x + 1, y + 1, z + 1), toScreen(x + 1, y, z + 1)],
      '#4a4a4a',
    )
    poly(
      [
        toScreen(x, y + 1, z + 1),
        toScreen(x + 1, y + 1, z + 1),
        toScreen(x + 1, y + 1, z),
        toScreen(x, y + 1, z),
      ],
      '#9a9a9a',
    )
  }
}

function drawVoxelIso(ctx: Ctx, fig: TuxingVoxelFigure, pixelSize: number) {
  const scratchSize = 320
  const scratch = createCanvas(scratchSize, scratchSize)
  const sctx = scratch.getContext('2d')
  fillBackground(sctx, scratchSize)
  drawVoxelIsoRaw(sctx, fig, scratchSize)
  blitCentered(ctx, scratch, pixelSize)

  if (fig.showCut) {
    const pad = pixelSize * 0.12
    const avail = pixelSize - pad * 2
    const cx = pixelSize * 0.5
    const cy = pixelSize * 0.5
    ctx.save()
    ctx.strokeStyle = '#e53935'
    ctx.lineWidth = Math.max(2, pixelSize / 40)
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(cx - avail * 0.3, cy + avail * 0.12)
    ctx.lineTo(cx + avail * 0.32, cy - avail * 0.15)
    ctx.stroke()
    ctx.fillStyle = 'rgba(229,57,53,0.12)'
    ctx.beginPath()
    ctx.moveTo(cx - avail * 0.3, cy + avail * 0.12)
    ctx.lineTo(cx + avail * 0.32, cy - avail * 0.15)
    ctx.lineTo(cx + avail * 0.26, cy - avail * 0.05)
    ctx.lineTo(cx - avail * 0.34, cy + avail * 0.22)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
}

function drawSolidRaw(ctx: Ctx, fig: TuxingSolidFigure, size: number) {
  const cx = size / 2
  const scale = size * 0.34
  const rx = scale * 0.55
  const ry = scale * 0.18
  const cylH = scale * 0.75
  const coneH = scale * 0.65
  const totalH =
    fig.preset === 'cone' ? coneH + ry : fig.preset === 'cylinder' ? cylH + ry * 2 : cylH + coneH + ry
  const topY = (size - totalH) / 2
  const yBase = topY + totalH - ry
  const yCylTop = yBase - cylH
  const yApex = yCylTop - coneH

  ctx.lineWidth = Math.max(1.5, size / 55)
  ctx.strokeStyle = '#444'

  if (fig.preset === 'cylinder' || fig.preset === 'cylinderCone') {
    ctx.fillStyle = '#7a7a7a'
    ctx.beginPath()
    ctx.moveTo(cx - rx, yCylTop)
    ctx.lineTo(cx - rx, yBase)
    ctx.ellipse(cx, yBase, rx, ry, 0, Math.PI, 0)
    ctx.lineTo(cx + rx, yCylTop)
    ctx.ellipse(cx, yCylTop, rx, ry, 0, Math.PI, 2 * Math.PI)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  if (fig.preset === 'cone' || fig.preset === 'cylinderCone') {
    const baseY = fig.preset === 'cone' ? yBase : yCylTop
    const apexY = fig.preset === 'cone' ? yBase - coneH : yApex
    ctx.fillStyle = '#8f8f8f'
    ctx.beginPath()
    ctx.moveTo(cx, apexY)
    ctx.lineTo(cx - rx, baseY)
    ctx.ellipse(cx, baseY, rx, ry, 0, Math.PI, 0)
    ctx.lineTo(cx + rx, baseY)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

function drawSolid(ctx: Ctx, fig: TuxingSolidFigure, pixelSize: number) {
  const scratchSize = 280
  const scratch = createCanvas(scratchSize, scratchSize)
  const sctx = scratch.getContext('2d')
  fillBackground(sctx, scratchSize)
  drawSolidRaw(sctx, fig, scratchSize)
  blitCentered(ctx, scratch, pixelSize)

  if (fig.showCut) {
    const pad = pixelSize * 0.12
    const avail = pixelSize - pad * 2
    ctx.save()
    ctx.strokeStyle = '#e53935'
    ctx.setLineDash([5, 4])
    ctx.lineWidth = Math.max(2, pixelSize / 40)
    ctx.beginPath()
    ctx.moveTo(pixelSize / 2 - avail * 0.28, pixelSize / 2 + avail * 0.1)
    ctx.lineTo(pixelSize / 2 + avail * 0.3, pixelSize / 2 - avail * 0.12)
    ctx.stroke()
    ctx.restore()
  }
}

function drawFaceMark(
  ctx: Ctx,
  mark: NetFaceMark | number | undefined,
  cx: number,
  cy: number,
  size: number,
) {
  if (mark == null || mark === 'none') return
  ctx.fillStyle = '#222'
  if (typeof mark === 'number') {
    ctx.font = `bold ${Math.round(size * 0.42)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(mark), cx, cy)
    return
  }
  if (mark === 'dot') {
    ctx.beginPath()
    ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  const len = size * 0.28
  ctx.beginPath()
  if (mark === 'arrow-up') {
    ctx.moveTo(cx, cy - len)
    ctx.lineTo(cx - len * 0.55, cy + len * 0.35)
    ctx.lineTo(cx + len * 0.55, cy + len * 0.35)
  } else {
    ctx.moveTo(cx + len, cy)
    ctx.lineTo(cx - len * 0.35, cy - len * 0.55)
    ctx.lineTo(cx - len * 0.35, cy + len * 0.55)
  }
  ctx.closePath()
  ctx.fill()
}

function drawNet(ctx: Ctx, fig: TuxingNetFigure, pixelSize: number) {
  if (!fig.faces.length) return
  const pad = pixelSize * 0.08
  const rows = Math.max(...fig.faces.map((f) => f.row)) + 1
  const cols = Math.max(...fig.faces.map((f) => f.col)) + 1
  const cell = Math.min((pixelSize - pad * 2) / cols, (pixelSize - pad * 2) / rows)
  const ox = (pixelSize - cols * cell) / 2
  const oy = (pixelSize - rows * cell) / 2
  const hi = new Set(fig.highlight ?? [])
  for (const face of fig.faces) {
    const x = ox + face.col * cell
    const y = oy + face.row * cell
    const inset = cell * 0.06
    ctx.fillStyle = hi.has(face.id) ? '#fff5f5' : '#f8f8f8'
    ctx.fillRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2)
    ctx.strokeStyle = hi.has(face.id) ? '#e53935' : '#555'
    ctx.lineWidth = hi.has(face.id) ? Math.max(2, pixelSize / 44) : Math.max(1.2, pixelSize / 70)
    ctx.strokeRect(x + inset, y + inset, cell - inset * 2, cell - inset * 2)
    ctx.fillStyle = '#666'
    ctx.font = `bold ${Math.round(cell * 0.22)}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText(String(face.id), x + inset + 3, y + inset + 2)
    drawFaceMark(ctx, face.mark, x + cell / 2, y + cell / 2 + cell * 0.06, cell)
  }
}

function drawCube(ctx: Ctx, fig: TuxingCubeFigure, pixelSize: number) {
  const cx = pixelSize * 0.5
  const cy = pixelSize * 0.54
  const s = pixelSize * 0.22
  const poly = (pts: [number, number][], fill: string) => {
    ctx.beginPath()
    pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
    ctx.strokeStyle = '#444'
    ctx.lineWidth = Math.max(1.2, pixelSize / 60)
    ctx.stroke()
  }
  poly(
    [
      [cx - s, cy - s * 0.7],
      [cx, cy - s * 0.05],
      [cx, cy + s * 1.0],
      [cx - s, cy + s * 0.35],
    ],
    '#8a8a8a',
  )
  poly(
    [
      [cx + s, cy - s * 0.7],
      [cx + s, cy + s * 0.35],
      [cx, cy + s * 1.0],
      [cx, cy - s * 0.05],
    ],
    '#6e6e6e',
  )
  poly(
    [
      [cx, cy - s * 1.35],
      [cx + s, cy - s * 0.7],
      [cx, cy - s * 0.05],
      [cx - s, cy - s * 0.7],
    ],
    '#a8a8a8',
  )
  drawFaceMark(ctx, fig.left, cx - s * 0.45, cy + s * 0.18, s * 1.5)
  drawFaceMark(ctx, fig.right, cx + s * 0.45, cy + s * 0.18, s * 1.5)
  drawFaceMark(ctx, fig.top, cx, cy - s * 0.72, s * 1.2)
}

function drawFigure(ctx: Ctx, fig: TuxingFigure, pixelSize: number) {
  if (fig.kind === 'grid') drawGrid(ctx, fig, pixelSize)
  else if (fig.kind === 'shapes') drawShapes(ctx, fig, pixelSize)
  else if (fig.kind === 'polygon') drawPolygon(ctx, fig, pixelSize)
  else if (fig.kind === 'voxel') drawVoxelIso(ctx, fig, pixelSize)
  else if (fig.kind === 'solid') drawSolid(ctx, fig, pixelSize)
  else if (fig.kind === 'net') drawNet(ctx, fig, pixelSize)
  else if (fig.kind === 'cube') drawCube(ctx, fig, pixelSize)
}

function drawPlaceholder(ctx: Ctx, pixelSize: number) {
  fillBackground(ctx, pixelSize)
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1.5
  ctx.strokeRect(1, 1, pixelSize - 2, pixelSize - 2)
  ctx.fillStyle = '#999'
  ctx.font = `bold ${Math.round(pixelSize * 0.38)}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('?', pixelSize / 2, pixelSize / 2)
}

/** 渲染单图为 PNG Buffer */
export function renderFigureToPng(fig: TuxingFigure | null, pixelSize = 88): Buffer {
  const canvas = createCanvas(pixelSize, pixelSize)
  const ctx = canvas.getContext('2d')
  if (!fig) drawPlaceholder(ctx, pixelSize)
  else {
    fillBackground(ctx, pixelSize)
    drawFigure(ctx, fig, pixelSize)
  }
  return canvas.toBuffer('image/png')
}
