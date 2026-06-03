import { Router } from 'express'
import type { Question } from '../types/index'
import { XHS_CREATOR_URL, DOUYIN_CREATOR_URL } from '../constants'
import { isMysqlReady } from '../db/mysql'
import {
  buildDouyinPost,
  buildXhsPost,
  formatCopyText,
  formatDouyinCopyText,
  type BuildPostOptions,
} from '../services/xhsService'
import {
  getDayNumberForDate,
  getPostByDate,
  getQuestionSetById,
  getTodayDateStr,
  getYesterdayDateStr,
  listQuestionSets,
  saveQuestionSet,
  upsertDailyPost,
} from '../services/postArchiveService'
import { devGroup, devLog, isDevMode, preview } from '../utils/devLog'

const router = Router()

function countImages(todayCount: number, previousCount: number, includeTodayAnswers = false): number {
  const todayAnswers = includeTodayAnswers ? todayCount : 0
  return 1 + todayCount + todayAnswers + previousCount
}

async function buildPreparePayload(
  questions: Question[],
  options: {
    previousDay?: { date: string; questions: Question[] }
    includeAnswers?: boolean
    savedDate?: string
    questionSetId?: number
  },
) {
  const postDate = options.savedDate ?? getTodayDateStr()
  const dayNumber = await getDayNumberForDate(postDate)
  const postOpts: BuildPostOptions = {
    previousDay: options.previousDay,
    includeAnswers: options.includeAnswers ?? false,
    dayNumber,
  }
  const post = buildXhsPost(questions, postOpts)
  const copyText = formatCopyText(post, postOpts)
  const douyinPost = buildDouyinPost(questions, postOpts)
  const douyinCopyText = formatDouyinCopyText(douyinPost, postOpts)
  const includeAnswers = postOpts.includeAnswers === true
  const previousCount = includeAnswers ? 0 : (options.previousDay?.questions.length ?? 0)
  const imageCount = countImages(questions.length, previousCount, includeAnswers)

  return {
    post,
    copyText,
    creatorUrl: XHS_CREATOR_URL,
    douyinPost,
    douyinCopyText,
    douyinCreatorUrl: DOUYIN_CREATOR_URL,
    imageCount,
    questions,
    previousDayQuestions: includeAnswers ? [] : (options.previousDay?.questions ?? []),
    previousDayDate: includeAnswers ? null : (options.previousDay?.date ?? null),
    savedDate: postDate,
    includeTodayAnswers: includeAnswers,
    questionSetId: options.questionSetId ?? null,
  }
}

router.get('/history', async (req, res) => {
  try {
    if (!isMysqlReady()) {
      res.status(503).json({ error: '数据库未就绪，请检查 MySQL 配置与连接' })
      return
    }
    const page = Math.max(1, Number(req.query.page) || 1)
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20))
    const result = await listQuestionSets(page, pageSize)
    res.json(result)
  } catch (err) {
    console.error('[history] 失败:', err)
    res.status(500).json({ error: '读取历史记录失败' })
  }
})

router.get('/history/:id', async (req, res) => {
  try {
    if (!isMysqlReady()) {
      res.status(503).json({ error: '数据库未就绪，请检查 MySQL 配置与连接' })
      return
    }

    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: '无效的历史记录 ID' })
      return
    }

    const record = await getQuestionSetById(id)
    if (!record) {
      res.status(404).json({ error: '历史记录不存在' })
      return
    }

    res.json({ record })
  } catch (err) {
    console.error('[history detail] 失败:', err)
    res.status(500).json({ error: '读取历史题目失败' })
  }
})

router.post('/history/:id/prepare', async (req, res) => {
  const started = Date.now()
  try {
    if (!isMysqlReady()) {
      res.status(503).json({ error: '数据库未就绪，请检查 MySQL 配置与连接' })
      return
    }

    const id = Number(req.params.id)
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: '无效的历史记录 ID' })
      return
    }

    const record = await getQuestionSetById(id)
    if (!record) {
      res.status(404).json({ error: '历史记录不存在' })
      return
    }

    const yesterday = getYesterdayDateStr()
    const previousRecord = await getPostByDate(yesterday)
    const previousDay = previousRecord
      ? { date: yesterday, questions: previousRecord.questions }
      : undefined

    const payload = await buildPreparePayload(record.questions, {
      previousDay,
      includeAnswers: false,
      savedDate: record.postDate,
      questionSetId: record.id,
    })

    devGroup(`history prepare #${id} · ${Date.now() - started}ms`, () => {
      devLog('prepare', '历史题目数:', record.questionCount)
    })

    res.json({
      ...payload,
      ...(isDevMode()
        ? {
            _meta: {
              durationMs: Date.now() - started,
              questionSetId: id,
              mode: 'history',
            },
          }
        : {}),
    })
  } catch (err) {
    console.error('[history prepare] 失败:', err)
    res.status(500).json({ error: '历史题目发布准备失败' })
  }
})

router.post('/prepare', async (req, res) => {
  const started = Date.now()
  try {
    if (!isMysqlReady()) {
      res.status(503).json({ error: '数据库未就绪，请检查 MySQL 配置与连接' })
      return
    }

    const { questions, source } = req.body as {
      questions?: Question[]
      source?: 'ai' | 'vocab'
    }

    devGroup('POST /xhs/prepare', () => {
      devLog('prepare', '收到题目数:', questions?.length ?? 0)
      devLog('prepare', '模块:', questions?.[0]?.moduleName ?? '-')
    })

    if (!questions?.length) {
      res.status(400).json({ error: '请提供至少一道题目' })
      return
    }

    const today = getTodayDateStr()
    const yesterday = getYesterdayDateStr()
    const saveSource = source === 'vocab' ? 'vocab' : 'ai'

    const saved = await saveQuestionSet(questions, saveSource)
    await upsertDailyPost(today, questions)

    const previousRecord = await getPostByDate(yesterday)
    const previousDay = previousRecord
      ? { date: yesterday, questions: previousRecord.questions }
      : undefined

    const payload = await buildPreparePayload(questions, {
      previousDay,
      savedDate: today,
      questionSetId: saved.id,
    })

    const durationMs = Date.now() - started
    const meta = {
      durationMs,
      questionCount: questions.length,
      questionSetId: saved.id,
      previousDayCount: previousDay?.questions.length ?? 0,
      savedDate: today,
      xhsTitle: preview(payload.post.title, 50),
      xhsBodyLength: payload.post.body.length,
      imageCount: payload.imageCount,
    }

    devGroup(`prepare 完成 · ${durationMs}ms`, () => {
      devLog('prepare', '文案摘要:', meta)
      devLog('prepare', '小红书 copyText 预览:', preview(payload.copyText, 120))
    })

    res.json({
      ...payload,
      ...(isDevMode() ? { _meta: meta } : {}),
    })
  } catch (err) {
    console.error('[prepare] 失败:', err)
    res.status(500).json({ error: '发布内容准备失败' })
  }
})

export default router
