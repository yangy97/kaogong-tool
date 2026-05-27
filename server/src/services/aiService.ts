import type { ExamModule, ExamPoint, Question } from '../types/index.js'
import { getAiConfig } from '../config/aiConfig.js'
import { buildAiPrompt } from './templateService.js'
import { getExpertById, buildExpertSystemPrompt } from '../data/expertStyles.js'
import { devGroup, devLog, preview } from '../utils/devLog.js'

export { getAiConfig, SUPPORTED_AI_MODELS } from '../config/aiConfig.js'
export type { AiModelOption, AiRuntimeConfig, GenerationMode } from '../config/aiConfig.js'

interface AiQuestionRaw {
  type: 'single' | 'multiple' | 'essay'
  stem: string
  options?: Array<{ key: string; text: string }>
  answer: string
  analysis: string
  difficulty: 'easy' | 'medium' | 'hard'
}

function parseAiResponse(text: string, expertPrefix?: string): AiQuestionRaw[] {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(cleaned)
  if (!Array.isArray(parsed)) throw new Error('AI 返回格式不是数组')
  return parsed.map((q) => ({
    ...q,
    analysis: normalizeAnalysis(q.analysis ?? '', expertPrefix),
    stem: normalizeStem(q.stem ?? ''),
  }))
}

/** 仅规范化空白；解析内容由 AI prompt 直接约束，不在后端裁剪改写 */
function normalizeAnalysis(text: string, expertPrefix?: string): string {
  const s = text.replace(/\s+/g, ' ').trim()
  if (!s) return expertPrefix ? `${expertPrefix} 详见答案。` : '详见答案。'
  if (expertPrefix && !/^【[^】]+】/.test(s)) {
    return `${expertPrefix} ${s}`
  }
  return s
}

function normalizeStem(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
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
  const started = Date.now()
  devGroup(`AI 出题 · ${module.name} · ${providerId}`, () => {
    devLog('AI', 'provider:', providerId)
    devLog('AI', 'model:', model)
    devLog('AI', 'baseUrl:', baseUrl)
    devLog('AI', 'count:', count, 'difficulty:', difficulty)
    devLog('AI', 'topic:', topic?.name ?? '（未指定考点）')
    devLog('AI', 'expert:', expert?.name ?? '（通用）')
  })

  const body: Record<string, unknown> = {
    model,
    temperature: 0.5,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      {
        role: 'system',
        content: expert
          ? buildExpertSystemPrompt(expert)
          : '你是公考命题专家。analysis 直接输出最终精简版：1-2 句，公式/结论+选X，≤80 字。禁止思考过程、试算、多种方法对比。后端不会改写你的 analysis。',
      },
      { role: 'user', content: buildAiPrompt(module, count, difficulty, topic, expert) },
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
    if (usage) devLog('AI', 'tokens:', usage)
    devLog('AI', 'rawPreview:', preview(content, 200))
  })

  const raw = parseAiResponse(content, expert?.analysisPrefix)
  const questions = raw.slice(0, count).map((q, i) => ({
    id: `${module.id}-ai-${Date.now()}-${i}`,
    moduleId: module.id,
    moduleName: module.name,
    topicId: topic?.id,
    topicName: topic?.name,
    expertTag: expert?.name,
    tags: expert ? [expert.name, module.name] : undefined,
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

export { getAllProviders, isAnyAiConfigured, getDefaultProviderId } from '../config/aiConfig.js'
