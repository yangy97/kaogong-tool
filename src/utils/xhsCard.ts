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
    coverBadge: '🐑🍊 · 学行测每日刷题',
    footer: '学行测 · 公考刷题打卡',
    zipPrefix: '考公抖音配图',
    aspectClass: 'ratio-douyin' as const,
  },
}

const COVER_BRAND = '学行测'

/** 抖音发布中心选封面时上下各裁约 12%，核心内容需落在中间 3:4 区域 */
const DOUYIN_COVER_SAFE = { top: 260, bottom: 260 }

/** 封面内容区整体下移（相对垂直居中/顶对齐的偏移） */
const COVER_CONTENT_TOP = { douyin: 680, xhs: 160 } as const

/** 稳重感描边：深色薄阴影，避免花哨渐变字 */
function coverTextDepth(shadow = '0 4px 0 rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.22)'): string {
  return shadow
}

const IP_MASCOT_CORNER = '/ip-mascot-corner.png'

/** 封面：PNG 抠图叠在卡片左缘，光晕 + 底部渐隐，无白底框 */
function renderCoverMascotOverlay(platform: ImagePlatform): string {
  const width = platform === 'douyin' ? 520 : 480
  const left = platform === 'douyin' ? -32 : -36
  const bottom = platform === 'douyin' ? 28 : 32
  const glow =
    platform === 'douyin'
      ? 'radial-gradient(circle at 50% 78%, rgba(0,242,234,0.24) 0%, transparent 62%)'
      : 'radial-gradient(circle at 50% 78%, rgba(255,255,255,0.32) 0%, transparent 62%)'

  return `
    <div style="
      position:absolute;
      left:${left}px;
      bottom:${bottom}px;
      width:${width}px;
      z-index:4;
      pointer-events:none;
      line-height:0;
    ">
      <div style="
        position:absolute;
        inset:-10% -8% -6%;
        background:${glow};
        border-radius:50%;
      "></div>
      <div style="
        position:relative;
        filter:drop-shadow(0 16px 36px rgba(0,0,0,${platform === 'douyin' ? '0.38' : '0.2'}));
        -webkit-mask-image:linear-gradient(to top, transparent 0%, #000 8%);
        mask-image:linear-gradient(to top, transparent 0%, #000 8%);
      ">
        <img
          src="${IP_MASCOT_CORNER}"
          alt=""
          crossorigin="anonymous"
          style="width:100%;height:auto;display:block;"
        />
      </div>
    </div>
  `
}

/** 题目/解析卡：右下角 PNG 点缀，渐隐融入背景 */
function renderCardMascotCorner(platform: ImagePlatform): string {
  const width = platform === 'douyin' ? 300 : 280
  return `
    <div style="
      position:absolute;
      right:-24px;
      bottom:4px;
      width:${width}px;
      opacity:${platform === 'douyin' ? '0.85' : '0.76'};
      pointer-events:none;
      z-index:1;
      line-height:0;
    ">
      <div style="
        filter:drop-shadow(0 8px 18px rgba(0,0,0,${platform === 'douyin' ? '0.24' : '0.08'}));
        -webkit-mask-image:linear-gradient(135deg, transparent 4%, #000 32%, #000 90%, transparent 100%);
        mask-image:linear-gradient(135deg, transparent 4%, #000 32%, #000 90%, transparent 100%);
      ">
        <img
          src="${IP_MASCOT_CORNER}"
          alt=""
          crossorigin="anonymous"
          style="width:100%;height:auto;display:block;"
        />
      </div>
    </div>
  `
}

async function waitForImages(el: HTMLElement): Promise<void> {
  const imgs = [...el.querySelectorAll('img')]
  if (imgs.length === 0) return
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve, reject) => {
          if (img.complete && img.naturalWidth > 0) {
            resolve()
            return
          }
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('配图资源加载失败'))
        }),
    ),
  )
}

