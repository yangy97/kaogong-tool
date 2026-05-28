import type { ExamModule, ExamPoint } from '../types/index.js'
import { generateViaAi, getAiConfig } from './aiService.js'
import type { AiProviderId } from '../config/aiConfig.js'
import { throwIfAborted } from '../utils/abort.js'

type GenSource = 'ai'
type GenMode = string

export interface GenerateResult {
  questions: import('../types/index.js').Question[]
  source: GenSource
  mode: GenMode
}

/** 统一出题入口：仅 AI 生成 */
export async function generateQuestions(
  module: ExamModule,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  topic?: ExamPoint,
  options?: {
    aiProvider?: AiProviderId | string
    aiModel?: string
    expertId?: string
    signal?: AbortSignal
  },
): Promise<GenerateResult & { aiModel?: string; aiProvider?: string; expertTag?: string }> {
  const aiConfig = getAiConfig({
    providerId: options?.aiProvider,
    modelOverride: options?.aiModel,
  })

  if (!aiConfig.configured) {
    throw new Error('未配置 AI API Key，请在 server/.env 中填写 DEEPSEEK_API_KEY 等')
  }

  throwIfAborted(options?.signal)

  const { questions, model, providerId, expertTag } = await generateViaAi(
    module,
    count,
    difficulty,
    topic,
    {
      providerId: options?.aiProvider,
      modelOverride: options?.aiModel,
      expertId: options?.expertId,
      signal: options?.signal,
    },
  )

  return {
    questions,
    source: 'ai',
    mode: 'ai',
    aiModel: model,
    aiProvider: providerId,
    expertTag,
  }
}
