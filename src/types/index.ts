import type { TuxingData } from './tuxing'

export interface ExamPoint {
  id: string
  moduleId: string
  name: string
  description: string
}

export interface ExamModule {
  id: string
  name: string
  category: '行测' | '申论' | '词汇'
  description: string
  topics?: ExamPoint[]
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
  expertTag?: string
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
  count?: number
}

export interface VocabWebLink {
  name: string
  url: string
}

export type VocabWebSource = 'youdao' | 'iciba' | 'local'

export interface VocabWebSnippet {
  word: string
  meaning: string
  pinyin?: string
  source: VocabWebSource
  sourceUrl: string
}

export interface VocabWebLookupResult {
  keyword: string
  local: VocabItem[]
  web?: VocabWebSnippet
  links: VocabWebLink[]
}

export type AiProviderId = 'deepseek' | 'openai' | 'qwen'

export interface AiModelOption {
  id: string
  label: string
  provider: AiProviderId
  note?: string
}

export interface AiProviderOption {
  id: AiProviderId
  name: string
  configured: boolean
  baseUrl: string
  defaultModel: string
  docUrl: string
  models: AiModelOption[]
}

export interface ExamExpert {
  id: string
  name: string
  modules: string[]
  specialty: string
  analysisPrefix: string
  recommended?: boolean
}

export interface GenerateRequest {
  moduleId: string
  topicId?: string
  count?: number
  difficulty?: 'easy' | 'medium' | 'hard'
  aiProvider?: AiProviderId
  aiModel?: string
  expertId?: string
}

export interface XhsPostContent {
  title: string
  body: string
  tags: string[]
  coverHint: string
}

export interface PublishPayload {
  post: XhsPostContent
  questions: Question[]
}

export type AppMode = 'exam' | 'vocab'