interface CoverContent {
  moduleName: string
  topicName?: string
  count: number
}

function parseCoverContent(questions: Question[]): CoverContent {
  return {
    moduleName: questions[0]?.moduleName ?? '考公刷题',
    topicName: questions[0]?.topicName,
    count: questions.length,
  }
}

/** 封面装饰背景（纯 CSS，html2canvas 兼容） */
function renderCoverDecorations(platform: ImagePlatform): string {
  if (platform === 'xhs') {
    return `
      <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
        <div style="position:absolute;top:-120px;right:-100px;width:480px;height:480px;border-radius:50%;background:rgba(255,255,255,0.12);"></div>
        <div style="position:absolute;bottom:80px;left:-140px;width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,0.08);"></div>
        <div style="position:absolute;top:420px;right:60px;width:180px;height:180px;border-radius:50%;border:3px solid rgba(255,255,255,0.18);"></div>
        <div style="position:absolute;inset:0;background:radial-gradient(circle at 20% 80%,rgba(255,255,255,0.08) 0%,transparent 45%),radial-gradient(circle at 85% 15%,rgba(255,255,255,0.1) 0%,transparent 40%);"></div>
      </div>
    `
  }
  return `
    <div style="position:absolute;inset:0;overflow:hidden;pointer-events:none;">
      <div style="position:absolute;inset:0;background:
        linear-gradient(rgba(0,242,234,0.04) 1px,transparent 1px),
        linear-gradient(90deg,rgba(0,242,234,0.04) 1px,transparent 1px);
        background-size:56px 56px;"></div>
      <div style="position:absolute;top:-80px;left:50%;transform:translateX(-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(0,242,234,0.15) 0%,transparent 65%);"></div>
      <div style="position:absolute;bottom:120px;right:-60px;width:320px;height:320px;border-radius:50%;background:radial-gradient(circle,rgba(254,44,85,0.12) 0%,transparent 70%);"></div>
      <div style="position:absolute;top:280px;left:40px;width:120px;height:120px;border:2px solid rgba(0,242,234,0.25);border-radius:16px;transform:rotate(12deg);"></div>
      <div style="position:absolute;bottom:360px;right:80px;width:80px;height:80px;border:2px solid rgba(254,44,85,0.2);border-radius:50%;"></div>
    </div>
  `
}

function renderCoverBrandHeader(platform: ImagePlatform): string {
  const fontSize = platform === 'douyin' ? 38 : 36
  return `
    <div style="display:inline-flex;align-items:center;gap:10px;padding:10px 24px;background:rgba(0,0,0,${platform === 'xhs' ? '0.14' : '0.35'});border:1.5px solid rgba(255,255,255,0.28);border-radius:999px;flex-shrink:0;">
      <span style="font-size:${fontSize + 2}px;line-height:1;">🐑🍊</span>
      <span style="font-size:${fontSize}px;font-weight:800;letter-spacing:3px;color:#fff;">${COVER_BRAND}</span>
    </div>
  `
}

