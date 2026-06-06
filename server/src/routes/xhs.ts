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
  getDayBefore,
  getDayNumberForDate,
  getPostByDateForPlatform,
  getQuestionSetById,
  getTodayDateStr,
  listQuestionSets,
  recordQuestionSetPublish,
  saveQuestionSet,
} from '../services/postArchiveService'
import { devGroup, devLog, isDevMode, preview } from '../utils/devLog'

const router = Router()

interface PreviousDayPayload {
  date: string
  questions: Question[]
  questionSetId: number | null
}

async function resolvePreviousDayForPlatform(
  postDate: string,
  platform: 'xhs' | 'douyin',
): Promise<PreviousDayPayload | undefined> {
  const dayBefore = getDayBefore(postDate)
  const previousRecord = await getPostByDateForPlatform(dayBefore, platform)
  return previousRecord
    ? {
        date: dayBefore,
        questions: previousRecord.questions,
        questionSetId: previousRecord.questionSetId,
      }
    : undefined
}

function countImages(todayCount: number, previousCount: number, includeTodayAnswers = false): number {
  const todayAnswers = includeTodayAnswers ? todayCount : 0
  return 1 + todayCount + todayAnswers + previousCount
}

async function buildPreparePayload(
  questions: Question[],
  options: {
    previousDayXhs?: PreviousDayPayload
    previousDayDouyin?: PreviousDayPayload
    includeAnswers?: boolean
    savedDate?: string
    questionSetId?: number
  },
) {
  const postDate = options.savedDate ?? getTodayDateStr()
  const dayNumber = await getDayNumberForDate(postDate)
  const includeAnswers = options.includeAnswers === true

  const postOptsXhs: BuildPostOptions = {
    previousDay: options.previousDayXhs,
    includeAnswers,
    dayNumber,
  }
  const postOptsDouyin: BuildPostOptions = {
    previousDay: options.previousDayDouyin,
    includeAnswers,
    dayNumber,
  }

  const post = buildXhsPost(questions, postOptsXhs)
  const copyText = formatCopyText(post, postOptsXhs)
  const douyinPost = buildDouyinPost(questions, postOptsDouyin)
  const douyinCopyText = formatDouyinCopyText(douyinPost, postOptsDouyin)

  const previousCountXhs = includeAnswers ? 0 : (options.previousDayXhs?.questions.length ?? 0)
  const previousCountDouyin = includeAnswers ? 0 : (options.previousDayDouyin?.questions.length ?? 0)
  const imageCountXhs = countImages(questions.length, previousCountXhs, includeAnswers)
  const imageCountDouyin = countImages(questions.length, previousCountDouyin, includeAnswers)

  return {
    post,
    copyText,
    creatorUrl: XHS_CREATOR_URL,
    douyinPost,
    douyinCopyText,
    douyinCreatorUrl: DOUYIN_CREATOR_URL,
    imageCount: imageCountXhs,
    imageCountXhs,
    imageCountDouyin,
    questions,
    previousDayQuestions: includeAnswers ? [] : (options.previousDayXhs?.questions ?? []),
    previousDayDate: includeAnswers ? null : (options.previousDayXhs?.date ?? null),
    previousDayQuestionSetId: includeAnswers ? null : (options.previousDayXhs?.questionSetId ?? null),
    previousDayQuestionsXhs: includeAnswers ? [] : (options.previousDayXhs?.questions ?? []),
    previousDayDateXhs: includeAnswers ? null : (options.previousDayXhs?.date ?? null),
    previousDayQuestionSetIdXhs: includeAnswers ? null : (options.previousDayXhs?.questionSetId ?? null),
    previousDayQuestionsDouyin: includeAnswers ? [] : (options.previousDayDouyin?.questions ?? []),
    previousDayDateDouyin: includeAnswers ? null : (options.previousDayDouyin?.date ?? null),
    previousDayQuestionSetIdDouyin: includeAnswers ? null : (options.previousDayDouyin?.questionSetId ?? null),
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

    const previousDayXhs = await resolvePreviousDayForPlatform(record.postDate, 'xhs')
    const previousDayDouyin = await resolvePreviousDayForPlatform(record.postDate, 'douyin')

    const payload = await buildPreparePayload(record.questions, {
      previousDayXhs,
      previousDayDouyin,
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
    const saveSource = source === 'vocab' ? 'vocab' : 'ai'

    const saved = await saveQuestionSet(questions, saveSource)
    const previousDayXhs = await resolvePreviousDayForPlatform(today, 'xhs')
    const previousDayDouyin = await resolvePreviousDayForPlatform(today, 'douyin')

    const payload = await buildPreparePayload(questions, {
      previousDayXhs,
      previousDayDouyin,
      savedDate: today,
      questionSetId: saved.id,
    })

    const durationMs = Date.now() - started
    const meta = {
      durationMs,
      questionCount: questions.length,
      questionSetId: saved.id,
      previousDayCountXhs: previousDayXhs?.questions.length ?? 0,
      previousDayCountDouyin: previousDayDouyin?.questions.length ?? 0,
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

router.post('/publish', async (req, res) => {
  try {
    if (!isMysqlReady()) {
      res.status(503).json({ error: '数据库未就绪，请检查 MySQL 配置与连接' })
      return
    }

    const { questionSetId, platform } = req.body as {
      questionSetId?: number
      platform?: 'xhs' | 'douyin'
    }

    if (!Number.isFinite(questionSetId) || (questionSetId as number) <= 0) {
      res.status(400).json({ error: '请提供有效的题目存档 ID' })
      return
    }
    if (platform !== 'xhs' && platform !== 'douyin') {
      res.status(400).json({ error: '请指定发布平台：xhs 或 douyin' })
      return
    }

    const { record, publishCount } = await recordQuestionSetPublish(
      questionSetId as number,
      platform,
    )
    res.json({
      ok: true,
      questionSetId: record.id,
      postDate: record.postDate,
      platform,
      publishCount,
      publishedXhsAt: record.publishedXhsAt ?? null,
      publishedDouyinAt: record.publishedDouyinAt ?? null,
      xhsPublishCount: record.xhsPublishCount,
      douyinPublishCount: record.douyinPublishCount,
    })
  } catch (err) {
    console.error('[publish] 失败:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : '发布记录失败' })
  }
})

export default router
