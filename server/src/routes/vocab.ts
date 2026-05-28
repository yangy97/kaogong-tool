import { Router } from 'express'
import {
  generateVocabCards,
  generateVocabQuestions,
  getVocabStats,
  listVocab,
  listVocabCategories,
} from '../services/vocabService.js'
import { lookupVocabOnline } from '../services/vocabWebLookup.js'

const router = Router()

router.get('/stats', (_req, res) => {
  res.json(getVocabStats())
})

router.get('/categories', (_req, res) => {
  res.json({ categories: listVocabCategories() })
})

router.get('/list', (req, res) => {
  const { categoryId, keyword, page, pageSize } = req.query
  res.json(
    listVocab({
      categoryId: categoryId as string | undefined,
      keyword: keyword as string | undefined,
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 50,
    }),
  )
})

router.get('/web-lookup', async (req, res) => {
  try {
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : ''
    const result = await lookupVocabOnline(keyword)
    res.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : '联网查词失败'
    res.status(400).json({ error: message })
  }
})

router.post('/generate', (req, res) => {
  try {
    const { count = 5, categoryId, mode = 'quiz' } = req.body ?? {}
    const safeCount = Math.min(Math.max(Number(count) || 5, 1), 20)

    if (mode === 'cards') {
      const cards = generateVocabCards(safeCount, categoryId)
      res.json({ mode: 'cards', cards, count: cards.length })
      return
    }

    const questions = generateVocabQuestions(safeCount, categoryId)
    res.json({ mode: 'quiz', questions, count: questions.length })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: '词汇生成失败' })
  }
})

export default router