function renderCoverMainCard(
  platform: ImagePlatform,
  content: CoverContent,
  cfg: (typeof PLATFORM_CONFIG)[ImagePlatform],
): string {
  const { moduleName, topicName, count } = content
  const topicLine = topicName
    ? `<div style="font-size:${platform === 'douyin' ? '30' : '28'}px;font-weight:600;opacity:0.88;margin-top:22px;letter-spacing:2px;">考点 · ${topicName}</div>`
    : ''
  const countColor = platform === 'douyin' ? cfg.accent : '#fff'
  const countGlow =
    platform === 'douyin'
      ? `0 0 40px rgba(0,242,234,0.35), ${coverTextDepth('0 5px 0 rgba(0,0,0,0.45)')}`
      : coverTextDepth('0 6px 0 rgba(160,20,40,0.35), 0 10px 30px rgba(0,0,0,0.2)')
  const cardBg =
    platform === 'xhs'
      ? 'linear-gradient(165deg,rgba(255,255,255,0.24) 0%,rgba(255,255,255,0.12) 100%)'
      : 'linear-gradient(165deg,rgba(255,255,255,0.1) 0%,rgba(255,255,255,0.04) 100%)'
  const cardBorder = platform === 'xhs' ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)'
  const accent2 = platform === 'douyin' ? (cfg as typeof PLATFORM_CONFIG.douyin).accent2 : '#ffd166'

  const textPadLeft = platform === 'douyin' ? 320 : 280

  return `
    <div style="position:relative;width:100%;max-width:${platform === 'douyin' ? '980' : '940'}px;margin:0 auto;">
      ${renderCoverMascotOverlay(platform)}
      <div style="
        position:relative;
        z-index:3;
        width:100%;
        padding:${platform === 'douyin' ? '44px 36px 48px' : '40px 32px 44px'};
        padding-left:${textPadLeft}px;
        background:${cardBg};
        border:3px solid ${cardBorder};
        border-radius:36px;
        box-shadow:0 24px 70px rgba(0,0,0,${platform === 'xhs' ? '0.16' : '0.42'});
        box-sizing:border-box;
        text-align:center;
      ">
        <div style="
          font-size:${platform === 'douyin' ? '72' : '64'}px;
          font-weight:900;
          line-height:1.12;
          letter-spacing:${platform === 'douyin' ? '6' : '5'}px;
          text-shadow:${coverTextDepth('0 6px 0 rgba(0,0,0,0.22), 0 12px 32px rgba(0,0,0,0.18)')};
        ">${moduleName}</div>

        <div style="
          margin-top:${platform === 'douyin' ? '18' : '16'}px;
          display:inline-block;
          padding:6px 18px;
          background:${platform === 'xhs' ? 'rgba(255,255,255,0.22)' : 'rgba(0,242,234,0.14)'};
          border:1.5px solid ${platform === 'xhs' ? 'rgba(255,255,255,0.5)' : 'rgba(0,242,234,0.4)'};
          border-radius:999px;
          font-size:${platform === 'douyin' ? '24' : '22'}px;
          font-weight:800;
          letter-spacing:3px;
        ">刷题精选</div>

        <div style="
          margin-top:${platform === 'douyin' ? '24' : '20'}px;
          display:flex;
          align-items:flex-end;
          justify-content:center;
          gap:${platform === 'douyin' ? '20' : '16'}px;
          line-height:1;
        ">
          <span style="
            font-size:${platform === 'douyin' ? '168' : '152'}px;
            font-weight:900;
            color:${countColor};
            letter-spacing:-4px;
            text-shadow:${countGlow};
          ">${count}</span>
          <div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-end;gap:${platform === 'douyin' ? '8' : '6'}px;padding-bottom:${platform === 'douyin' ? '24' : '20'}px;">
            <span style="font-size:${platform === 'douyin' ? '42' : '38'}px;font-weight:900;letter-spacing:2px;text-shadow:${coverTextDepth('0 3px 0 rgba(0,0,0,0.2)')};">道</span>
            <span style="font-size:${platform === 'douyin' ? '42' : '38'}px;font-weight:900;letter-spacing:2px;text-shadow:${coverTextDepth('0 3px 0 rgba(0,0,0,0.2)')};">精</span>
            <span style="font-size:${platform === 'douyin' ? '42' : '38'}px;font-weight:900;letter-spacing:2px;text-shadow:${coverTextDepth('0 3px 0 rgba(0,0,0,0.2)')};">选</span>
          </div>
        </div>

        ${topicLine}

        <div style="
          margin:${platform === 'douyin' ? '28' : '24'}px auto 0;
          height:4px;
          width:100px;
          background:${platform === 'douyin' ? `linear-gradient(90deg,${cfg.accent},${accent2})` : 'rgba(255,255,255,0.65)'};
          border-radius:2px;
        "></div>

        <div style="
          margin-top:${platform === 'douyin' ? '20' : '18'}px;
          font-size:${platform === 'douyin' ? '28' : '26'}px;
          font-weight:800;
          letter-spacing:3px;
          text-shadow:${coverTextDepth('0 2px 0 rgba(0,0,0,0.15)')};
        ">今日打卡</div>

        <div style="
          margin-top:${platform === 'douyin' ? '14' : '12'}px;
          font-size:${platform === 'douyin' ? '24' : '26'}px;
          font-weight:500;
          opacity:0.72;
          letter-spacing:2px;
          line-height:1.5;
        ">坚持练习 · 稳步提升</div>
      </div>
    </div>
  `
}

