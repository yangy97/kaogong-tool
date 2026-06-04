import type { Question, XhsPostContent } from '../types/index'
import { DEFAULT_TAGS, DOUYIN_TAGS } from '../constants'

export interface PreviousDayPost {
  date: string
  questions: Question[]
}

export interface BuildPostOptions {
  previousDay?: PreviousDayPost
  /** 历史题目完整发布：文案含题干与答案（解析仅在配图，默认 false） */
  includeAnswers?: boolean
  /** 打卡天数序号，用于标题 DAY{n} */
  dayNumber?: number
}

/** 发布标题：考公每日一练之{考点/模块}刷题DAY{n} */
export function buildDailyTitle(questions: Question[], dayNumber: number): string {
  const subject = questions[0]?.topicName || questions[0]?.moduleName || '考公'
  return `考公每日一练之${subject}刷题DAY${dayNumber}`
}

/** 仅压缩 AI 题干里多余空白/换行，不影响引导语与选项排版 */
function compactStem(stem: string): string {
  return stem
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/** 段落之间只保留单行换行，避免复制后出现多余空行 */
function joinBlocks(blocks: string[]): string {
  return blocks
    .map((b) => b.trim())
    .filter(Boolean)
    .join('\n')
}

/** 配图序号：①②③…（超过 20 用「第 N 张」） */
function toCircledNum(n: number): string {
  if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1)
  return `第${n}张`
}

function formatCircledRange(start: number, end: number): string {
  if (start >= end) return toCircledNum(start)
  return `${toCircledNum(start)}–${toCircledNum(end)}`
}

