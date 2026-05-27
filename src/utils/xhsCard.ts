import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import type { Question, XhsPostContent } from '@/types'

export type ImagePlatform = 'xhs' | 'douyin'

export interface GeneratedImage {
  filename: string
  label: string
  blob: Blob
  url: string
  platform: ImagePlatform
}

const PLATFORM_CONFIG = {
  xhs: {
    width: 1080,
    height: 1440,
    coverBg: 'linear-gradient(135deg, #ff2442 0%, #ff6b6b 50%, #ff8e53 100%)',
    questionBg: 'linear-gradient(180deg, #ffffff 0%, #fafafa 100%)',
    answerBg: 'linear-gradient(180deg, #fff5f5 0%, #ffffff 100%)',
    accent: '#ff2442',
    textOnCover: '#fff',
    textOnCard: '#333',
    footerColor: '#999',
    coverBadge: '🐑🍊 · 考公每日刷题',
    footer: '@🐑🍊 · 坚持就是胜利',
    zipPrefix: '考公小红书配图',
    aspectClass: 'ratio-xhs' as const,
  },
  douyin: {
    width: 1080,
    height: 1920,
    coverBg: 'linear-gradient(160deg, #0a0a0f 0%, #1a1a2e 40%, #16213e 100%)',
    questionBg: 'linear-gradient(180deg, #121218 0%, #1c1c28 100%)',
    answerBg: 'linear-gradient(180deg, #0f1923 0%, #1a2332 100%)',
    accent: '#00f2ea',
    accent2: '#fe2c55',
    textOnCover: '#fff',
    textOnCard: '#f0f0f0',
    footerColor: '#888',
    coverBadge: '🐑🍊 · 考公打卡',
    footer: '@🐑🍊 · 关注一起上岸',
    zipPrefix: '考公抖音配图',
    aspectClass: 'ratio-douyin' as const,
  },
}

