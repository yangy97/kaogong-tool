import { VOCAB_ITEMS } from '../data/words700'

/** 考公逻辑填空常见感情色彩分类 */
export type VocabSentimentTone =
  | '褒义'
  | '偏褒义'
  | '贬义'
  | '偏贬义'
  | '中性'
  | '可褒可贬'

export interface VocabSentiment {
  tone: VocabSentimentTone
  /** 考公语境下的感情色彩说明 */
  note: string
  source: 'library' | 'meaning' | 'inferred'
}

const GRAMMAR_ONLY_USAGE = /^(动词|名词|形容词|副词|介词|连词|助词|叹词|拟声词|关联词|热词|典故|及物|不及物|政务|经济|政治|申论|并列|递进|转折|因果|条件|让步|充分|必要|无条件|结论)/

const USAGE_TONE_RULES: Array<{ pattern: RegExp; tone: VocabSentimentTone }> = [
  { pattern: /可褒可贬/, tone: '可褒可贬' },
  { pattern: /偏褒/, tone: '偏褒义' },
  { pattern: /偏贬|多含贬/, tone: '偏贬义' },
  { pattern: /含褒|褒义/, tone: '褒义' },
  { pattern: /含贬|贬义/, tone: '贬义' },
  { pattern: /^中性$/, tone: '中性' },
]

const MEANING_EXPLICIT_RULES: Array<{ pattern: RegExp; tone: VocabSentimentTone }> = [
  { pattern: /[（(]可褒可贬[）)]/, tone: '可褒可贬' },
  { pattern: /[（(]偏褒[）)]|偏褒义/, tone: '偏褒义' },
  { pattern: /[（(]偏贬[）)]|偏贬义|多含贬义/, tone: '偏贬义' },
  { pattern: /[（(]褒义[）)]|含褒义/, tone: '褒义' },
  { pattern: /[（(]贬义[）)]|含贬义/, tone: '贬义' },
  { pattern: /[（(]中性[）)]|感情色彩中性/, tone: '中性' },
]

/** 释义关键词推断：仅在无明确标注时使用 */
const NEGATIVE_HINTS = [
  '欺骗', '蒙蔽', '虚伪', '奉承', '讨好', '狡辩', '僵化', '守旧', '敷衍', '推诿',
  '浮躁', '浮夸', '轻狂', '傲慢', '自私', '堕落', '败坏', '损害', '破坏', '混淆',
  '以次充好', '以假乱真', '夸大其词', '捏造', '歪曲', '诬陷', '包庇', '舞弊',
  '不作为', '失职', '渎职', '形式主义', '官僚主义', '脱离实际', '生搬硬套',
  '因循守旧', '墨守成规', '好高骛远', '急功近利', '夸夸其谈', '纸上谈兵',
  '半途而废', '虎头蛇尾', '消极', '悲观', '放任', '纵容',
]

const POSITIVE_HINTS = [
  '赞扬', '表扬', '肯定', '鼓励', '表彰', '奖励', '先进', '模范', '榜样',
  '勤奋', '踏实', '务实', '实在', '扎实', '安定', '担当', '奉献', '忠诚', '廉洁', '正直', '光明',
  '谦虚', '谨慎', '周密', '细致', '严谨', '认真', '负责', '敬业',
  '创新', '改革', '进步', '发展', '完善', '优化', '提升', '突破',
  '未雨绸缪', '防患未然', '居安思危', '循序渐进', '持之以恒', '精益求精',
  '兼收并蓄', '博采众长', '实事求是', '求真务实', '高瞻远瞩', '深谋远虑',
]

function parseToneFromUsage(usage?: string): VocabSentimentTone | undefined {
  if (!usage || GRAMMAR_ONLY_USAGE.test(usage.trim())) return undefined
  for (const rule of USAGE_TONE_RULES) {
    if (rule.pattern.test(usage)) return rule.tone
  }
  return undefined
}

function parseToneFromMeaning(meaning?: string): VocabSentimentTone | undefined {
  if (!meaning) return undefined
  for (const rule of MEANING_EXPLICIT_RULES) {
    if (rule.pattern.test(meaning)) return rule.tone
  }
  return undefined
}

