import { isTuxingTopicId } from '../types/tuxing.js'

/** 图形推理 AI 输出规范（精简，降低 input token） */
export function buildTuxingAiPromptBlock(): string {
  return `图形题：options.text 留空；tuxing.sequence 为 3 图形+null；tuxing.options 为 4 选项。kind=grid(rows,cols,filled[[r,c]]) 或 shapes(items[{shape,x,y,size,fill}],rotate,cx,cy)。禁止文字描述图形。`
}

export function buildTuxingPromptIfNeeded(topicId?: string): string {
  return isTuxingTopicId(topicId) ? buildTuxingAiPromptBlock() : ''
}
