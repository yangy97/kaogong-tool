import html2canvas from 'html2canvas'
import JSZip from 'jszip'
import type { Question, XhsPostContent } from '@/types'
import { stemToHtml } from '@/utils/stemFormat'
import { tuxingToHtml } from '@/utils/tuxingRender'

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

const COVER_BRAND = '学行测'

/** 抖音发布中心选封面时上下各裁约 12%，核心内容需落在中间 3:4 区域 */
const DOUYIN_COVER_SAFE = { top: 260, bottom: 260 }

/** 封面顶部品牌字描边（html2canvas 兼容） */
function coverBrandTextShadow(stroke = 3): string {
  const shadows: string[] = []
  for (let dx = -stroke; dx <= stroke; dx++) {
    for (let dy = -stroke; dy <= stroke; dy++) {
      if (dx !== 0 || dy !== 0) shadows.push(`${dx}px ${dy}px 0 #000`)
    }
  }
  return shadows.join(', ')
}

function renderCoverBrandHeader(platform: ImagePlatform): string {
  const fontSize = platform === 'douyin' ? 64 : 56
  return `
    <div style="text-align:center;margin-bottom:24px;flex-shrink:0;">
      <span style="display:inline-flex;align-items:center;justify-content:center;gap:4px;line-height:1.2;">
        <span style="font-size:${fontSize}px;">🐑🍊</span>
        <span style="
          font-size:${fontSize}px;
          font-weight:900;
          color:#fff;
          letter-spacing:2px;
          text-shadow:${coverBrandTextShadow(3)};
        ">${COVER_BRAND}</span>
      </span>
    </div>
  `
}