function createCardElement(
  content: string,
  platform: ImagePlatform,
  options: {
    title: string
    subtitle?: string
    theme?: 'cover' | 'question' | 'answer'
    index?: number
  },
): HTMLDivElement {
  const cfg = PLATFORM_CONFIG[platform]
  const isCover = options.theme === 'cover'
  const isAnswer = options.theme === 'answer'

  const bg = isCover
    ? cfg.coverBg
    : isAnswer
      ? cfg.answerBg
      : cfg.questionBg

  const el = document.createElement('div')
  el.style.cssText = `
    width: ${cfg.width}px;
    height: ${cfg.height}px;
    background: ${bg};
    padding: ${platform === 'douyin' ? '80px 60px' : '60px'};
    box-sizing: border-box;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    color: ${isCover ? cfg.textOnCover : cfg.textOnCard};
    display: flex;
    flex-direction: column;
    position: fixed;
    left: -9999px;
    top: 0;
    z-index: -1;
  `

  if (isCover) {
    const accentLine =
      platform === 'douyin'
        ? `<div style="width:120px;height:6px;background:linear-gradient(90deg,${cfg.accent},${(cfg as typeof PLATFORM_CONFIG.douyin).accent2});border-radius:3px;margin:0 auto 32px;"></div>`
        : ''
    el.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
        <div style="font-size:56px;margin-bottom:24px;">🐑🍊</div>
        ${accentLine}
        <div style="font-size:${platform === 'douyin' ? '64' : '56'}px;font-weight:800;line-height:1.3;margin-bottom:32px;">${options.title}</div>
        <div style="font-size:36px;opacity:0.85;">${options.subtitle ?? ''}</div>
        <div style="margin-top:80px;font-size:28px;opacity:0.8;padding:16px 40px;border:2px solid ${platform === 'douyin' ? cfg.accent : 'rgba(255,255,255,0.6)'};border-radius:40px;color:${platform === 'douyin' ? cfg.accent : 'inherit'};">
          ${cfg.coverBadge}
        </div>
      </div>
    `
  } else {
    const badge = options.index != null ? `第 ${options.index + 1} 题` : '解析'
    const accent2 = platform === 'douyin' ? (cfg as typeof PLATFORM_CONFIG.douyin).accent2 : cfg.accent
    el.innerHTML = `
      <div style="font-size:28px;color:${cfg.accent};font-weight:600;margin-bottom:16px;">${badge}</div>
      <div style="font-size:32px;font-weight:700;color:${accent2};margin-bottom:24px;">${options.title}</div>
      <div style="flex:1;font-size:${platform === 'douyin' ? '32' : '30'}px;line-height:1.8;white-space:pre-wrap;overflow:hidden;">${content}</div>
      <div style="font-size:24px;color:${cfg.footerColor};text-align:center;margin-top:24px;">${cfg.footer}</div>
    `
  }

  document.body.appendChild(el)
  return el
}

async function renderToBlob(
  el: HTMLElement,
  platform: ImagePlatform,
): Promise<Blob> {
  const cfg = PLATFORM_CONFIG[platform]
  const canvas = await html2canvas(el, {
    scale: 1,
    useCORS: true,
    backgroundColor: platform === 'douyin' ? '#0a0a0f' : '#ffffff',
    width: cfg.width,
    height: cfg.height,
  })
  document.body.removeChild(el)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('图片生成失败'))),
      'image/png',
      0.95,
    )
  })
}

function buildCoverTitle(questions: Question[], platform: ImagePlatform): string {
  const moduleName = questions[0]?.moduleName ?? '考公刷题'
  const topicLabel = questions[0]?.topicName ? `${questions[0].topicName}·` : ''
  const count = questions.length
  const maxLen = platform === 'douyin' ? 18 : 20
  const title =
    platform === 'douyin'
      ? `${topicLabel}${moduleName}刷题${count}题`
      : `${topicLabel}${moduleName}刷题｜${count}道精选`
  return title.length > maxLen ? title.slice(0, maxLen - 1) + '…' : title
}

export async function generatePlatformImages(
  questions: Question[],
  _post: XhsPostContent,
  platform: ImagePlatform,
): Promise<GeneratedImage[]> {
  const images: GeneratedImage[] = []
  const folder = platform === 'xhs' ? '小红书' : '抖音'

  const coverBlob = await renderToBlob(
    createCardElement('', platform, {
      title: buildCoverTitle(questions, platform),
      subtitle: questions[0]?.moduleName ?? '考公刷题',
      theme: 'cover',
    }),
    platform,
  )
  images.push({
    filename: `01-封面-${folder}.png`,
    label: `封面 · ${folder}`,
    blob: coverBlob,
    url: URL.createObjectURL(coverBlob),
    platform,
  })

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]
    const num = String(i + 1).padStart(2, '0')

    let content = q.stem
    if (q.options?.length) {
      content += '\n\n' + q.options.map((o) => `${o.key}. ${o.text}`).join('\n')
    }

    const qBlob = await renderToBlob(
      createCardElement(content, platform, {
        title: q.moduleName,
        theme: 'question',
        index: i,
      }),
      platform,
    )
    images.push({
      filename: `${String(images.length + 1).padStart(2, '0')}-第${num}题-题目-${folder}.png`,
      label: `第 ${i + 1} 题 · 题目`,
      blob: qBlob,
      url: URL.createObjectURL(qBlob),
      platform,
    })

    const answerContent = q.options
      ? `✅ 答案：${q.answer}\n\n📖 解析：\n${q.analysis}`
      : `📝 参考答案：\n${q.answer}\n\n📖 思路：\n${q.analysis}`

    const aBlob = await renderToBlob(
      createCardElement(answerContent, platform, {
        title: '答案与解析',
        theme: 'answer',
        index: i,
      }),
      platform,
    )
    images.push({
      filename: `${String(images.length + 1).padStart(2, '0')}-第${num}题-解析-${folder}.png`,
      label: `第 ${i + 1} 题 · 解析`,
      blob: aBlob,
      url: URL.createObjectURL(aBlob),
      platform,
    })
  }

  return images
}

/** @deprecated 使用 generatePlatformImages('xhs') */
export async function generateXhsImages(
  questions: Question[],
  post: XhsPostContent,
): Promise<GeneratedImage[]> {
  return generatePlatformImages(questions, post, 'xhs')
}

export function revokeImageUrls(images: GeneratedImage[]) {
  images.forEach((img) => URL.revokeObjectURL(img.url))
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadImagesAsZip(
  images: GeneratedImage[],
  platform: ImagePlatform = 'xhs',
): Promise<string> {
  const zip = new JSZip()
  images.forEach((img) => zip.file(img.filename, img.blob))

  const date = new Date().toISOString().slice(0, 10)
  const zipName = `${PLATFORM_CONFIG[platform].zipPrefix}-${date}.zip`
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  triggerDownload(zipBlob, zipName)
  return zipName
}

export async function downloadSingleImage(img: GeneratedImage) {
  triggerDownload(img.blob, img.filename)
}

export async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text)
}

export function openCreator(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export function openXhsCreator(url: string) {
  openCreator(url)
}

export function openDouyinCreator(url: string) {
  openCreator(url)
}

export function getDownloadFolderHint(): string {
  return '浏览器默认「下载」文件夹（Mac 一般为 ~/Downloads）'
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getPlatformLabel(platform: ImagePlatform) {
  return platform === 'xhs' ? '小红书' : '抖音'
}
