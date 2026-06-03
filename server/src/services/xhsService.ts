import type { Question, XhsPostContent } from '../types/index'
import { DEFAULT_TAGS, DOUYIN_TAGS } from '../constants'

const DIFFICULTY_EMOJI: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

export interface PreviousDayPost {
  date: string
  questions: Question[]
}

export interface BuildPostOptions {
  previousDay?: PreviousDayPost
  /** 历史题目完整发布：文案含答案与解析（默认 false，与每日刷题一致） */
  includeAnswers?: boolean
  /** 打卡天数序号，用于标题 DAY{n} */
  dayNumber?: number
}

/** 发布标题：考公每日一练之{考点/模块}刷题DAY{n} */
export function buildDailyTitle(questions: Question[], dayNumber: number): string {
  const subject = questions[0]?.topicName || questions[0]?.moduleName || '考公'
  return `考公每日一练之${subject}刷题DAY${dayNumber}`
}

function formatQuestionBlock(q: Question, index: number): string {
  const diff = DIFFICULTY_EMOJI[q.difficulty] ?? ''
  let block = `\n${index + 1}. ${q.stem}\n`

  if (q.options?.length) {
    block += q.options.map((o) => `   ${o.key}. ${o.text}`).join('\n') + '\n'
  } else {
    block += `\n📝 （主观题，请自行作答）\n`
  }

  block += `${diff} 难度：${q.difficulty === 'easy' ? '简单' : q.difficulty === 'hard' ? '困难' : '中等'}\n`
  return block
}

function formatQuestionWithAnswerBlock(q: Question, index: number): string {
  let block = formatQuestionBlock(q, index)
  if (q.options?.length) {
    block += `\n💡 答案：${q.answer}\n📖 解析：${q.analysis}\n`
  } else {
    block += `\n📝 参考要点：${q.answer}\n📖 思路：${q.analysis}\n`
  }
  return block
}

function formatAnswerBlock(q: Question, index: number): string {
  let block = `\n${index + 1}. `
  if (q.options?.length) {
    block += `✅ 答案：${q.answer}\n📖 解析：${q.analysis}\n`
  } else {
    block += `📝 参考要点：${q.answer}\n📖 思路：${q.analysis}\n`
  }
  return block
}

export function formatPreviousDaySection(previousDay: PreviousDayPost): string {
  const count = previousDay.questions.length
  const moduleName = previousDay.questions[0]?.moduleName ?? '考公'
  const header = `🎯 昨日（${previousDay.date}）${moduleName} ${count}题 · 答案揭晓`
  const body = previousDay.questions.map((q, i) => formatAnswerBlock(q, i)).join('')
  return header + body
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
      ? `📚 今日${moduleName}专项练习来啦！\n坚持刷题，离上岸更近一步 💪\n`
      : `🔥 今日${moduleName}专项刷题！\n先做题，答案明天见～\n`

  const includeAnswers = options?.includeAnswers === true
  const bodyParts = questions.map((q, i) =>
    includeAnswers ? formatQuestionWithAnswerBlock(q, i) : formatQuestionBlock(q, i),
  )

  const outro = includeAnswers
    ? platform === 'xhs'
      ? '\n---\n✅ 答案解析见上方\n💬 欢迎在评论区交流做题思路\n🔖 收藏起来慢慢做！\n'
      : '\n---\n✅ 答案解析见上方\n👇 评论区说说你做对了几个\n'
    : platform === 'xhs'
      ? '\n---\n⏳ 今日答案明日揭晓，先做题吧！\n💬 欢迎在评论区交流做题思路\n🔖 收藏起来慢慢做！\n'
      : '\n---\n⏳ 今日答案明天公布\n👇 评论区说说你做对了几个\n'

  const todayBody = intro + bodyParts.join('\n') + outro

  const previousSection =
    !includeAnswers && options?.previousDay?.questions.length
      ? `${formatPreviousDaySection(options.previousDay)}\n\n---\n\n`
      : ''

  const body = previousSection + todayBody

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
      ? `发布标题：${title}（文案首行已含，粘贴至小红书标题栏）`
      : `发布标题：${title}（文案首行已含，粘贴至抖音标题/作品描述顶部）`

  return { title, body, todayBody, tags, coverHint }
}

export function buildXhsPost(questions: Question[], options?: BuildPostOptions): XhsPostContent {
  return buildPostBase(questions, options, 'xhs')
}

export function formatCopyText(post: XhsPostContent, options?: BuildPostOptions): string {
  const tagLine = post.tags.map((t) => `#${t}`).join(' ')
  const includeAnswers = options?.includeAnswers === true
  const todayBody = post.todayBody ?? post.body
  const previousHead =
    !includeAnswers && options?.previousDay?.questions.length
      ? `${formatPreviousDaySection(options.previousDay!)}\n\n---\n\n`
      : ''
  return `${previousHead}${post.title}\n\n${todayBody}\n\n${tagLine}`
}

export function buildDouyinPost(questions: Question[], options?: BuildPostOptions): XhsPostContent {
  return buildPostBase(questions, options, 'douyin')
}

export function formatDouyinCopyText(post: XhsPostContent, options?: BuildPostOptions): string {
  return formatCopyText(post, options)
}
