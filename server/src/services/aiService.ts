import type { ExamModule, ExamPoint, Question } from '../types/index'
import type { TuxingData } from '../types/tuxing'
import { getAiConfig } from '../config/aiConfig'
import { buildAiPrompt } from './aiPromptService'
import { getExpertById } from '../data/expertStyles'
import { buildModuleSystemPrompt } from '../data/modulePromptHints'
import { buildStrictDifficultyBlock, getAiTemperature, type Difficulty } from '../utils/difficultyConfig'
import { normalizeStemTables } from '../utils/stemFormat'
import { compactAnalysis } from '../utils/analysisNormalize'
import { normalizeTuxingFromAi } from '../utils/tuxingNormalize'
import { isTuxingTopicId } from '../types/tuxing'
import { devGroup, devLog, preview } from '../utils/devLog'

export { getAiConfig, SUPPORTED_AI_MODELS } from '../config/aiConfig'
export type { AiModelOption, AiRuntimeConfig } from '../config/aiConfig'

interface AiQuestionRaw {
  type: 'single' | 'multiple' | 'essay'
  stem: string
  options?: Array<{ key: string; text: string }>
  answer: string
  analysis: string
  difficulty: 'easy' | 'medium' | 'hard'
  tuxing?: TuxingData
}

function parseAiResponse(text: string, expertPrefix?: string, isTuxing = false): AiQuestionRaw[] {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('AI 返回格式不是数组')
  return parsed.map((q, i) => {
    const tuxing = isTuxing ? normalizeTuxingFromAi(q.tuxing) : undefined
    if (isTuxing && !tuxing) {
      throw new Error(`第 ${i + 1} 题缺少有效的 tuxing 图形数据，请重试`)
    }
    const options =
      isTuxing && tuxing
        ? ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '' }))
        : q.options
    return {
      ...q,
      options,
      tuxing,
      analysis: normalizeAnalysis(q.analysis ?? '', {
        expertPrefix,
        answer: q.answer,
        isEssay: q.type === 'essay',
      }),
      stem: normalizeStem(isTuxing ? '下列选项中，符合所给图形变化规律的是：' : (q.stem ?? '')),
    }
  })
}

/** 规范化并强制压缩啰嗦解析 */
function normalizeAnalysis(
  text: string,
  options?: { expertPrefix?: string; answer?: string; isEssay?: boolean },
): string {
  return compactAnalysis(text, options)
}

function normalizeStem(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.replace(/[^\S\n]+/g, ' ').trim())
  return normalizeStemTables(lines.filter(Boolean).join('\n'))
}

function isDeepSeekApi(baseUrl: string): boolean {
  return baseUrl.includes('deepseek.com')
}

/** 流式读取 DeepSeek 响应；abort 时主动 cancel reader，便于服务端尽早停止生成 */
async function readStreamingCompletion(
  response: Response,
  signal?: AbortSignal,
): Promise<{ content: string; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }> {
  if (!response.body) throw new Error('AI 响应体为空')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let content = ''
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined
  let buffer = ''

  const cancelReader = () => {
    reader.cancel().catch(() => {})
  }
  signal?.addEventListener('abort', cancelReader, { once: true })

  try {
    while (true) {
      if (signal?.aborted) {
        cancelReader()
        const err = new Error('已取消')
        err.name = 'AbortError'
        throw err
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string; reasoning_content?: string } }>
            usage?: typeof usage
          }
          const delta = parsed.choices?.[0]?.delta
          // 只取最终 content，忽略 reasoning_content（思考链）
          content += delta?.content ?? ''
          if (parsed.usage) usage = parsed.usage
        } catch {
          /* 跳过不完整 SSE 行 */
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', cancelReader)
  }

  return { content, usage }
}

/** 调用 OpenAI 兼容 API 生成题目（支持 DeepSeek / OpenAI 等） */
export async function generateViaAi(
  module: ExamModule,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  topic?: ExamPoint,
  aiOptions?: {
    providerId?: string
    modelOverride?: string
    expertId?: string
    signal?: AbortSignal
  },
): Promise<{ questions: Question[]; model: string; providerId: string; expertTag?: string }> {
  const { apiKey, baseUrl, model, providerId } = getAiConfig({
    providerId: aiOptions?.providerId,
    modelOverride: aiOptions?.modelOverride,
  })
  if (!apiKey) throw new Error('未配置对应 AI 提供商的 API Key')

  const expert = getExpertById(aiOptions?.expertId)
  const signal = aiOptions?.signal
  const systemPrompt = buildModuleSystemPrompt(module, expert)
  const userPrompt = buildAiPrompt(module, count, difficulty, topic, expert)
  const temperature = getAiTemperature(module.id, difficulty as Difficulty)
  const maxTokens = Math.min(4096, count * 450 + 256)
  const started = Date.now()
  devGroup(`AI 出题 · ${module.name} · ${providerId}`, () => {
    devLog('AI', 'provider:', providerId)
    devLog('AI', 'model:', model)
    devLog('AI', 'baseUrl:', baseUrl)
    devLog('AI', 'count:', count, 'difficulty:', difficulty)
    devLog('AI', 'topic:', topic?.name ?? '（未指定考点）')
    devLog('AI', 'expert:', expert?.name ?? '（通用）')
    devLog('AI', 'promptChars:', { system: systemPrompt.length, user: userPrompt.length })
  })

  const body: Record<string, unknown> = {
    model,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      {
        role: 'system',
        content: systemPrompt,
      },
      { role: 'user', content: userPrompt },
    ],
  }

  // DeepSeek V4 默认开启思考模式，需显式关闭，避免思考链混入解析
  if (isDeepSeekApi(baseUrl)) {
    body.thinking = { type: 'disabled' }
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`AI API 错误: ${response.status}${errText ? ` — ${errText.slice(0, 200)}` : ''}`)
  }

  let content: string
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined

  try {
    const streamed = await readStreamingCompletion(response, signal)
    content = streamed.content
    usage = streamed.usage
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      devLog('AI', '流式请求已取消（连接断开，DeepSeek 可尽早停止生成）')
    }
    throw e
  }

  if (!content) throw new Error('AI 返回内容为空')

  devGroup(`AI 响应 · ${Date.now() - started}ms`, () => {
    if (usage) {
      devLog('AI', 'tokens:', usage)
      const ratio = usage.prompt_tokens && usage.completion_tokens
        ? (usage.prompt_tokens / usage.completion_tokens).toFixed(1)
        : '-'
      devLog('AI', 'input/output ratio:', ratio)
    }
    devLog('AI', 'rawPreview:', preview(content, 200))
  })

  const raw = parseAiResponse(content, expert?.analysisPrefix, isTuxingTopicId(topic?.id))
  const questions = raw.slice(0, count).map((q, i) => ({
    id: `${module.id}-ai-${Date.now()}-${i}`,
    moduleId: module.id,
    moduleName: module.name,
    topicId: topic?.id,
    topicName: topic?.name,
    expertTag: expert?.name,
    expertStyleLabel: expert?.publishLabel,
    tags: expert ? [expert.publishLabel, module.name] : undefined,
    ...q,
  }))

  devLog('AI', 'parsedQuestions:', questions.map((q, i) => ({
    index: i + 1,
    stem: preview(q.stem, 60),
    answer: q.answer,
    difficulty: q.difficulty,
  })))

  return { questions, model, providerId, expertTag: expert?.name }
}

export function isAiConfigured(): boolean {
  return getAiConfig().configured
}

export { getAllProviders, isAnyAiConfigured, getDefaultProviderId } from '../config/aiConfig'
