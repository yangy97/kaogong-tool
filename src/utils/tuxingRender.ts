import type { TuxingData } from '@/types/tuxing'

const SIZE = 100

export function placeholderSvg(pixelSize = 88): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" width="${pixelSize}" height="${pixelSize}" style="display:block;">
    <rect x="0" y="0" width="${SIZE}" height="${SIZE}" fill="#fafafa" stroke="#ddd" stroke-width="1.5"/>
    <text x="50" y="58" text-anchor="middle" font-size="36" fill="#999" font-family="sans-serif">?</text>
  </svg>`
}

export function placeholderDataUrl(pixelSize = 88): string {
  return `data:image/svg+xml,${encodeURIComponent(placeholderSvg(pixelSize))}`
}

function imgTag(src: string, size: number): string {
  return `<img src="${src}" width="${size}" height="${size}" alt="" style="display:block;" />`
}

/** 小红书/抖音配图：优先使用服务端烘焙的 imageUrls */
export function tuxingToHtml(data: TuxingData, opts?: { figureSize?: number; dark?: boolean }): string {
  const sz = opts?.figureSize ?? 72
  const border = opts?.dark ? '#444' : '#e8e8e8'
  const bg = opts?.dark ? 'rgba(255,255,255,0.04)' : '#fafafa'
  const baked = data.imageUrls

  const seqHtml = baked?.sequence?.length
    ? baked.sequence
        .map((url) => {
          const s = baked.seqSize ?? sz
          const content = url ? imgTag(url, s) : imgTag(placeholderDataUrl(s), s)
          return `<div style="display:inline-flex;align-items:center;justify-content:center;width:${s + 8}px;height:${s + 8}px;border:1.5px solid ${border};border-radius:6px;background:${bg};margin:0 4px;">${content}</div>`
        })
        .join('')
    : data.sequence
        .map(() => {
          const content = imgTag(placeholderDataUrl(sz), sz)
          return `<div style="display:inline-flex;align-items:center;justify-content:center;width:${sz + 8}px;height:${sz + 8}px;border:1.5px solid ${border};border-radius:6px;background:${bg};margin:0 4px;">${content}</div>`
        })
        .join('')

  const optHtml = baked?.options?.length
    ? baked.options
        .map((url, i) => {
          const key = 'ABCD'[i]
          const optSz = baked.optSize ?? sz - 8
          const content = url ? imgTag(url, optSz) : imgTag(placeholderDataUrl(optSz), optSz)
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${bg};border-radius:8px;margin-top:8px;">
        <strong style="min-width:24px;">${key}.</strong>
        <div style="border:1.5px solid ${border};border-radius:6px;padding:2px;">${content}</div>
      </div>`
        })
        .join('')
    : data.options
        .map((_, i) => {
          const key = 'ABCD'[i]
          const optSz = sz - 8
          const content = imgTag(placeholderDataUrl(optSz), optSz)
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:${bg};border-radius:8px;margin-top:8px;">
        <strong style="min-width:24px;">${key}.</strong>
        <div style="border:1.5px solid ${border};border-radius:6px;padding:2px;">${content}</div>
      </div>`
        })
        .join('')

  return `<div style="margin:12px 0;">
    <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px;margin-bottom:16px;">${seqHtml}</div>
    <div>${optHtml}</div>
  </div>`
}
