import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import type { TuxingData, TuxingFigure, TuxingImageUrls } from '../types/tuxing'
import { renderFigureToPng, TUXING_RENDER_VERSION } from '../utils/tuxingRenderServer'
import { devLog } from '../utils/devLog'

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const TUXING_IMAGES_DIR = path.join(serverRoot, 'public', 'tuxing-images')
export const TUXING_IMAGES_URL_PREFIX = '/api/tuxing-images'

function figureCacheKey(fig: TuxingFigure | 'placeholder', size: number): string {
  const raw =
    fig === 'placeholder'
      ? `${TUXING_RENDER_VERSION}:ph:${size}`
      : `${TUXING_RENDER_VERSION}:${size}:${JSON.stringify(fig)}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 20)
}

function ensureDir() {
  fs.mkdirSync(TUXING_IMAGES_DIR, { recursive: true })
}

function publicUrl(filename: string): string {
  return `${TUXING_IMAGES_URL_PREFIX}/${filename}`
}

function urlToLocalPath(url: string): string | null {
  const prefix = `${TUXING_IMAGES_URL_PREFIX}/`
  if (!url.startsWith(prefix)) return null
  const filename = url.slice(prefix.length)
  if (!filename || filename.includes('/') || filename.includes('..')) return null
  return path.join(TUXING_IMAGES_DIR, filename)
}

function imageUrlExistsOnDisk(url: string | null | undefined): boolean {
  if (!url) return false
  const local = urlToLocalPath(url)
  if (!local) return true
  return fs.existsSync(local)
}

function bakeOne(fig: TuxingFigure | null, size: number, slotKey: string): string {
  const key = figureCacheKey(fig ?? 'placeholder', size)
  const filename = `${key}.png`
  const full = path.join(TUXING_IMAGES_DIR, filename)
  if (!fs.existsSync(full)) {
    const buf = renderFigureToPng(fig, size)
    ensureDir()
    fs.writeFileSync(full, buf)
    devLog('tuxing-image', `写入 ${filename} (${slotKey})`)
  }
  return publicUrl(filename)
}

export function hasCompleteImageUrls(tuxing: TuxingData): boolean {
  const urls = tuxing.imageUrls
  if (!urls) return false
  if (urls.renderVersion !== TUXING_RENDER_VERSION) return false
  if (urls.sequence.length !== tuxing.sequence.length) return false
  if (urls.options.length !== tuxing.options.length) return false
  if (!urls.sequence.every((u, i) => (tuxing.sequence[i] == null ? u != null : !!u))) return false
  if (!urls.options.every(Boolean)) return false
  if (!urls.sequence.every((u) => u == null || imageUrlExistsOnDisk(u))) return false
  if (!urls.options.every((u) => imageUrlExistsOnDisk(u))) return false
  return true
}

/** 将 tuxing 烘焙为 PNG 并写入 imageUrls（粉笔式：<img> 展示） */
export function bakeTuxingImages(
  tuxing: TuxingData,
  opts?: { seqSize?: number; optSize?: number; questionId?: string },
): TuxingData {
  const seqSize = opts?.seqSize ?? 176
  const optSize = opts?.optSize ?? 160
  const prefix = opts?.questionId ? `${opts.questionId}-` : ''

  if (hasCompleteImageUrls(tuxing)) return tuxing

  const sequence: (string | null)[] = tuxing.sequence.map((fig, i) =>
    bakeOne(fig, seqSize, `${prefix}seq-${i}`),
  )
  const options: string[] = tuxing.options.map((fig, i) => bakeOne(fig, optSize, `${prefix}opt-${i}`))

  const imageUrls: TuxingImageUrls = {
    sequence,
    options,
    seqSize,
    optSize,
    renderVersion: TUXING_RENDER_VERSION,
  }
  return { ...tuxing, imageUrls }
}

export function bakeQuestionsTuxingImages<T extends { id: string; tuxing?: TuxingData }>(
  questions: T[],
): T[] {
  return questions.map((q) => {
    if (!q.tuxing) return q
    return { ...q, tuxing: bakeTuxingImages(q.tuxing, { questionId: q.id }) }
  })
}
