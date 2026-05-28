<script setup lang="ts">
import FormSelect from '@/components/FormSelect.vue'
import type { SelectOption } from '@/components/FormSelect.vue'
import type { VocabCategory, VocabItem, VocabWebLookupResult } from '@/types'

defineProps<{
  categories: VocabCategory[]
  selectedCategoryId: string
  vocabList: VocabItem[]
  total: number
  loading: boolean
  webLoading?: boolean
  webLookup?: VocabWebLookupResult | null
  countOptions: SelectOption[]
}>()

const emit = defineEmits<{
  selectCategory: [id: string]
  search: [keyword: string]
  webSearch: [keyword: string]
  generate: []
}>()

const keyword = defineModel<string>('keyword', { default: '' })
const count = defineModel<number>('count', { default: 3 })

const SOURCE_LABEL: Record<string, string> = {
  youdao: '有道词典',
  iciba: '金山词霸',
  local: '700 词库',
}

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source
}

function openLink(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <section class="vocab-panel">
    <div class="vocab-head">
      <div>
        <h2>700 高频词</h2>
        <p>共 {{ total }} 个高频成语、实词、关联词与政策热词 · 库内搜索与联网查词均不消耗 AI Token</p>
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
        placeholder="输入词语，库内搜或联网查…"
        @keyup.enter="emit('search', keyword)"
      />
      <button class="search-btn" :disabled="loading || webLoading" @click="emit('search', keyword)">
        库内搜
      </button>
      <button
        class="web-btn"
        :disabled="loading || webLoading || !keyword.trim()"
        @click="emit('webSearch', keyword)"
      >
        {{ webLoading ? '查询中…' : '🌐 联网查' }}
      </button>
    </div>

    <div class="generate-row">
      <label class="count-field">
        <span class="count-label">生成题数</span>
        <FormSelect v-model="count" :options="countOptions" :disabled="loading" />
      </label>
      <button class="gen-btn" :disabled="loading" @click="emit('generate')">
        {{ loading ? '生成中…' : '✨ 生成词汇题' }}
      </button>
    </div>

    <div v-if="webLookup" class="web-result">
      <div class="web-result-head">
        <strong>联网结果 · 「{{ webLookup.keyword }}」</strong>
        <span v-if="webLookup.web" class="web-source">来源：{{ sourceLabel(webLookup.web.source) }}</span>
      </div>
      <p v-if="webLookup.web" class="web-meaning">
        <strong>{{ webLookup.web.word }}</strong>
        <span v-if="webLookup.web.pinyin" class="web-pinyin">（{{ webLookup.web.pinyin }}）</span>
        ：{{ webLookup.web.meaning }}
        <button
          v-if="webLookup.web.sourceUrl"
          type="button"
          class="link-btn"
          @click="openLink(webLookup.web!.sourceUrl)"
        >
          查看原文
        </button>
      </p>
      <p v-else class="web-meaning muted">未拉到在线释义，可点击下方链接在浏览器中查看</p>
      <p v-if="webLookup.local.length" class="web-local-hint">
        库内匹配 {{ webLookup.local.length }} 条（见下方列表）
      </p>
      <div class="web-links">
        <button
          v-for="link in webLookup.links"
          :key="link.url"
          type="button"
          class="ext-link"
          @click="openLink(link.url)"
        >
          {{ link.name }} ↗
        </button>
      </div>
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

.search-row,
.generate-row {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  align-items: center;
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
.web-btn,
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

.web-btn {
  background: #e8f4fd;
  border: 1px solid #90caf9;
  color: #1565c0;
}

.web-btn:disabled {
  opacity: 0.6;
}

.generate-row {
  padding: 12px 0 4px;
  border-top: 1px dashed var(--border);
  margin-top: 4px;
}

.count-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-label {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.gen-btn {
  background: var(--primary);
  color: #fff;
  margin-left: auto;
}

.gen-btn:disabled {
  opacity: 0.6;
}

.web-result {
  background: #f0f7ff;
  border: 1px solid #bbdefb;
  border-radius: 10px;
  padding: 14px 16px;
  margin-bottom: 16px;
}

.web-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 14px;
}

.web-source {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 400;
}

.web-meaning {
  font-size: 14px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.web-meaning.muted {
  color: var(--text-secondary);
}

.web-local-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.link-btn {
  margin-left: 8px;
  padding: 2px 8px;
  font-size: 12px;
  color: #1565c0;
  background: #fff;
  border: 1px solid #90caf9;
  border-radius: 4px;
}

.web-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ext-link {
  padding: 4px 10px;
  font-size: 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--primary);
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
