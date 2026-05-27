import { Router } from 'express'
import type { Question } from '../types/index.js'
import { XHS_CREATOR_URL, DOUYIN_CREATOR_URL } from '../constants.js'
import {
  buildDouyinPost,
  buildXhsPost,
  formatCopyText,
  formatDouyinCopyText,
} from '../services/xhsService.js'
import { devGroup, devLog, isDevMode, preview } from '../utils/devLog.js'

const router = Router()

router.post('/prepare', (req, res) => {
  const started = Date.now()
  try {
    const { questions } = req.body as { questions?: Question[] }

    devGroup('POST /xhs/prepare', () => {
      devLog('prepare', '收到题目数:', questions?.length ?? 0)
      devLog('prepare', '模块:', questions?.[0]?.moduleName ?? '-')
    })

    if (!questions?.length) {
      res.status(400).json({ error: '请提供至少一道题目' })
      return
    }

    const post = buildXhsPost(questions)
    const copyText = formatCopyText(post)
    const douyinPost = buildDouyinPost(questions)
    const douyinCopyText = formatDouyinCopyText(douyinPost)

    const durationMs = Date.now() - started
    const meta = {
      durationMs,
      questionCount: questions.length,
      xhsTitle: preview(post.title, 50),
      xhsBodyLength: post.body.length,
      xhsTags: post.tags,
      douyinTitle: preview(douyinPost.title, 50),
      imageCount: questions.length * 2 + 1,
    }

    devGroup(`prepare 完成 · ${durationMs}ms`, () => {
      devLog('prepare', '文案摘要:', meta)
      devLog('prepare', '小红书 copyText 预览:', preview(copyText, 120))
    })

    res.json({
      post,
      copyText,
      creatorUrl: XHS_CREATOR_URL,
      douyinPost,
      douyinCopyText,
      douyinCreatorUrl: DOUYIN_CREATOR_URL,
      imageCount: meta.imageCount,
      ...(isDevMode() ? { _meta: meta } : {}),
    })
  } catch (err) {
    console.error('[prepare] 失败:', err)
    res.status(500).json({ error: '发布内容准备失败' })
  }
})

export default router
