import type { TuxingData } from '../types/tuxing'

const KEYS = ['A', 'B', 'C', 'D'] as const
type AnswerKey = (typeof KEYS)[number]

export interface ChoiceQuestionLike {
  type: string
  options?: Array<{ key: string; text: string }>
  answer: string
  analysis: string
  tuxing?: TuxingData
}

export function buildAnswerDiversityPrompt(count: number): string {
  if (count <= 1) return ''
  const spread =
    count === 2
      ? '两题 answer 必须不同（如 A 与 C）'
      : count === 3
        ? '三题 answer 须互不相同（如 A、C、D 各一）'
        : `${count} 题 answer 至少覆盖 3 种不同字母，禁止全部为同一字母`
  return [
    spread + '。',
    '设计题目时直接把各题正确答案放在不同选项位（如第1题 A、第2题 C），不要全部答 D。',
    '每题 options 正文、analysis 结论「选X」与 answer 字段必须一一对应。',
  ].join('')
}

/** 多道四选一是否答案字母过于集中 */
export function hasDuplicateChoiceAnswers(questions: ChoiceQuestionLike[]): boolean {
  const keys = questions
    .filter((q) => q.type === 'single' && q.options?.length === 4)
    .map((q) => parseAnswerKey(q.answer))
    .filter((k): k is AnswerKey => k != null)
  if (keys.length < 2) return false
  return new Set(keys).size < Math.min(keys.length, countMinSpread(keys.length))
}

function countMinSpread(n: number): number {
  if (n <= 1) return 1
  if (n === 2) return 2
  if (n === 3) return 3
  return 3
}

export function buildAnswerDiversityRetryHint(count: number, beforeKeys: string): string {
  return [
    `上次输出不合格：${count} 道单选题的 answer 过于集中（${beforeKeys}）。`,
    '请重新生成整套题：各题正确答案分别落在不同选项字母上，',
    '且每题 options、analysis「选X」与 answer 保持一致。',
  ].join('')
}

export function parseAnswerKey(answer: string): AnswerKey | null {
  const m = answer.trim().toUpperCase().match(/[A-D]/)
  if (!m) return null
  return m[0] as AnswerKey
}

function keyIndex(key: AnswerKey): number {
  return KEYS.indexOf(key)
}

function swapOptionTexts(
  options: Array<{ key: string; text: string }>,
  a: AnswerKey,
  b: AnswerKey,
): Array<{ key: string; text: string }> {
  const next = options.map((o) => ({ ...o }))
  const ia = next.findIndex((o) => o.key === a)
  const ib = next.findIndex((o) => o.key === b)
  if (ia < 0 || ib < 0) return options
  const tmp = next[ia]!.text
  next[ia]!.text = next[ib]!.text
  next[ib]!.text = tmp
  return next
}

function swapTuxingOptions(tuxing: TuxingData, a: AnswerKey, b: AnswerKey): TuxingData {
  const ia = keyIndex(a)
  const ib = keyIndex(b)
  if (ia < 0 || ib < 0 || ia >= tuxing.options.length || ib >= tuxing.options.length) {
    return tuxing
  }
  const options = [...tuxing.options]
  ;[options[ia], options[ib]] = [options[ib]!, options[ia]!]
  return { ...tuxing, options }
}

/** 分析推理等考点：选项字母与解析强绑定，不做答案分散 */
const SKIP_DIVERSIFY_TOPIC_IDS = new Set([
  'panduan-fenxi',
  'panduan-fanyi',
  'panduan-zhenjia',
])

export interface DiversifyContext {
  topicId?: string
}

export function shouldDiversifyAnswers(topicId?: string): boolean {
  if (!topicId) return true
  return !SKIP_DIVERSIFY_TOPIC_IDS.has(topicId)
}

const OPT_PLACEHOLDER = '\uE000OPT_'

/** 将解析中所有对选项字母的指称替换为 to（from 可为占位符） */
function replaceOptionLetterRefs(text: string, from: string, to: string): string {
  const f = from.toUpperCase()
  const patterns = [
    new RegExp(`选\\s*${f}`, 'gi'),
    new RegExp(`答案[：:]\\s*${f}`, 'gi'),
    new RegExp(`选项\\s*${f}`, 'gi'),
    new RegExp(`${f}\\s*项`, 'gi'),
    new RegExp(`${f}\\s*为`, 'gi'),
    new RegExp(`${f}\\s*说`, 'gi'),
    new RegExp(`故\\s*${f}`, 'gi'),
    new RegExp(`${f}\\s*不符`, 'gi'),
    new RegExp(`${f}\\s*错`, 'gi'),
    new RegExp(`${f}(?=[、,，。；\\s]|$)`, 'g'),
  ]
  let out = text
  for (const re of patterns) {
    out = out.replace(re, (m) => m.replace(new RegExp(f, 'i'), to))
  }
  return out
}

/** 交换解析中对两个选项字母的全部指称（与 swapOptionTexts 对应） */
function swapAnalysisOptionLetters(analysis: string, a: AnswerKey, b: AnswerKey): string {
  if (a === b) return analysis
  const phA = `${OPT_PLACEHOLDER}${a}\uE001`
  let s = replaceOptionLetterRefs(analysis, a, phA)
  s = replaceOptionLetterRefs(s, b, a)
  s = replaceOptionLetterRefs(s, phA, b)
  return s
}