function createCardElement(
  content: string,
  platform: ImagePlatform,
  options: {
    title: string
    subtitle?: string
    theme?: 'cover' | 'question' | 'answer'
    index?: number
    contentHtml?: string
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
    padding: ${platform === 'douyin' ? (isCover ? '0' : '80px 60px') : '60px'};
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
    if (platform === 'douyin') {
      const accent2 = (cfg as typeof PLATFORM_CONFIG.douyin).accent2
      const safePad = `padding:${DOUYIN_COVER_SAFE.top}px 48px ${DOUYIN_COVER_SAFE.bottom}px`
      el.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;${safePad};box-sizing:border-box;">
          ${renderCoverBrandHeader(platform)}
          <div style="width:120px;height:6px;background:linear-gradient(90deg,${cfg.accent},${accent2});border-radius:3px;margin:20px auto 24px;"></div>
          <div style="font-size:64px;font-weight:900;line-height:1.2;margin-bottom:16px;letter-spacing:1px;">${options.title}</div>
          <div style="font-size:34px;opacity:0.88;font-weight:500;margin-bottom:32px;">${options.subtitle ?? ''}</div>
          <div style="font-size:26px;opacity:0.9;padding:14px 36px;border:2px solid ${cfg.accent};border-radius:40px;color:${cfg.accent};">
            ${cfg.coverBadge}
          </div>
        </div>
      `
    } else {
      el.innerHTML = `
        <div style="flex:1;display:flex;flex-direction:column;height:100%;">
          ${renderCoverBrandHeader(platform)}
          <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;padding-top:120px;">
            <div style="font-size:80px;font-weight:900;line-height:1.2;margin-bottom:20px;letter-spacing:1px;">${options.title}</div>
            <div style="font-size:40px;opacity:0.88;font-weight:500;">${options.subtitle ?? ''}</div>
            <div style="margin-top:auto;margin-bottom:48px;font-size:28px;opacity:0.85;padding:16px 40px;border:2px solid rgba(255,255,255,0.6);border-radius:40px;">
              ${cfg.coverBadge}
            </div>
          </div>
        </div>
      `
    }
  } else {
    const badge = options.index != null ? `第 ${options.index + 1} 题` : '解析'
    const accent2 = platform === 'douyin' ? (cfg as typeof PLATFORM_CONFIG.douyin).accent2 : cfg.accent
    const bodyContent = options.contentHtml ?? content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const bodyStyle = options.contentHtml
      ? 'flex:1;font-size:28px;line-height:1.8;overflow:hidden;'
      : 'flex:1;font-size:' + (platform === 'douyin' ? '32' : '30') + 'px;line-height:1.8;white-space:pre-wrap;overflow:hidden;'
    el.innerHTML = `
      <div style="font-size:28px;color:${cfg.accent};font-weight:600;margin-bottom:16px;">${badge}</div>
      <div style="font-size:32px;font-weight:700;color:${accent2};margin-bottom:24px;">${options.title}</div>
      <div style="${bodyStyle}">${bodyContent}</div>
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

/** 配图解析：人名前缀 → 🐑🍊 思路名（仅用于小红书/抖音配图，不影响题目预览） */
const PUBLISH_BRAND = '🐑🍊'

const KNOWN_EXPERT_NAMES = [
  '花生十三', '高照', '聂佳', '龙飞', '阿里木江', '郭熙', '李梦娇', '刘文超', '白鹭',
]

export function formatAnalysisForPublishImage(analysis: string, styleLabel?: string): string {
  let body = analysis.trim()
  let label = styleLabel?.trim() ?? ''

  const dotTag = body.match(/^【[^·】]+·([^】]+)】\s*/)
  if (dotTag) {
    label = label || dotTag[1]!.trim()
    body = body.slice(dotTag[0].length).trim()
  } else {
    const plainTag = body.match(/^【([^】]+)】\s*/)
    if (plainTag) {
      const inner = plainTag[1]!.trim()
      if (!KNOWN_EXPERT_NAMES.some((n) => inner.startsWith(n))) {
        label = label || inner
      }
      body = body.slice(plainTag[0].length).trim()
    }
  }

  for (const name of KNOWN_EXPERT_NAMES) {
    if (body.startsWith(name)) {
      body = body.slice(name.length).replace(/^[·•\s]+/, '').trim()
      break
    }
  }

  const header = label ? `${PUBLISH_BRAND} ${label}` : PUBLISH_BRAND
  const formatted = formatAnalysisForCardDisplay(body)
  return `${header}\n${formatted}`
}

/** 配图解析区：分号换行，去掉啰嗦试算句 */
function formatAnalysisForCardDisplay(analysis: string): string {
  const trimmed = analysis
    .replace(/\?\s*错[,，:：]?[\s\S]*/gi, '')
    .replace(/实际计算[:：][\s\S]*/gi, '')
    .replace(/需重算[\s\S]*/gi, '')
    .trim()
  return trimmed
    .replace(/；/g, '\n')
    .replace(/([。！？])\s*(选\s*[A-D])/i, '$1\n$2')
    .trim()
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
    let contentHtml = stemToHtml(q.stem, { dark: platform === 'douyin' })
    if (q.tuxing) {
      contentHtml += tuxingToHtml(q.tuxing, { figureSize: 64, dark: platform === 'douyin' })
    } else if (q.options?.length) {
      const optsText = q.options.map((o) => `${o.key}. ${o.text}`).join('\n')
      content += '\n\n' + optsText
      const optsHtml = q.options
        .map(
          (o) =>
            `<div style="margin-top:12px;padding:10px 14px;background:${platform === 'douyin' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};border-radius:8px;">${o.key}. ${o.text.replace(/</g, '&lt;')}</div>`,
        )
        .join('')
      contentHtml += `<div style="margin-top:20px;">${optsHtml}</div>`
    }

    const qBlob = await renderToBlob(
      createCardElement(content, platform, {
        title: q.moduleName,
        theme: 'question',
        index: i,
        contentHtml,
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
      ? `✅ 答案：${q.answer}\n\n📖 解析：\n${formatAnalysisForPublishImage(q.analysis, q.expertStyleLabel)}`
      : `📝 参考答案：\n${q.answer}\n\n📖 思路：\n${formatAnalysisForPublishImage(q.analysis, q.expertStyleLabel)}`

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
