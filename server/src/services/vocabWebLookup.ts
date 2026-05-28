import { searchVocab } from '../data/words700.js'
import type { VocabItem } from '../types/index.js'

export interface VocabWebLink {
  name: string
  url: string
}

export type VocabWebSource = 'youdao' | 'iciba' | 'local'

export interface VocabWebSnippet {
  word: string
  meaning: string
  pinyin?: string
  source: VocabWebSource
  sourceUrl: string
}

export interface VocabWebLookupResult {
  keyword: string
  local: VocabItem[]
  web?: VocabWebSnippet
  links: VocabWebLink[]
}

const SOURCE_LABEL: Record<VocabWebSource, string> = {
  youdao: '有道词典',
  iciba: '金山词霸',
  local: '700 词库',
}

export function getVocabWebSourceLabel(source: VocabWebSource): string {
  return SOURCE_LABEL[source]
}

function buildExternalLinks(keyword: string): VocabWebLink[] {
  const q = encodeURIComponent(keyword)
  return [
    { name: '百度汉语', url: `https://hanyu.baidu.com/s?wd=${q}` },
    { name: '有道词典', url: `https://www.youdao.com/result?word=${q}&lang=zh-CHS` },
    { name: '必应搜索', url: `https://cn.bing.com/search?q=${encodeURIComponent(`${keyword} 成语 释义`)}` },
  ]
}

function hasEnoughChinese(text: string, min = 4): boolean {
  const cjk = text.match(/[\u4e00-\u9fff]/g)
  return (cjk?.length ?? 0) >= min
}

/** 去掉英文片段，只保留中文及常用标点 */
function keepChineseText(text: string): string {
  return text
    .replace(/[a-zA-Z][a-zA-Z0-9\s,;.'"-]*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractChineseFromIciba(paraphrase: string): string | null {
  const paren = paraphrase.match(/[（(]([^）)]+)[）)]/)
  if (paren?.[1] && hasEnoughChinese(paren[1], 2)) {
    return paren[1].replace(/\s+/g, ' ').trim()
  }
  const chinese = keepChineseText(paraphrase)
  return hasEnoughChinese(chinese, 4) ? chinese : null
}

async function fetchYoudaoChinese(word: string): Promise<VocabWebSnippet | null> {
  const url = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; kaogong-tool/1.0)',
      Referer: 'https://www.youdao.com/',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    newhh?: {
      dataList?: Array<{
        word?: string
        pinyin?: string
        sense?: Array<{ def?: string[] }>
      }>
    }
    baike?: { summarys?: Array<{ summary?: string }> }
    simple?: { word?: Array<{ phone?: string }> }
  }

  const sourceUrl = `https://www.youdao.com/result?word=${encodeURIComponent(word)}&lang=zh-CHS`
  const pinyin = data.newhh?.dataList?.[0]?.pinyin ?? data.simple?.word?.[0]?.phone

  const def = data.newhh?.dataList?.[0]?.sense?.[0]?.def?.[0]
  if (def && hasEnoughChinese(def)) {
    const meaning = def.length > 180 ? `${def.slice(0, 177)}…` : def
    return {
      word: data.newhh?.dataList?.[0]?.word ?? word,
      meaning,
      pinyin,
      source: 'youdao',
      sourceUrl,
    }
  }

  const baike = data.baike?.summarys?.[0]?.summary
  if (baike && hasEnoughChinese(baike)) {
    return {
      word,
      meaning: baike.length > 160 ? `${baike.slice(0, 157)}…` : baike,
      pinyin,
      source: 'youdao',
      sourceUrl,
    }
  }

  return null
}

async function fetchIcibaChinese(word: string): Promise<VocabWebSnippet | null> {
  const url = `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&isneedmean=1&word=${encodeURIComponent(word)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; kaogong-tool/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null

  const data = (await res.json()) as {
    message?: Array<{ key?: string; paraphrase?: string }>
  }
  const hit = data.message?.[0]
  if (!hit?.paraphrase) return null

  const meaning = extractChineseFromIciba(hit.paraphrase)
  if (!meaning) return null

  const w = hit.key?.trim() || word
  return {
    word: w,
    meaning,
    source: 'iciba',
    sourceUrl: `https://www.iciba.com/word?w=${encodeURIComponent(w)}`,
  }
}

function snippetFromLocal(item: VocabItem): VocabWebSnippet {
  const parts = [item.meaning]
  if (item.usage) parts.push(`用法：${item.usage}`)
  if (item.example) parts.push(`例：${item.example}`)
  return {
    word: item.word,
    meaning: parts.join('；'),
    pinyin: item.pinyin,
    source: 'local',
    sourceUrl: '',
  }
}

async function fetchWebDefinition(word: string, local: VocabItem[]): Promise<VocabWebSnippet | undefined> {
  try {
    const youdao = await fetchYoudaoChinese(word)
    if (youdao) return youdao
  } catch {
    /* 继续尝试其他来源 */
  }

  try {
    const iciba = await fetchIcibaChinese(word)
    if (iciba) return iciba
  } catch {
    /* 继续 */
  }

  const exact = local.find((v) => v.word === word)
  if (exact) return snippetFromLocal(exact)

  return undefined
}

/** 联网查词：优先中文在线释义，不消耗 AI Token */
export async function lookupVocabOnline(keyword: string): Promise<VocabWebLookupResult> {
  const q = keyword.trim()
  if (!q) {
    throw new Error('请输入要查询的词语')
  }
  if (q.length > 20) {
    throw new Error('查询词过长，请输入 20 字以内')
  }

  const local = searchVocab(q)
  const links = buildExternalLinks(q)
  const web = await fetchWebDefinition(q, local)

  return { keyword: q, local, web, links }
}