/** 统一解析末尾「选X」，与 answer 字段一致 */
function ensureAnalysisAnswerTag(analysis: string, answer: AnswerKey): string {
  const body = analysis.replace(/选\s*[A-D][。！？]?$/i, '').replace(/[，。；\s]+$/, '').trim()
  if (!body) return `选${answer}。`
  return `${body}，选${answer}。`
}

function remapAnswerKey<Q extends ChoiceQuestionLike>(
  q: Q,
  from: AnswerKey,
  to: AnswerKey,
): Q {
  if (from === to) return q
  const options = q.options?.length ? swapOptionTexts(q.options, from, to) : q.options
  const tuxing = q.tuxing ? swapTuxingOptions(q.tuxing, from, to) : q.tuxing
  const analysis = ensureAnalysisAnswerTag(swapAnalysisOptionLetters(q.analysis, from, to), to)
  return {
    ...q,
    options,
    tuxing,
    answer: to,
    analysis,
  }
}

function buildTargetKeys(count: number): AnswerKey[] {
  const start = Math.floor(Math.random() * 4)
  return Array.from({ length: count }, (_, i) => KEYS[(start + i) % 4]!)
}

function countUniqueAnswers(questions: ChoiceQuestionLike[]): number {
  return new Set(
    questions.map((q) => parseAnswerKey(q.answer)).filter((k): k is AnswerKey => k != null),
  ).size
}

/** 将单选题答案分散到 A/B/C/D，通过交换选项内容保持题目正确性 */
export interface AnswerDiversifyReport {
  triggered: boolean
  reason: string
  before: string
  after: string
  uniqueBefore: number
  uniqueAfter: number
  changes: Array<{ questionIndex: number; from: AnswerKey; to: AnswerKey }>
}

export function summarizeAnswerKeys(questions: ChoiceQuestionLike[]): string {
  return questions
    .map((q, i) => {
      if (q.type !== 'single' || !q.options?.length) return `${i + 1}:-`
      return `${i + 1}:${parseAnswerKey(q.answer) ?? '?'}`
    })
    .join(', ')
}

export function diversifyChoiceAnswersWithReport<Q extends ChoiceQuestionLike>(
  questions: Q[],
  context?: DiversifyContext,
): { questions: Q[]; report: AnswerDiversifyReport } {
  const before = summarizeAnswerKeys(questions)

  if (context?.topicId && !shouldDiversifyAnswers(context.topicId)) {
    const choiceQs = questions.filter(
      (q) => q.type === 'single' && q.options?.length === 4 && parseAnswerKey(q.answer),
    )
    const unique = countUniqueAnswers(choiceQs)
    return {
      questions,
      report: {
        triggered: false,
        reason: '分析推理/翻译推理/真假推理考点不分散答案，避免选项与解析错位',
        before,
        after: before,
        uniqueBefore: unique,
        uniqueAfter: unique,
        changes: [],
      },
    }
  }
  const indices: number[] = []
  questions.forEach((q, i) => {
    if (q.type === 'single' && q.options?.length === 4 && parseAnswerKey(q.answer)) {
      indices.push(i)
    }
  })

  if (indices.length <= 1) {
    const choiceQs = indices.map((i) => questions[i]!)
    const unique = countUniqueAnswers(choiceQs)
    return {
      questions,
      report: {
        triggered: false,
        reason: '仅 1 道四选一单选题，无需分散',
        before,
        after: before,
        uniqueBefore: unique,
        uniqueAfter: unique,
        changes: [],
      },
    }
  }

  const choiceQs = indices.map((i) => questions[i]!)
  const uniqueBefore = countUniqueAnswers(choiceQs)
  const needSpread = uniqueBefore < Math.min(indices.length, 4) && indices.length >= 2

  if (!needSpread) {
    return {
      questions,
      report: {
        triggered: false,
        reason: `AI 答案已分散（${uniqueBefore} 种不同选项）`,
        before,
        after: before,
        uniqueBefore,
        uniqueAfter: uniqueBefore,
        changes: [],
      },
    }
  }

  const targets = buildTargetKeys(indices.length)
  const out = [...questions]
  const changes: AnswerDiversifyReport['changes'] = []

  indices.forEach((qi, idx) => {
    const q = out[qi]!
    const current = parseAnswerKey(q.answer)
    const target = targets[idx]!
    if (!current || current === target) return
    out[qi] = remapAnswerKey(q, current, target)
    changes.push({ questionIndex: qi + 1, from: current, to: target })
  })

  const after = summarizeAnswerKeys(out)
  const uniqueAfter = countUniqueAnswers(indices.map((i) => out[i]!))

  return {
    questions: out,
    report: {
      triggered: true,
      reason: `AI 返回重复答案（${uniqueBefore} 种），已交换选项内容分散`,
      before,
      after,
      uniqueBefore,
      uniqueAfter,
      changes,
    },
  }
}

export function diversifyChoiceAnswers<Q extends ChoiceQuestionLike>(
  questions: Q[],
  context?: DiversifyContext,
): Q[] {
  return diversifyChoiceAnswersWithReport(questions, context).questions
}
