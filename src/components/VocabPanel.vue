<script setup lang="ts">
import type { VocabCategory, VocabItem } from '@/types'

defineProps<{
  categories: VocabCategory[]
  selectedCategoryId: string
  vocabList: VocabItem[]
  total: number
  loading: boolean
}>()

const emit = defineEmits<{
  selectCategory: [id: string]
  search: [keyword: string]
  generate: []
}>()

const keyword = defineModel<string>('keyword', { default: '' })
</script>

<template>
  <section class="vocab-panel">
    <div class="vocab-head">
      <div>
        <h2>700 高频词</h2>
        <p>共 {{ total }} 个高频成语、实词、关联词与政策热词</p>
      </div>
    </div>

    <div class="category-grid">
      <button
        class="cat-chip"
        :class="{ active: selectedCategoryId === '' }"
        @click="emit('selectCategory', '')"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        class="cat-chip"
        :class="{ active: cat.id === selectedCategoryId }"
        @click="emit('selectCategory', cat.id)"
      >
        {{ cat.name }}
        <span class="count">{{ cat.count }}</span>
      </button>
    </div>

    <div class="search-row">
      <input
        v-model="keyword"
        type="search"
        placeholder="搜索词语、释义…"
        @keyup.enter="emit('search', keyword)"
      />
      <button class="search-btn" @click="emit('search', keyword)">搜索</button>
      <button class="gen-btn" :disabled="loading" @click="emit('generate')">
        {{ loading ? '生成中…' : '✨ 生成词汇题' }}
      </button>
    </div>

    <div v-if="vocabList.length" class="vocab-list">
      <article v-for="item in vocabList" :key="item.id" class="vocab-card">
        <header>
          <strong>{{ item.word }}</strong>
          <span class="type">{{ item.type }}</span>
        </header>
        <p class="meaning">{{ item.meaning }}</p>
        <p v-if="item.example" class="example">例：{{ item.example }}</p>
        <p v-if="item.confusable?.length" class="confusable">
          辨析：{{ item.confusable.join('；') }}
        </p>
      </article>
    </div>
  </section>
</template>

<style scoped>
.vocab-panel {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.vocab-head h2 {
  font-size: 18px;
  margin-bottom: 4px;
}

.vocab-head p {
  font-size: 13px;
  color: var(--text-secondary);
}

.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 16px 0;
}

.cat-chip {
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.cat-chip.active {
  background: var(--primary-light);
  border-color: var(--primary);
  color: var(--primary);
}

.count {
  font-size: 11px;
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 10px;
}

.search-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-row input {
  flex: 1;
  min-width: 180px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
}

.search-btn,
.gen-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.search-btn {
  background: var(--bg);
  border: 1px solid var(--border);
}

.gen-btn {
  background: var(--primary);
  color: #fff;
  margin-left: auto;
}

.gen-btn:disabled {
  opacity: 0.6;
}

.vocab-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
  max-height: 400px;
  overflow-y: auto;
}

.vocab-card {
  background: var(--bg);
  border-radius: 8px;
  padding: 12px;
}

.vocab-card header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.vocab-card strong {
  font-size: 16px;
  color: var(--primary);
}

.type {
  font-size: 11px;
  padding: 1px 6px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 4px;
}

.meaning {
  font-size: 13px;
  line-height: 1.5;
}

.example,
.confusable {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}
</style>
