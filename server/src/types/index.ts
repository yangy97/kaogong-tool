import type { TuxingData } from './tuxing'

export interface ExamModule {
  id: string
  name: string
  category: '行测' | '申论' | '词汇'
  description: string
}

export interface ExamPoint {
  id: string
  moduleId: string
  name: string
  description: string
}

export interface QuestionOption {
  key: string
  text: string
}

export interface Question {
  id: string
  moduleId: string
  moduleName: string
  topicId?: string
  topicName?: string
  type: 'single' | 'multiple' | 'essay' | 'vocab'
  stem: string
  options?: QuestionOption[]
  answer: string
  analysis: string
  difficulty: 'easy' | 'medium' | 'hard'
  /** AI 解析风格对应的名师标签 */
  expertTag?: string
  /** 配图发布用思路名（无人名） */
  expertStyleLabel?: string
  tags?: string[]
  /** 图形推理可视化数据 */
  tuxing?: TuxingData
}

export interface VocabItem {
  id: string
  word: string
  type: '成语' | '实词' | '关联词' | '俗语' | '热词'
  category: string
  pinyin?: string
  meaning: string
  usage?: string
  example?: string
  confusable?: string[]
  frequency: 'core' | 'high' | 'medium'
}

export interface VocabCategory {
  id: string
  name: string
  description: string
}

export interface XhsPostContent {
  title: string
  body: string
  /** 仅今日题目段落，用于组装复制文案 */
  todayBody?: string
  tags: string[]
  coverHint: string
}
