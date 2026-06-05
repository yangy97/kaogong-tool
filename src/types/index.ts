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
  /** 配图发布用思路名（无人名），如「速算思路」 */
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
  count?: number
}

export interface VocabWebLink {
  name: string
  url: string
}

export type VocabWebSource = 'youdao' | 'iciba' | 'local'

export interface VocabRelatedWord {
  word: string
  meaning?: string
}

export type VocabSentimentTone =
  | '褒义'
  | '偏褒义'
  | '贬义'
  | '偏贬义'
  | '中性'
  | '可褒可贬'

export interface VocabSentiment {
  tone: VocabSentimentTone
  note: string
  source: 'library' | 'meaning' | 'inferred'
}

export interface VocabWebSnippet {
  word: string
  meaning: string
  pinyin?: string
  source: VocabWebSource
  sourceUrl: string
  synonyms?: VocabRelatedWord[]
  antonyms?: VocabRelatedWord[]
  sentiment?: VocabSentiment
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
  /** 配图发布用思路名（无人名） */
  publishLabel?: string
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
  todayBody?: string
  todayQuestionCount?: number
  tags: string[]
  coverHint: string
}

export interface PublishPayload {
  post: XhsPostContent
  questions: Question[]
}

export type AppMode = 'exam' | 'vocab' | 'history'

export interface QuestionSetRecord {
  id: number
  postDate: string
  moduleId: string
  moduleName: string
  topicId?: string
  topicName?: string
  questionCount: number
  questions: Question[]
  source: 'ai' | 'vocab'
  savedAt: string
}

export interface QuestionSetSummary {
  id: number
  postDate: string
  moduleId: string
  moduleName: string
  topicId?: string
  topicName?: string
  questionCount: number
  source: 'ai' | 'vocab'
  savedAt: string
  previewStem: string
  hasTuxing: boolean
  hasTable: boolean
}

export interface PrepareResult {
  post: XhsPostContent
  copyText: string
  creatorUrl: string
  douyinPost: XhsPostContent
  douyinCopyText: string
  douyinCreatorUrl: string
  imageCount: number
  questions: Question[]
  previousDayQuestions: Question[]
  previousDayDate: string | null
  savedDate: string
  includeTodayAnswers?: boolean
  questionSetId?: number | null
}