function renderCoverFooterBadge(platform: ImagePlatform, badge: string): string {
  const accent = PLATFORM_CONFIG[platform].accent
  if (platform === 'xhs') {
    return `
      <div style="margin-top:36px;display:inline-flex;align-items:center;gap:10px;padding:14px 32px;background:rgba(255,255,255,0.15);border:1.5px solid rgba(255,255,255,0.35);border-radius:999px;font-size:26px;font-weight:600;">
        ${badge}
      </div>
    `
  }
  return `
    <div style="margin-top:32px;display:inline-flex;align-items:center;gap:10px;padding:14px 32px;border:2px solid ${accent};border-radius:999px;font-size:24px;color:${accent};font-weight:600;background:rgba(0,242,234,0.08);">
      ${badge}
    </div>
  `
}

function renderCoverLayout(platform: ImagePlatform, content: CoverContent): string {
  const cfg = PLATFORM_CONFIG[platform]
  const decorations = renderCoverDecorations(platform)
  const brand = renderCoverBrandHeader(platform)
  const mainCard = renderCoverMainCard(platform, content, cfg)
  const footer = renderCoverFooterBadge(platform, cfg.coverBadge)

  if (platform === 'douyin') {
    const coverPad = `padding:${COVER_CONTENT_TOP.douyin}px 32px ${DOUYIN_COVER_SAFE.bottom}px`
    return `
      ${decorations}
      <div style="position:relative;z-index:3;flex:1;display:flex;flex-direction:column;justify-content:flex-start;align-items:center;text-align:center;${coverPad};box-sizing:border-box;">
        ${brand}
        <div style="margin-top:24px;width:100%;">${mainCard}</div>
        ${footer}
      </div>
    `
  }

  return `
    ${decorations}
    <div style="position:relative;z-index:3;flex:1;display:flex;flex-direction:column;height:100%;padding-top:${COVER_CONTENT_TOP.xhs}px;box-sizing:border-box;align-items:center;text-align:center;">
      ${brand}
      <div style="margin-top:28px;width:100%;padding:0 24px;box-sizing:border-box;">${mainCard}</div>
      <div style="margin-top:auto;margin-bottom:48px;">${footer.replace('margin-top:36px', 'margin-top:0')}</div>
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
    coverContent?: CoverContent
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
    const coverContent = options.coverContent ?? {
      moduleName: options.subtitle ?? '考公刷题',
      count: 3,
    }
    el.style.overflow = 'hidden'
    el.innerHTML = renderCoverLayout(platform, coverContent)
  } else {
    const badge = options.index != null ? `第 ${options.index + 1} 题` : '解析'
    const accent2 = platform === 'douyin' ? (cfg as typeof PLATFORM_CONFIG.douyin).accent2 : cfg.accent
    const bodyContent = options.contentHtml ?? content.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const bodyPad = platform === 'douyin' ? 'padding-right:248px;' : 'padding-right:228px;'
    const bodyStyle = options.contentHtml
      ? `flex:1;font-size:28px;line-height:1.8;overflow:hidden;min-height:0;${bodyPad}`
      : `flex:1;font-size:${platform === 'douyin' ? '32' : '30'}px;line-height:1.8;white-space:pre-wrap;overflow:hidden;min-height:0;${bodyPad}`
    el.innerHTML = `
      <div style="font-size:28px;color:${cfg.accent};font-weight:600;margin-bottom:16px;">${badge}</div>
      <div style="font-size:32px;font-weight:700;color:${accent2};margin-bottom:24px;">${options.title}</div>
      <div style="position:relative;flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;">
        <div style="${bodyStyle}">${bodyContent}</div>
        ${renderCardMascotCorner(platform)}
      </div>
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
  await waitForImages(el)
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

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 昨日解析图：同卡展示昨日完整题目（题干+选项/图）+ 答案解析，避免与今日题目图混淆 */
function buildYesterdayQuestionSectionHtml(q: Question, platform: ImagePlatform): string {
  const cfg = PLATFORM_CONFIG[platform]
  const panelBg = platform === 'douyin' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
  const metaColor = platform === 'douyin' ? '#9aa3b2' : '#888'
  const topicLine = q.topicName
    ? `<div style="font-size:22px;color:${metaColor};margin-bottom:8px;">考点：${escapeHtml(q.topicName)}</div>`
    : ''

  let bodyHtml = stemToHtml(q.stem, { dark: platform === 'douyin' })
  if (q.tuxing) {
    bodyHtml += tuxingToHtml(q.tuxing, {
      figureSize: platform === 'douyin' ? 52 : 56,
      dark: platform === 'douyin',
    })
  } else if (q.options?.length) {
    const optBg = platform === 'douyin' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
    const optsHtml = q.options
      .map(
        (o) =>
          `<div style="margin-top:8px;padding:8px 12px;background:${optBg};border-radius:8px;font-size:22px;line-height:1.45;">${escapeHtml(o.key)}. ${escapeHtml(o.text)}</div>`,
      )
      .join('')
    bodyHtml += `<div style="margin-top:12px;">${optsHtml}</div>`
  }

  return `
    <div style="padding:14px 16px;background:${panelBg};border-radius:10px;margin-bottom:18px;line-height:1.55;font-size:24px;">
      <div style="font-size:26px;color:${cfg.accent};font-weight:600;margin-bottom:10px;">📌 昨日题目</div>
      ${topicLine}
      <div>${bodyHtml}</div>
    </div>
  `
}

function buildYesterdayAnswerContentHtml(
  q: Question,
  index: number,
  platform: ImagePlatform,
): string {
  const cfg = PLATFORM_CONFIG[platform]
  const metaColor = platform === 'douyin' ? '#9aa3b2' : '#888'

  const answerBlock = q.options
    ? `✅ 答案：${escapeHtml(q.answer)}`
    : `📝 参考答案：${escapeHtml(q.answer)}`
  const analysisText = formatAnalysisForPublishImage(q.analysis, q.expertStyleLabel)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>')

  return `
    <div style="font-size:22px;color:${metaColor};line-height:1.5;margin-bottom:14px;">
      对应<strong style="color:${cfg.accent};">昨日第 ${index + 1} 题</strong>（下图题目与解析一一对应，非今日新题）
    </div>
    ${buildYesterdayQuestionSectionHtml(q, platform)}
    <div style="font-size:26px;line-height:1.65;">
      <div style="margin-bottom:12px;font-weight:700;">${answerBlock}</div>
      <div style="font-size:24px;color:${metaColor};margin-bottom:6px;">📖 解析</div>
      <div style="font-size:24px;">${analysisText}</div>
    </div>
  `
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

export interface ImageGenOptions {
  /** 昨日存档题目，仅生成其解析图 */
  answerQuestions?: Question[]
  /** 昨日日期，用于解析图文件名 */
  answerDate?: string
  /** 为今日题目同时生成解析图（历史完整发布） */
  includeTodayAnswers?: boolean
}

async function renderQuestionCard(
  q: Question,
  index: number,
  platform: ImagePlatform,
  folder: string,
  fileIndex: number,
): Promise<GeneratedImage> {
  const num = String(index + 1).padStart(2, '0')
  let content = q.stem
  let contentHtml = stemToHtml(q.stem, { dark: platform === 'douyin' })
  if (q.tuxing) {
    contentHtml += tuxingToHtml(q.tuxing, {
      figureSize: 64,
      dark: platform === 'douyin',
    })
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
      index,
      contentHtml,
    }),
    platform,
  )
  return {
    filename: `${String(fileIndex).padStart(2, '0')}-第${num}题-题目-${folder}.png`,
    label: `第 ${index + 1} 题 · 题目`,
    blob: qBlob,
    url: URL.createObjectURL(qBlob),
    platform,
  }
}

