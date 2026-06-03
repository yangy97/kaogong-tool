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
  if (count === 2) return '两道题的 answer 必须不同（如一题 A、一题 B），禁止同为 A/B/C/D。'
  if (count === 3) return '三道题的 answer 须为三个不同选项（如 A、B、C 各一），禁止三题同选。'
  return `${count} 道题的 answer 须覆盖 A/B/C/D 且尽量分散，至少 3 种不同选项，禁止全部同为某一字母。`
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

function patchAnalysis(analysis: string, from: AnswerKey, to: AnswerKey): string {
  if (from === to) return analysis
  return analysis
    .replace(new RegExp(`选\\s*${from}`, 'gi'), `选${to}`)
    .replace(new RegExp(`答案[：:]\\s*${from}`, 'gi'), `答案：${to}`)
    .replace(new RegExp(`选项\\s*${from}`, 'gi'), `选项${to}`)
}

function remapAnswerKey<Q extends ChoiceQuestionLike>(
  q: Q,
  from: AnswerKey,
  to: AnswerKey,
): Q {
  if (from === to) return q
  const options = q.options?.length ? swapOptionTexts(q.options, from, to) : q.options
  const tuxing = q.tuxing ? swapTuxingOptions(q.tuxing, from, to) : q.tuxing
  return {
    ...q,
    options,
    tuxing,
    answer: to,
    analysis: patchAnalysis(q.analysis, from, to),
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
export function diversifyChoiceAnswers<Q extends ChoiceQuestionLike>(questions: Q[]): Q[] {
  const indices: number[] = []
  questions.forEach((q, i) => {
    if (q.type === 'single' && q.options?.length === 4 && parseAnswerKey(q.answer)) {
      indices.push(i)
    }
  })
  if (indices.length <= 1) return questions

  const choiceQs = indices.map((i) => questions[i]!)
  const unique = countUniqueAnswers(choiceQs)
  const needSpread = unique < Math.min(indices.length, 4) && indices.length >= 2
  if (!needSpread) return questions

  const targets = buildTargetKeys(indices.length)
  const out = [...questions]

  indices.forEach((qi, idx) => {
    const q = out[qi]!
    const current = parseAnswerKey(q.answer)
    const target = targets[idx]!
    if (!current || current === target) return
    out[qi] = remapAnswerKey(q, current, target)
  })

  return out
}