function inferToneFromMeaning(meaning: string): VocabSentimentTone | undefined {
  const text = meaning.replace(/\s+/g, '')
  let neg = 0
  let pos = 0

  for (const hint of NEGATIVE_HINTS) {
    let idx = 0
    while ((idx = text.indexOf(hint, idx)) !== -1) {
      const prefix = text.slice(Math.max(0, idx - 1), idx)
      // 「不浮躁」等否定贬义词，体现正面倾向
      if (/[不未非无莫]/.test(prefix)) pos += 1
      else neg += 1
      idx += hint.length
    }
  }

  for (const hint of POSITIVE_HINTS) {
    if (text.includes(hint)) pos += 1
  }

  if (neg >= 2 && pos <= 0) return '贬义'
  if (pos >= 2 && neg <= 0) return '褒义'
  if (neg >= 1 && pos >= 1) return '可褒可贬'
  if (neg >= 1) return '偏贬义'
  if (pos >= 1) return '偏褒义'
  return undefined
}

function buildSentimentNote(
  tone: VocabSentimentTone,
  word: string,
  context?: { meaning?: string; usage?: string },
): string {
  const usage = context?.usage?.trim()
  const usageExtra = usage && !GRAMMAR_ONLY_USAGE.test(usage) && !USAGE_TONE_RULES.some((r) => r.pattern.test(usage))
    ? usage
    : undefined

  const templates: Record<VocabSentimentTone, string> = {
    褒义: `「${word}」为褒义词，多用于正面、肯定类语境，赞扬积极品质或正确做法，逻辑填空中常与贬义词形成对照排除。`,
    偏褒义: `「${word}」偏褒义，整体倾向正面，但个别语境可中性使用，做题时需结合修饰对象与搭配对象细辨。`,
    贬义: `「${word}」为贬义词，常含批评、否定意味，多用于揭示问题、批评错误，不宜填入赞扬类语境。`,
    偏贬义: `「${word}」偏贬义，整体倾向负面，考公文段中多见于批评形式主义、不良作风等语境。`,
    中性: `「${word}」为中性词，本身无明显褒贬色彩，不能凭词义直接判定正误，需重点分析前后文感情倾向与搭配。`,
    可褒可贬: `「${word}」可褒可贬，需据语境判断：同一词语在不同主语、宾语或修饰语下感情色彩可能相反，是易考点。`,
  }

  const base = templates[tone]
  if (usageExtra) return `${base} 词库提示：${usageExtra}。`
  if (usage && USAGE_TONE_RULES.some((r) => r.pattern.test(usage))) {
    const extra = usage.replace(/含褒义|含贬义|褒义|贬义|偏褒义|偏贬义|多含贬义|中性|可褒可贬/g, '').trim()
    if (extra && extra.length >= 2) return `${base} 补充：${extra}。`
  }
  return base
}

export function resolveVocabSentiment(
  word: string,
  options?: { meaning?: string; usage?: string },
): VocabSentiment | undefined {
  const local = VOCAB_ITEMS.find((v) => v.word === word)
  const usage = options?.usage ?? local?.usage
  const meaning = options?.meaning ?? local?.meaning

  const fromUsage = parseToneFromUsage(usage)
  if (fromUsage) {
    return {
      tone: fromUsage,
      note: buildSentimentNote(fromUsage, word, { meaning, usage }),
      source: local ? 'library' : 'meaning',
    }
  }

  const fromMeaning = parseToneFromMeaning(meaning)
  if (fromMeaning) {
    return {
      tone: fromMeaning,
      note: buildSentimentNote(fromMeaning, word, { meaning, usage }),
      source: 'meaning',
    }
  }

  if (meaning) {
    const inferred = inferToneFromMeaning(meaning)
    if (inferred) {
      return {
        tone: inferred,
        note: buildSentimentNote(inferred, word, { meaning, usage }),
        source: 'inferred',
      }
    }
  }

  return undefined
}

export function getSentimentToneLabel(tone: VocabSentimentTone): string {
  return tone
}
