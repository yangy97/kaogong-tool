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
  tags: string[]
  coverHint: string
}
