/** 行测选择题解析上限（含名师前缀，允许 2-3 个式子） */
export const ANALYSIS_MAX_LEN = 150

/** 申论参考答案说明上限 */
export const ESSAY_ANALYSIS_MAX_LEN = 220

const VERBOSE_SECTION_RE = /【(?:实际计算|秒杀点|注意|验算)】/g
const DRAFT_MARKER_RE =
  /\?\s*错[,，:：]?|不对[,，:：]|需重算|重新计算[:：]?|实际计算[:：]?|但选项无|选最接近的[^，。；?？]*[?？]\s*错[,，]?/gi

/** 注入 system prompt（精简，避免与用户 prompt 重复） */
export const ANALYSIS_PROMPT_RULES = `解析 analysis：列 2-3 个关键式子（；分隔）+ 结论 + 选X，≤150 字。禁止试算纠错、多种算法对比。`

export interface CompactAnalysisOptions {
  expertPrefix?: string
  answer?: string
  isEssay?: boolean
}

/** 去掉试算草稿，保留公式链 */
export function compactAnalysis(text: string, options?: CompactAnalysisOptions): string {
  const maxLen = options?.isEssay ? ESSAY_ANALYSIS_MAX_LEN : ANALYSIS_MAX_LEN

  let body = text.replace(/\s+/g, ' ').trim()
  if (!body) {
    const prefix = options?.expertPrefix?.trim() ?? ''
    return prefix ? `${prefix}详见答案。` : '详见答案。'
  }

  body = body.replace(VERBOSE_SECTION_RE, '')

  let prefix = ''
  const tagMatch = body.match(/^(【[^】]+】)\s*/)
  if (tagMatch) {
    prefix = tagMatch[1]
    body = body.slice(tagMatch[0].length).trim()
  } else if (options?.expertPrefix) {
    prefix = options.expertPrefix.replace(/\s+$/, '')
  }

  const segments = body.split(DRAFT_MARKER_RE).map((s) => s.trim()).filter(Boolean)
  if (segments.length > 1) {
    body = segments[segments.length - 1]
  }

  const pickRe = /选\s*([A-D])/gi
  const picks: Array<{ index: number; len: number }> = []
  let pm: RegExpExecArray | null
  while ((pm = pickRe.exec(body)) !== null) {
    picks.push({ index: pm.index, len: pm[0].length })
  }
  if (picks.length > 1) {
    const last = picks[picks.length - 1]
    const start = Math.max(0, last.index - 100)
    let chunk = body.slice(start, last.index + last.len)
    const relCut = chunk.search(/[；。]/)
    if (relCut > 0 && relCut < 40) {
      chunk = chunk.slice(relCut + 1).trim()
    } else if (start > 0) {
      chunk = `…${chunk.trim()}`
    }
    body = chunk
  }

  const midCut = body.search(/[，。；]\s*(?:115法|假设法|特值法|放缩)/)
  if (midCut > 0 && body.length > 50) {
    const after = body.slice(midCut)
    if (/不对|需重算|错/.test(after)) {
      body = body.slice(0, midCut)
    }
  }

  if (!/选\s*[A-D]/i.test(body) && options?.answer) {
    body = `${body.replace(/[，。；\s]+$/, '')}，选${options.answer.toUpperCase()}。`
  } else if (!/[。！？]$/.test(body)) {
    body += '。'
  }

  let result = prefix ? `${prefix}${body}` : body

  if (result.length > maxLen) {
    const tailMatch = result.match(/(选\s*[A-D])[。]?$/)
    const tail = tailMatch ? `${tailMatch[1]}。` : options?.answer ? `选${options.answer.toUpperCase()}。` : '。'
    const prefixLen = prefix.length
    const budget = maxLen - tail.length
    let core = prefix ? result.slice(prefixLen) : result
    core = core.replace(/选\s*[A-D][。]?$/, '').trim()

    if (core.length > budget - prefixLen) {
      const parts = core.split(/[；。]/).filter(Boolean)
      if (parts.length > 1) {
        let kept = ''
        for (const p of parts) {
          const next = kept ? `${kept}；${p}` : p
          if (next.length + tail.length + prefixLen <= maxLen) kept = next
          else break
        }
        core = kept || core.slice(0, budget - prefixLen - 4) + '…'
      } else {
        core = core.slice(0, budget - prefixLen - 1)
        const punc = core.search(/[，；][^，；]*$/)
        if (punc > 20) core = core.slice(0, punc + 1)
        else core = `${core.slice(0, budget - prefixLen - 4)}…`
      }
    }

    result = prefix ? `${prefix}${core}${tail}` : `${core}${tail}`
  }

  return result.trim()
}

/** 配图卡片：分号换行，便于阅读 */
export function formatAnalysisForCard(analysis: string): string {
  return analysis
    .replace(/；/g, '\n')
    .replace(/([。！？])\s*(选\s*[A-D])/i, '$1\n$2')
    .trim()
}