async function renderAnswerCard(
  q: Question,
  index: number,
  platform: ImagePlatform,
  folder: string,
  fileIndex: number,
  dateLabel?: string,
): Promise<GeneratedImage> {
  const num = String(index + 1).padStart(2, '0')
  const datePrefix = dateLabel ? `${dateLabel}-` : ''
  const isYesterday = !!dateLabel
  const title = dateLabel
    ? `昨日答案 · ${dateLabel}${q.moduleName ? ` · ${q.moduleName}` : ''}`
    : '答案与解析'
  const contentHtml = isYesterday
    ? buildYesterdayAnswerContentHtml(q, index, platform)
    : undefined
  const answerContent = contentHtml
    ? ''
    : q.options
      ? `✅ 答案：${q.answer}\n\n📖 解析：\n${formatAnalysisForPublishImage(q.analysis, q.expertStyleLabel)}`
      : `📝 参考答案：${q.answer}\n\n📖 思路：\n${formatAnalysisForPublishImage(q.analysis, q.expertStyleLabel)}`

  const aBlob = await renderToBlob(
    createCardElement(answerContent, platform, {
      title,
      theme: 'answer',
      index: isYesterday ? index : undefined,
      contentHtml,
    }),
    platform,
  )
  return {
    filename: `${String(fileIndex).padStart(2, '0')}-${datePrefix}第${num}题-解析-${folder}.png`,
    label: dateLabel ? `昨日第 ${index + 1} 题 · 解析` : `第 ${index + 1} 题 · 解析`,
    blob: aBlob,
    url: URL.createObjectURL(aBlob),
    platform,
  }
}

