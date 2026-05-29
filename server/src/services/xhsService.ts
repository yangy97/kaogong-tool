import type { Question, XhsPostContent } from '../types/index'
import { DEFAULT_TAGS, DOUYIN_TAGS } from '../constants'

const DIFFICULTY_EMOJI: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
}

function formatQuestionBlock(q: Question, index: number): string {
  const diff = DIFFICULTY_EMOJI[q.difficulty] ?? ''
  let block = `\n${index + 1}. ${q.stem}\n`

  if (q.options?.length) {
    block += q.options.map((o) => `   ${o.key}. ${o.text}`).join('\n') + '\n'
    block += `\n💡 答案：${q.answer}\n`
  } else {
    block += `\n📝 参考要点：${q.answer.slice(0, 80)}${q.answer.length > 80 ? '…' : ''}\n`
  }

  block += `${diff} 难度：${q.difficulty === 'easy' ? '简单' : q.difficulty === 'hard' ? '困难' : '中等'}\n`
  return block
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

export function buildXhsPost(questions: Question[]): XhsPostContent {
  const moduleName = questions[0]?.moduleName ?? '考公'
  const count = questions.length
  const topicLabel = questions[0]?.topicName ? `${questions[0].topicName}·` : ''
  const title = `${topicLabel}${moduleName}刷题｜${count}道精选练习`

  const intro = `📚 今日${moduleName}专项练习来啦！\n坚持刷题，离上岸更近一步 💪\n`
  const bodyParts = questions.map((q, i) => formatQuestionBlock(q, i))
  const outro =
    '\n---\n✅ 答案解析见图片卡片\n💬 欢迎在评论区交流做题思路\n🔖 收藏起来慢慢做！\n'

  const body = intro + bodyParts.join('\n') + outro

  const expertTags = collectExpertTags(questions)
  const tags = [
    ...DEFAULT_TAGS,
    moduleName.replace(/与/g, ''),
    ...expertTags,
    '每日刷题',
    '公考备考',
  ].slice(0, 10)

  return {
    title,
    body,
    tags,
    coverHint: `封面建议：${moduleName} + 今日${count}题 + 考公打卡风格`,
  }
}

export function formatCopyText(post: XhsPostContent): string {
  const tagLine = post.tags.map((t) => `#${t}`).join(' ')
  return `${post.title}\n\n${post.body}\n\n${tagLine}`
}

export function buildDouyinPost(questions: Question[]): XhsPostContent {
  const moduleName = questions[0]?.moduleName ?? '考公'
  const count = questions.length
  const topicLabel = questions[0]?.topicName ? `${questions[0].topicName}·` : ''

  const title = `${topicLabel}${moduleName}刷题${count}题｜🐑🍊考公每日打卡`

  const intro = `🔥 今日${moduleName}专项刷题！\n刷完记得评论区对答案～\n`
  const bodyParts = questions.map((q, i) => formatQuestionBlock(q, i))
  const outro = '\n---\n✅ 答案解析在图里\n👇 评论区说说你做对了几个\n'

  const body = intro + bodyParts.join('\n') + outro

  const expertTags = collectExpertTags(questions)
  const tags = [
    ...DOUYIN_TAGS,
    moduleName.replace(/与/g, ''),
    ...expertTags,
    '每日刷题',
  ].slice(0, 8)

  return {
    title,
    body,
    tags,
    coverHint: `抖音封面：${moduleName}刷题，深色高对比风格`,
  }
}

export function formatDouyinCopyText(post: XhsPostContent): string {
  const tagLine = post.tags.map((t) => `#${t}`).join(' ')
  return `${post.title}\n\n${post.body}\n\n${tagLine}`
}
