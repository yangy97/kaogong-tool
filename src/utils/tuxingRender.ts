import type { TuxingFigure, TuxingData } from '@/types/tuxing'

const SIZE = 100

export function figureToSvg(fig: TuxingFigure, pixelSize = 88): string {
  const inner = fig.kind === 'grid' ? renderGrid(fig) : renderShapes(fig)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${pixelSize}" height="${pixelSize}" style="display:block;">${inner}</svg>`
}

function renderGrid(fig: Extract<TuxingFigure, { kind: 'grid' }>): string {
  const pad = 8
  const cellW = (SIZE - pad * 2) / fig.cols
  const cellH = (SIZE - pad * 2) / fig.rows
  const filledSet = new Set(fig.filled.map(([r, c]) => `${r},${c}`))
  let rects = `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="white"/>`
  rects += `<rect x="${pad}" y="${pad}" width="${SIZE - pad * 2}" height="${SIZE - pad * 2}" fill="none" stroke="#333" stroke-width="1.5"/>`
  for (let r = 0; r < fig.rows; r++) {
    for (let c = 0; c < fig.cols; c++) {
      const x = pad + c * cellW
      const y = pad + r * cellH
      const fill = filledSet.has(`${r},${c}`) ? '#222' : '#fff'
      rects += `<rect x="${x}" y="${y}" width="${cellW}" height="${cellH}" fill="${fill}" stroke="#ccc" stroke-width="0.8"/>`
    }
  }
  return rects
}

function renderShapes(fig: Extract<TuxingFigure, { kind: 'shapes' }>): string {
  let out = `<rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="white"/>`
  const cx = fig.cx ?? 50
  const cy = fig.cy ?? 50
  const groupTransform = fig.rotate != null ? ` transform="rotate(${fig.rotate} ${cx} ${cy})"` : ''
  out += `<g${groupTransform}>`
  for (const item of fig.items) {
    const fill = item.fill === 'white' ? '#fff' : '#222'
    const stroke = '#333'
    if (item.shape === 'circle') {
      out += `<circle cx="${item.x}" cy="${item.y}" r="${item.size / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`
    } else if (item.shape === 'rect') {
      const half = item.size / 2
      out += `<rect x="${item.x - half}" y="${item.y - half}" width="${item.size}" height="${item.size}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`
    } else {
      const h = item.size * 0.866
      out += `<polygon points="${item.x},${item.y - h / 2} ${item.x - item.size / 2},${item.y + h / 2} ${item.x + item.size / 2},${item.y + h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.2"/>`
    }
  }
  out += '</g>'
  return out
}

export function placeholderSvg(pixelSize = 88): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${pixelSize}" height="${pixelSize}" style="display:block;">
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="#fafafa" stroke="#ddd" stroke-width="1.5"/>
    <text x="50" y="58" text-anchor="middle" font-size="36" fill="#999" font-family="sans-serif">?</text>
  </svg>`
}

export function tuxingToHtml(data: TuxingData, opts?: { figureSize?: number; dark?: boolean }): string {
  const sz = opts?.figureSize ?? 72
  const border = opts?.dark ? '#444' : '#e8e8e8'
  const bg = opts?.dark ? 'rgba(255,255,255,0.04)' : '#fafafa'

  const seqHtml = data.sequence
    .map((fig) => {
      const svg = fig ? figureToSvg(fig, sz) : placeholderSvg(sz)
      return `<div style="display:inline-flex;align-items:center;justify-content:center;width:${sz + 8}px;height:${sz + 8}px;border:1.5px solid ${border};border-radius:6px;background:${bg};margin:0 4px;">${svg}</div>`
    })
    .join('')

  const optHtml = data.options
    .map((fig, i) => {
      const key = 'ABCD'[i]
      const svg = figureToSvg(fig, sz - 8)
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${bg};border-radius:8px;margin-top:8px;">
        <strong style="min-width:24px;">${key}.</strong>
        <div style="border:1.5px solid ${border};border-radius:6px;padding:2px;">${svg}</div>
      </div>`
    })
    .join('')

  return `<div style="margin:12px 0;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;margin-bottom:16px;">${seqHtml}</div>
    <div>${optHtml}</div>
  </div>`
}
