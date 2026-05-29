import type { Question, VocabItem } from '../types/index'
import {
  VOCAB_CATEGORIES,
  VOCAB_ITEMS,
  getVocabByCategory,
  searchVocab,
} from '../data/words700'

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function listVocabCategories() {
  return VOCAB_CATEGORIES.map((c) => ({
    ...c,
    count: VOCAB_ITEMS.filter((v) => v.category === c.id).length,
  }))
}

export function filterVocabItems(options: { categoryId?: string; keyword?: string }): VocabItem[] {
  const { categoryId, keyword } = options
  const kw = keyword?.trim() ?? ''
  let items = categoryId ? getVocabByCategory(categoryId) : VOCAB_ITEMS
  if (kw) {
    const q = kw.toLowerCase()
    items = items.filter(
      (v) =>
        v.word.includes(kw) ||
        v.word.toLowerCase().includes(q) ||
        v.meaning.includes(kw) ||
        v.example?.includes(kw),
    )
  }
  return items
}

export function listVocab(options: { categoryId?: string; keyword?: string; page?: number; pageSize?: number }) {
  const { categoryId, keyword, page = 1, pageSize = 500 } = options
  const items = filterVocabItems({ categoryId, keyword })
  const total = items.length
  const start = (page - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  }
}

export function generateVocabQuestions(
  count: number,
  categoryId?: string,
): Question[] {
  const pool = categoryId ? getVocabByCategory(categoryId) : VOCAB_ITEMS
  const picked = shuffle(pool).slice(0, Math.min(count, pool.length))

  return picked.map((item, i) => vocabToQuestion(item, i))
}

function vocabToQuestion(item: VocabItem, index: number): Question {
  const distractors = shuffle(
    VOCAB_ITEMS.filter((v) => v.id !== item.id && v.category === item.category),
  ).slice(0, 3)

  const options = shuffle([
    { key: 'A', text: item.meaning },
    ...distractors.map((d, i) => ({
      key: String.fromCharCode(66 + i),
      text: d.meaning,
    })),
  ]).map((o, i) => ({ ...o, key: String.fromCharCode(65 + i) }))

  const correctKey = options.find((o) => o.text === item.meaning)?.key ?? 'A'

  return {
    id: `vocab-q-${item.id}-${Date.now()}-${index}`,
    moduleId: 'words700',
    moduleName: '700高频词',
    topicId: item.category,
    topicName: VOCAB_CATEGORIES.find((c) => c.id === item.category)?.name,
    type: 'vocab',
    stem: `「${item.word}」的含义是：`,
    options,
    answer: correctKey,
    analysis: [
      `【${item.type}】${item.word}`,
      `释义：${item.meaning}`,
      item.usage ? `用法：${item.usage}` : '',
      item.example ? `例句：${item.example}` : '',
      item.confusable?.length ? `辨析：${item.confusable.join('；')}` : '',
    ].filter(Boolean).join('\n'),
    difficulty: item.frequency === 'core' ? 'medium' : 'easy',
  }
}

export function generateVocabCards(count: number, categoryId?: string): VocabItem[] {
  const pool = categoryId ? getVocabByCategory(categoryId) : VOCAB_ITEMS
  return shuffle(pool).slice(0, Math.min(count, pool.length))
}

export function getVocabStats() {
  return {
    total: VOCAB_ITEMS.length,
    categories: listVocabCategories(),
  }
}
