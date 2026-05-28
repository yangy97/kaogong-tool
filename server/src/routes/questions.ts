import { Router } from 'express'
import {
  EXAM_MODULES,
  EXAM_POINT_MAP,
  MODULE_MAP,
  getPointsByModule,
} from '../constants.js'
import { generateQuestions } from '../services/questionService.js'
import { getExpertsForModule } from '../data/expertStyles.js'
import { getAiConfig, getAllProviders, isAnyAiConfigured, getDefaultProviderId } from '../config/aiConfig.js'
import { devGroup, devLog, isDevMode, preview } from '../utils/devLog.js'
import { isAbortError } from '../utils/abort.js'
import type { Question } from '../types/index.js'

const router = Router()

router.get('/ai-config', (_req, res) => {
  const providers = getAllProviders()
  const defaultProviderId = getDefaultProviderId()
  const defaultProvider = providers.find((p) => p.id === defaultProviderId)!
  res.json({
    anyConfigured: isAnyAiConfigured(),
    defaultProviderId,
    configured: isAnyAiConfigured(),
    defaultModel: defaultProvider.defaultModel,
    baseUrl: defaultProvider.baseUrl,
    providers,
  })
})

router.get('/modules', (_req, res) => {
  const modules = EXAM_MODULES.map((m) => ({
    ...m,
    topics: m.id === 'words700' ? [] : getPointsByModule(m.id),
  }))
  res.json({ modules })
})

router.get('/topics/:moduleId', (req, res) => {
  const { moduleId } = req.params
  if (!MODULE_MAP[moduleId]) {
    res.status(404).json({ error: '模块不存在' })
    return
  }
  res.json({ topics: getPointsByModule(moduleId) })
})

router.get('/experts/:moduleId', (req, res) => {
  const { moduleId } = req.params
  if (!MODULE_MAP[moduleId]) {
    res.status(404).json({ error: '模块不存在' })
    return
  }
  res.json({ experts: getExpertsForModule(moduleId) })
})

router.post('/generate', async (req, res) => {
  const started = Date.now()
  const abortController = new AbortController()

  const onAborted = () => {
    if (!res.writableEnded) {
      devLog('generate', '客户端主动取消，中止 AI 请求')
      abortController.abort()
    }
  }
  req.on('aborted', onAborted)

  try {
    const { moduleId, topicId, count = 3, difficulty = 'medium', aiModel, aiProvider, expertId } = req.body ?? {}

    devGroup('POST /questions/generate', () => {
      devLog('generate', '请求参数:', { moduleId, topicId, count, difficulty, aiProvider, aiModel, expertId })
    })

    if (!moduleId || !MODULE_MAP[moduleId]) {
      res.status(400).json({ error: '无效的模块 ID' })
      return
    }

    if (moduleId === 'words700') {
      res.status(400).json({ error: '700高频词请使用 /api/vocab/generate 接口' })
      return
    }

    const topic = topicId ? EXAM_POINT_MAP[topicId] : undefined
    if (topicId && !topic) {
      res.status(400).json({ error: '无效的考点 ID' })
      return
    }
    if (topic && topic.moduleId !== moduleId) {
      res.status(400).json({ error: '考点与模块不匹配' })
      return
    }

    const safeCount = Math.min(Math.max(Number(count) || 3, 1), 10)
    const module = MODULE_MAP[moduleId]
    const aiConfig = getAiConfig({
      providerId: typeof aiProvider === 'string' ? aiProvider : undefined,
      modelOverride: typeof aiModel === 'string' ? aiModel : undefined,
    })

    if (!aiConfig.configured) {
      res.status(400).json({ error: '未配置 AI API Key，请在 server/.env 中填写 DEEPSEEK_API_KEY 等' })
      return
    }

    const result = await generateQuestions(
      module,
      safeCount,
      difficulty as 'easy' | 'medium' | 'hard',
      topic,
      {
        aiProvider: typeof aiProvider === 'string' ? aiProvider : aiConfig.providerId,
        aiModel: typeof aiModel === 'string' ? aiModel : undefined,
        expertId: typeof expertId === 'string' ? expertId : undefined,
        signal: abortController.signal,
      },
    )

    const durationMs = Date.now() - started
    const meta = {
      durationMs,
      generationMode: 'ai',
      source: result.source,
      mode: result.mode,
      aiModel: result.aiModel,
      questionCount: result.questions.length,
      previews: result.questions.map((q: Question, i: number) => ({
        index: i + 1,
        id: q.id,
        type: q.type,
        stem: preview(q.stem, 70),
        answer: q.answer,
        difficulty: q.difficulty,
        hasTuxing: !!q.tuxing,
      })),
    }

    devGroup(`generate 完成 · ${durationMs}ms`, () => {
      devLog('generate', '结果:', meta)
    })

    res.json({
      module,
      topic,
      generationMode: 'ai',
      ...result,
      ...(isDevMode() ? { _meta: meta } : {}),
    })
  } catch (err) {
    if (isAbortError(err)) {
      devLog('generate', '已取消')
      if (!res.writableEnded) res.status(499).json({ error: '已取消' })
      return
    }
    console.error('[generate] 失败:', err)
    const message = err instanceof Error ? err.message : '题目生成失败'
    if (!res.writableEnded) res.status(500).json({ error: message })
  } finally {
    req.off('aborted', onAborted)
  }
})

export default router
