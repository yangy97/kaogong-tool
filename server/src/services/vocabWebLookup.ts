import { searchVocab, VOCAB_ITEMS } from '../data/words700'
import type { VocabItem } from '../types/index'
import { resolveVocabSentiment, type VocabSentiment } from '../utils/vocabSentiment'

export interface VocabWebLink {
  name: string
  url: string
}

export type VocabWebSource = 'youdao' | 'iciba' | 'local'

export interface VocabRelatedWord {
  word: string
  meaning?: string
}

export interface VocabWebSnippet {
  word: string
  meaning: string
  pinyin?: string
  source: VocabWebSource
  sourceUrl: string
  synonyms?: VocabRelatedWord[]
  antonyms?: VocabRelatedWord[]
  sentiment?: VocabSentiment
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

type YoudaoJson = {
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

function trimMeaning(text: string, max = 80): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function extractYoudaoMeaning(data: YoudaoJson, word: string): {
  meaning?: string
  pinyin?: string
  resolvedWord?: string
} {
  const pinyin = data.newhh?.dataList?.[0]?.pinyin ?? data.simple?.word?.[0]?.phone
  const def = data.newhh?.dataList?.[0]?.sense?.[0]?.def?.[0]
  if (def && hasEnoughChinese(def)) {
    return {
      meaning: trimMeaning(def, 80),
      pinyin,
      resolvedWord: data.newhh?.dataList?.[0]?.word ?? word,
    }
  }

  const baike = data.baike?.summarys?.[0]?.summary
  if (baike && hasEnoughChinese(baike)) {
    return { meaning: trimMeaning(baike, 80), pinyin, resolvedWord: word }
  }

  return { pinyin }
}

async function fetchYoudaoJson(word: string): Promise<YoudaoJson | null> {
  const url = `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; kaogong-tool/1.0)',
      Referer: 'https://www.youdao.com/',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  return (await res.json()) as YoudaoJson
}

async function fetchYoudaoChinese(word: string): Promise<VocabWebSnippet | null> {
  const data = await fetchYoudaoJson(word)
  if (!data) return null

  const sourceUrl = `https://www.youdao.com/result?word=${encodeURIComponent(word)}&lang=zh-CHS`
  const extracted = extractYoudaoMeaning(data, word)
  if (!extracted.meaning) return null

  return {
    word: extracted.resolvedWord ?? word,
    meaning: extracted.meaning.length > 180 ? `${extracted.meaning.slice(0, 177)}…` : extracted.meaning,
    pinyin: extracted.pinyin,
    source: 'youdao',
    sourceUrl,
  }
}

async function resolveBriefMeaning(word: string): Promise<string | undefined> {
  const local = VOCAB_ITEMS.find((v) => v.word === word)
  if (local) return trimMeaning(local.meaning)

  try {
    const data = await fetchYoudaoJson(word)
    if (data) {
      const extracted = extractYoudaoMeaning(data, word)
      if (extracted.meaning) return extracted.meaning
    }
  } catch {
    /* 忽略单条释义失败 */
  }

  return undefined
}

const MAX_RELATED_WORDS = 5

async function fetchZdicSynAnt(word: string): Promise<{ synonyms: string[]; antonyms: string[] }> {
  const url = `https://www.zdic.net/hans/${encodeURIComponent(word)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; kaogong-tool/1.0)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return { synonyms: [], antonyms: [] }

  const html = await res.text()
  const pairs = [...html.matchAll(
    /<span class="xxjs-block-label[^"]*">([^<]+)<\/span>\s*<span class="xxjs-also__text">([\s\S]*?)<\/span>/g,
  )]

  let synonyms: string[] = []
  let antonyms: string[] = []
  for (const [, label, content] of pairs) {
    const words = [...content.matchAll(/class="syn-tag">([^<]+)<\/a>/g)]
      .map((m) => m[1].trim())
      .filter(Boolean)
    if (label.includes('近义')) synonyms = words
    if (label.includes('反义')) antonyms = words
  }

  return {
    synonyms: synonyms.slice(0, MAX_RELATED_WORDS),
    antonyms: antonyms.slice(0, MAX_RELATED_WORDS),
  }
}

function enrichWithSentiment(snippet: VocabWebSnippet, local?: VocabItem): VocabWebSnippet {
  const sentiment = resolveVocabSentiment(snippet.word, {
    meaning: snippet.meaning,
    usage: local?.usage,
  })
  if (!sentiment) return snippet
  return { ...snippet, sentiment }
}

async function enrichWithRelatedWords(snippet: VocabWebSnippet): Promise<VocabWebSnippet> {
  try {
    const { synonyms, antonyms } = await fetchZdicSynAnt(snippet.word)
    if (!synonyms.length && !antonyms.length) return snippet

    const allWords = [...synonyms, ...antonyms]
    const meanings = await Promise.all(allWords.map((w) => resolveBriefMeaning(w)))
    const meaningMap = Object.fromEntries(allWords.map((w, i) => [w, meanings[i]]))

    return {
      ...snippet,
      synonyms: synonyms.map((w) => ({ word: w, meaning: meaningMap[w] })),
      antonyms: antonyms.map((w) => ({ word: w, meaning: meaningMap[w] })),
    }
  } catch {
    return snippet
  }
}

async function enrichSnippet(snippet: VocabWebSnippet, local?: VocabItem): Promise<VocabWebSnippet> {
  const withSentiment = enrichWithSentiment(snippet, local)
  return enrichWithRelatedWords(withSentiment)
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
  let snippet: VocabWebSnippet | undefined

  try {
    const youdao = await fetchYoudaoChinese(word)
    if (youdao) snippet = youdao
  } catch {
    /* 继续尝试其他来源 */
  }

  if (!snippet) {
    try {
      const iciba = await fetchIcibaChinese(word)
      if (iciba) snippet = iciba
    } catch {
      /* 继续 */
    }
  }

  if (!snippet) {
    const exact = local.find((v) => v.word === word)
    if (exact) snippet = snippetFromLocal(exact)
  }

  if (!snippet) return undefined
  const localExact = local.find((v) => v.word === word)
  return enrichSnippet(snippet, localExact)
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