/** 昨日答案行：考点名或题干前若干字，便于对号（不重复完整题干） */
function buildQuestionAnchor(q: Question, maxLen = 14): string {
  if (q.topicName?.trim()) return q.topicName.trim()
  const plain = compactStem(q.stem)
    .replace(/\|[^|]*\|/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return ''
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain
}

function formatQuestionBlock(q: Question, index: number): string {
  let block = `${index + 1}. ${compactStem(q.stem)}`

  if (q.options?.length) {
    block += '\n' + q.options.map((o) => `   ${o.key}. ${o.text}`).join('\n')
  } else {
    block += '\n📝 （主观题，请自行作答）'
  }

  return block
}

function formatQuestionWithAnswerBlock(q: Question, index: number): string {
  let block = formatQuestionBlock(q, index)
  if (q.options?.length) {
    block += `\n💡 答案：${q.answer}（解析见配图）`
  } else {
    block += `\n📝 参考要点：${q.answer}（思路见配图）`
  }
  return block
}

/** 昨日揭晓：关键词 + 答案速查，完整原题与解析在配图 */
function formatYesterdayAnswerLine(q: Question, index: number): string {
  const anchor = buildQuestionAnchor(q)
  const answer = q.options?.length ? `✅ ${q.answer}` : `📝 ${q.answer}`
  return anchor
    ? `${index + 1}. ${anchor} · ${answer}`
    : `${index + 1}. ${answer}`
}

/** 抖音今日：题干在配图，描述区不写全文以控字数 */
function formatDouyinTodayBrief(questions: Question[]): string {
  const count = questions.length
  const moduleName = questions[0]?.moduleName ?? '考公'
  const topic = questions[0]?.topicName
  const subject = topic ? `${topic} · ` : ''
  const range = formatCircledRange(2, 1 + count)
  return `📋 今日${subject}${moduleName} ${count}题，题干与选项见配图 ${range}`
}

export function formatPreviousDaySection(
  previousDay: PreviousDayPost,
  todayQuestionCount: number,
): string {
  const count = previousDay.questions.length
  const moduleName = previousDay.questions[0]?.moduleName ?? '考公'
  const imgStart = 2 + todayQuestionCount
  const imgEnd = imgStart + count - 1
  const imgRange = formatCircledRange(imgStart, imgEnd)
  const header = `🎯 昨日（${previousDay.date}）${moduleName} ${count}题 · 答案速查\n📖 原题与解析见配图 ${imgRange}（每张一题，含题干）`
  const body = previousDay.questions.map((q, i) => formatYesterdayAnswerLine(q, i)).join('\n')
  return joinBlocks([header, body])
}

function collectExpertTags(questions: Question[]): string[] {
  const set = new Set<string>()
  for (const q of questions) {
    if (q.expertStyleLabel) set.add(q.expertStyleLabel)
    q.tags?.forEach((t) => {
      if (!['花生十三', '高照', '聂佳', '龙飞', '阿里木江', '郭熙', '李梦娇', '刘文超', '白鹭'].includes(t)) {
        set.add(t)
      }
    })
  }
  return [...set]
}

function buildPostBase(
  questions: Question[],
  options: BuildPostOptions | undefined,
  platform: 'xhs' | 'douyin',
): XhsPostContent {
  const moduleName = questions[0]?.moduleName ?? '考公'
  const count = questions.length
  const dayNumber = options?.dayNumber ?? 1
  const title = buildDailyTitle(questions, dayNumber)

  const intro =
    platform === 'xhs'
      ? `📚 今日${moduleName}专项练习来啦！\n坚持刷题，离上岸更近一步 💪`
      : `🔥 今日${moduleName}专项刷题！\n先做题，答案明天见～`

  const includeAnswers = options?.includeAnswers === true
  const bodyParts = includeAnswers
    ? questions.map((q, i) => formatQuestionWithAnswerBlock(q, i))
    : platform === 'douyin'
      ? [formatDouyinTodayBrief(questions)]
      : questions.map((q, i) => formatQuestionBlock(q, i))

  const outro = includeAnswers
    ? platform === 'xhs'
      ? '---\n✅ 答案与解析见配图 💬 欢迎在评论区交流做题思路 🔖 收藏起来慢慢做！'
      : '---\n✅ 答案与解析见配图 👇 评论区说说你做对了几个'
    : platform === 'xhs'
      ? '---\n⏳ 今日答案明日揭晓，先做题吧！ 💬 欢迎在评论区交流做题思路 🔖 收藏起来慢慢做！'
      : '---\n⏳ 今日答案明天公布，欢迎评论区交流'

  const todayBody = joinBlocks([intro, ...bodyParts, outro])

  const bodyBlocks: string[] = []
  if (!includeAnswers && options?.previousDay?.questions.length) {
    bodyBlocks.push(formatPreviousDaySection(options.previousDay, count), '---')
  }
  bodyBlocks.push(todayBody)
  const body = joinBlocks(bodyBlocks)

  const expertTags = collectExpertTags([
    ...questions,
    ...(options?.previousDay?.questions ?? []),
  ])

  const tags =
    platform === 'xhs'
      ? [...DEFAULT_TAGS, moduleName.replace(/与/g, ''), ...expertTags, '每日刷题', '公考备考'].slice(0, 10)
      : [...DOUYIN_TAGS, moduleName.replace(/与/g, ''), ...expertTags, '每日刷题'].slice(0, 8)

  const coverHint =
    platform === 'xhs'
      ? `封面建议：${moduleName} + 今日${count}题 + 考公打卡风格`
      : `抖音封面：${moduleName}刷题，深色高对比风格`

  return { title, body, todayBody, tags, coverHint, todayQuestionCount: count }
}

export function buildXhsPost(questions: Question[], options?: BuildPostOptions): XhsPostContent {
  return buildPostBase(questions, options, 'xhs')
}

/** 复制用正文：不含话题标签（平台发布时自行填写） */
export function formatCopyText(post: XhsPostContent, options?: BuildPostOptions): string {
  const includeAnswers = options?.includeAnswers === true
  const todayBody = post.todayBody ?? post.body
  const blocks: string[] = []
  if (!includeAnswers && options?.previousDay?.questions.length) {
    const todayCount = post.todayQuestionCount ?? 0
    blocks.push(formatPreviousDaySection(options.previousDay!, todayCount), '---')
  }
  blocks.push(post.title, todayBody)
  return joinBlocks(blocks)
}

export function buildDouyinPost(questions: Question[], options?: BuildPostOptions): XhsPostContent {
  return buildPostBase(questions, options, 'douyin')
}

export function formatDouyinCopyText(post: XhsPostContent, options?: BuildPostOptions): string {
  return formatCopyText(post, options)
}