export async function generatePlatformImages(
  questions: Question[],
  _post: XhsPostContent,
  platform: ImagePlatform,
  options?: ImageGenOptions,
): Promise<GeneratedImage[]> {
  const images: GeneratedImage[] = []
  const folder = platform === 'xhs' ? '小红书' : '抖音'
  let fileIndex = 1

  const coverBlob = await renderToBlob(
    createCardElement('', platform, {
      title: buildCoverTitle(questions, platform),
      theme: 'cover',
      coverContent: parseCoverContent(questions),
    }),
    platform,
  )
  images.push({
    filename: `${String(fileIndex).padStart(2, '0')}-封面-${folder}.png`,
    label: `封面 · ${folder}`,
    blob: coverBlob,
    url: URL.createObjectURL(coverBlob),
    platform,
  })
  fileIndex++

  for (let i = 0; i < questions.length; i++) {
    images.push(await renderQuestionCard(questions[i], i, platform, folder, fileIndex))
    fileIndex++
    if (options?.includeTodayAnswers) {
      images.push(await renderAnswerCard(questions[i], i, platform, folder, fileIndex))
      fileIndex++
    }
  }

  const answerQuestions = options?.answerQuestions ?? []
  for (let i = 0; i < answerQuestions.length; i++) {
    images.push(
      await renderAnswerCard(
        answerQuestions[i],
        i,
        platform,
        folder,
        fileIndex,
        options?.answerDate,
      ),
    )
    fileIndex++
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
