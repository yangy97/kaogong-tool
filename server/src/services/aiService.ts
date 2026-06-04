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
import { isGridTuxing, syncTuxingAnalysis } from '../utils/tuxingAnalysisSync'
import {
  buildAnswerDiversityRetryHint,
  hasDuplicateChoiceAnswers,
  summarizeAnswerKeys,
} from '../utils/answerDiversify'
import { isTuxingTopicId } from '../types/tuxing'
import { devGroup, devLog, preview } from '../utils/devLog'
import { parseAiJsonArray } from '../utils/parseAiJson'

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
  const parsed = parseAiJsonArray(text, 1) as AiQuestionRaw[]
  return parsed.map((q, i) => {
    const tuxing = isTuxing ? normalizeTuxingFromAi(q.tuxing) : undefined
    if (isTuxing && !tuxing) {
      throw new Error(`第 ${i + 1} 题缺少有效的 tuxing 图形数据，请重试`)
    }
    const options =
      isTuxing && tuxing
        ? ['A', 'B', 'C', 'D'].map((key) => ({ key, text: '' }))
        : q.options
    let analysis = normalizeAnalysis(q.analysis ?? '', {
      expertPrefix,
      answer: q.answer,
      isEssay: q.type === 'essay',
    })
    if (tuxing && isGridTuxing(tuxing)) {
      analysis = syncTuxingAnalysis(tuxing, q.answer ?? 'A', expertPrefix)
    }
    return {
      ...q,
      options,
      tuxing,
      analysis,
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

  const consumeSseLine = (line: string) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return
    const payload = trimmed.slice(5).trim()
    if (!payload || payload === '[DONE]') return

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

  try {
    while (true) {
      if (signal?.aborted) {
        cancelReader()
        const err = new Error('已取消')
        err.name = 'AbortError'
        throw err
      }

      const { done, value } = await reader.read()
      if (value) buffer += decoder.decode(value, { stream: !done })
      if (done) break

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) consumeSseLine(line)
    }

    // 处理流结束时 buffer 中残留的最后一行（此前会直接丢弃，导致 JSON 截断）
    if (buffer.trim()) consumeSseLine(buffer)
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
  const isTuxing = isTuxingTopicId(topic?.id)
  const perQuestion = isTuxing ? 1100 : module.id === 'shenlun' ? 750 : 550
  const maxTokens = Math.min(8192, count * perQuestion + 384)
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

  const requestCompletion = async (userContent: string) => {
    const body: Record<string, unknown> = {
      model,
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }
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
    try {
      return await readStreamingCompletion(response, signal)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        devLog('AI', '流式请求已取消（连接断开，DeepSeek 可尽早停止生成）')
      }
      throw e
    }
  }

  let userContent = userPrompt
  let content = ''
  let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | undefined
  let rawParsed: ReturnType<typeof parseAiResponse> = []

  for (let attempt = 0; attempt < 2; attempt++) {
    const streamed = await requestCompletion(userContent)
    content = streamed.content
    usage = streamed.usage
    if (!content) throw new Error('AI 返回内容为空')

    devGroup(`AI 响应 · ${Date.now() - started}ms · 第${attempt + 1}次`, () => {
      if (usage) devLog('AI', 'tokens:', usage)
      devLog('AI', 'rawPreview:', preview(content, 200))
    })

    rawParsed = parseAiResponse(content, expert?.analysisPrefix, isTuxingTopicId(topic?.id))

    if (attempt === 0 && count > 1 && hasDuplicateChoiceAnswers(rawParsed)) {
      const keys = summarizeAnswerKeys(rawParsed)
      devLog('AI', '答案字母过于集中，重试一次:', keys)
      userContent = `${userPrompt}\n\n${buildAnswerDiversityRetryHint(count, keys)}`
      continue
    }
    break
  }

  const raw = rawParsed.map((q) => {
    if (q.tuxing && isGridTuxing(q.tuxing)) {
      return {
        ...q,
        analysis: syncTuxingAnalysis(q.tuxing, q.answer ?? 'A', expert?.analysisPrefix),
      }
    }
    return q
  })
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
  devLog('AI', 'answerKeys:', questions.map((q) => q.answer).join(', '))

  return { questions, model, providerId, expertTag: expert?.name }
}

export function isAiConfigured(): boolean {
  return getAiConfig().configured
}

export { getAllProviders, isAnyAiConfigured, getDefaultProviderId } from '../config/aiConfig'
