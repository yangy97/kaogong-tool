import { isTuxingTopicId } from '../types/tuxing'

/** 图形推理 AI 输出规范 */
export function buildTuxingAiPromptBlock(topicId?: string): string {
  const lines = [
    '图形题：options.text 留空；tuxing.sequence 为 3 个图形+null；tuxing.options 为 A-D 四个图形。',
    'kind=grid：filled 为涂黑格坐标 [行,列]（0 起算），analysis 中的数量必须等于各图 filled.length，严禁数字与 JSON 不一致。',
    'kind=shapes：items 为 circle/rect/triangle，analysis 描述位置/旋转/数量变化。',
    '禁止用文字描述代替 tuxing JSON。',
  ]

  if (topicId?.includes('pinjie') || topicId?.includes('shuliang')) {
    lines.push(
      '数量/拼接类：使用 kind=grid，涂黑格表示可见立方体个数，序列 filled.length 应呈清晰递增（如 5、6、7、8），再据此写 analysis。',
    )
  }
  if (topicId?.includes('heibai')) {
    lines.push('黑白块：使用 kind=grid，filled 表示黑块位置，规律体现在黑块平移或对称。')
  }

  return lines.join('')
}

export function buildTuxingPromptIfNeeded(topicId?: string): string {
  return isTuxingTopicId(topicId) ? buildTuxingAiPromptBlock(topicId) : ''
}
