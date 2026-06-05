<script setup lang="ts">
import { computed } from 'vue'
import type { SelectOption } from '@/types/form'
import type {
  VocabCategory,
  VocabItem,
  VocabSentimentTone,
  VocabWebLookupResult,
} from '@/types'

const props = defineProps<{
  categories: VocabCategory[]
  selectedCategoryId: string
  vocabList: VocabItem[]
  libraryTotal: number
  filteredTotal: number
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

const isFiltered = computed(
  () => !!props.selectedCategoryId || !!keyword.value.trim(),
)

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

function onSearch() {
  emit('search', keyword.value)
}

function onWebSearch() {
  emit('webSearch', keyword.value)
}

const SENTIMENT_CLASS: Record<VocabSentimentTone, string> = {
  褒义: 'sentiment-positive',
  偏褒义: 'sentiment-mild-positive',
  贬义: 'sentiment-negative',
  偏贬义: 'sentiment-mild-negative',
  中性: 'sentiment-neutral',
  可褒可贬: 'sentiment-mixed',
}

function sentimentClass(tone: VocabSentimentTone): string {
  return SENTIMENT_CLASS[tone] ?? 'sentiment-neutral'
}

const SENTIMENT_USAGE_RULES: Array<{ pattern: RegExp; tone: VocabSentimentTone }> = [
  { pattern: /可褒可贬/, tone: '可褒可贬' },
  { pattern: /偏褒/, tone: '偏褒义' },
  { pattern: /偏贬|多含贬/, tone: '偏贬义' },
  { pattern: /含褒|褒义/, tone: '褒义' },
  { pattern: /含贬|贬义/, tone: '贬义' },
  { pattern: /^中性$/, tone: '中性' },
]

function parseUsageSentiment(usage?: string): VocabSentimentTone | null {
  if (!usage) return null
  for (const rule of SENTIMENT_USAGE_RULES) {
    if (rule.pattern.test(usage)) return rule.tone
  }
  return null
}
</script>

<template>
  <el-card class="vocab-panel panel-in-shell" shadow="never">
    <template #header>
      <div>
        <span class="vocab-title">700 高频词</span>
        <p class="vocab-desc">
          库内共 {{ libraryTotal }} 条去重词条
          <template v-if="isFiltered">，当前筛选 {{ filteredTotal }} 条</template>
          · 库内搜索与联网查词均不消耗 AI Token
        </p>
      </div>
    </template>

    <div class="category-grid">
      <button
        type="button"
        class="cat-chip"
        :class="{ active: selectedCategoryId === '' }"
        @click="emit('selectCategory', '')"
      >
        全部
      </button>
      <button
        v-for="cat in categories"
        :key="cat.id"
        type="button"
        class="cat-chip"
        :class="{ active: cat.id === selectedCategoryId }"
        @click="emit('selectCategory', cat.id)"
      >
        {{ cat.name }}
        <span class="count">{{ cat.count }}</span>
      </button>
    </div>

    <div class="search-row">
      <el-input
        v-model="keyword"
        size="large"
        clearable
        placeholder="输入词语，库内搜或联网查…"
        class="search-input"
        @keyup.enter="onSearch"
      />
      <el-button size="large" :disabled="loading || webLoading" @click="onSearch">
        库内搜
      </el-button>
      <el-button
        size="large"
        type="primary"
        plain
        :disabled="loading || webLoading || !keyword.trim()"
        :loading="webLoading"
        @click="onWebSearch"
      >
        🌐 联网查
      </el-button>
    </div>

    <div class="generate-row">
      <label class="count-field">
        <span class="count-label">生成题数</span>
        <el-select v-model="count" size="large" :disabled="loading" class="count-select">
          <el-option
            v-for="opt in countOptions"
            :key="opt.value"
            :label="opt.label"
            :value="opt.value"
          />
        </el-select>
      </label>
      <el-button
        type="primary"
        size="large"
        class="gen-btn"
        :disabled="loading"
        :loading="loading"
        @click="emit('generate')"
      >
        ✨ 生成词汇题
      </el-button>
    </div>

    <el-alert
      v-if="webLookup"
      type="info"
      :closable="false"
      class="web-result"
    >
      <template #title>
        <span>联网结果 · 「{{ webLookup.keyword }}」</span>
        <span v-if="webLookup.web" class="web-source">
          来源：{{ sourceLabel(webLookup.web.source) }}
        </span>
      </template>
      <p v-if="webLookup.web" class="web-meaning">
        <strong>{{ webLookup.web.word }}</strong>
        <span v-if="webLookup.web.pinyin" class="web-pinyin">（{{ webLookup.web.pinyin }}）</span>
        <span
          v-if="webLookup.web.sentiment"
          class="sentiment-tag"
          :class="sentimentClass(webLookup.web.sentiment.tone)"
        >
          {{ webLookup.web.sentiment.tone }}
        </span>
        ：{{ webLookup.web.meaning }}
        <el-button
          v-if="webLookup.web.sourceUrl"
          type="primary"
          link
          size="small"
          @click="openLink(webLookup.web!.sourceUrl)"
        >
          查看原文
        </el-button>
      </p>
      <p v-if="webLookup.web?.sentiment" class="web-sentiment-note">
        <span class="web-sentiment-label">感情色彩</span>
        {{ webLookup.web.sentiment.note }}
        <span class="web-sentiment-src">
          （{{ webLookup.web.sentiment.source === 'library' ? '700 词库' : webLookup.web.sentiment.source === 'meaning' ? '释义标注' : '语义推断' }}）
        </span>
      </p>
      <div
        v-if="webLookup.web?.synonyms?.length || webLookup.web?.antonyms?.length"
        class="web-related-block"
      >
        <p v-if="webLookup.web?.synonyms?.length" class="web-related">
          <span class="web-related-label syn">近义词</span>
          <span
            v-for="item in webLookup.web.synonyms"
            :key="`syn-${item.word}`"
            class="related-item"
          >
            <strong>{{ item.word }}</strong>
            <span v-if="item.meaning" class="related-meaning">（{{ item.meaning }}）</span>
          </span>
        </p>
        <p v-if="webLookup.web?.antonyms?.length" class="web-related">
          <span class="web-related-label ant">反义词</span>
          <span
            v-for="item in webLookup.web.antonyms"
            :key="`ant-${item.word}`"
            class="related-item"
          >
            <strong>{{ item.word }}</strong>
            <span v-if="item.meaning" class="related-meaning">（{{ item.meaning }}）</span>
          </span>
        </p>
        <p class="web-related-source">近反义词条来源：汉典</p>
      </div>
      <p v-else class="web-meaning muted">未拉到在线释义，可点击下方链接在浏览器中查看</p>
      <p v-if="webLookup.local.length" class="web-local-hint">
        库内匹配 {{ webLookup.local.length }} 条（见下方列表）
      </p>
      <div class="web-links">
        <el-button
          v-for="link in webLookup.links"
          :key="link.url"
          size="small"
          round
          @click="openLink(link.url)"
        >
          {{ link.name }} ↗
        </el-button>
      </div>
    </el-alert>

    <div v-if="vocabList.length" class="vocab-list">
      <article v-for="item in vocabList" :key="item.id" class="vocab-card">
        <header class="vocab-card-head">
          <strong class="word">{{ item.word }}</strong>
          <span class="type">{{ item.type }}</span>
          <span
            v-if="parseUsageSentiment(item.usage)"
            class="sentiment-tag sentiment-tag--sm"
            :class="sentimentClass(parseUsageSentiment(item.usage)!)"
          >
            {{ parseUsageSentiment(item.usage) }}
          </span>
        </header>
        <p class="meaning">{{ item.meaning }}</p>
        <p v-if="item.example" class="extra">例：{{ item.example }}</p>
        <p v-if="item.confusable?.length" class="extra">
          辨析：{{ item.confusable.join('；') }}
        </p>
      </article>
    </div>
  </el-card>
</template>

<style scoped>
.vocab-panel {
  margin-bottom: 24px;
}

.vocab-title {
  font-size: 18px;
  font-weight: 700;
}

.vocab-desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 分类标签：等高胶囊 */
.category-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  align-items: stretch;
}

.cat-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: var(--ui-radius-pill, 20px);
  border: 1px solid var(--ui-border, #eee);
  background: var(--bg);
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
}

.cat-chip:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.cat-chip.active {
  background: var(--el-color-primary-light-9);
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
  font-weight: 600;
}

.count {
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.06);
  line-height: 1.2;
}

.cat-chip.active .count {
  background: rgba(255, 36, 66, 0.12);
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.search-input {
  flex: 1;
  min-width: 180px;
}

.generate-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  padding: 16px 0 4px;
  margin-bottom: 16px;
  border-top: 1px dashed var(--ui-border, #eee);
}

.count-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 140px;
}

.count-label {
  font-size: 13px;
  color: var(--text-secondary);
  font-weight: 500;
}

.count-select {
  width: 140px;
}

.gen-btn {
  flex: 1;
  min-width: 160px;
  max-width: 280px;
}

@media (max-width: 576px) {
  .gen-btn {
    max-width: none;
    width: 100%;
  }

  .count-select {
    width: 100%;
  }

  .count-field {
    width: 100%;
  }
}

.web-result {
  margin-bottom: 16px;
  border-radius: 10px;
}

.web-source {
  margin-left: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}

.web-meaning {
  font-size: 14px;
  line-height: 1.6;
  margin-top: 8px;
}

.web-meaning.muted {
  color: var(--text-secondary);
}

.sentiment-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  line-height: 1.4;
  vertical-align: middle;
}

.sentiment-tag--sm {
  margin-left: 0;
  font-size: 10px;
  padding: 1px 6px;
}

.sentiment-positive {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.sentiment-mild-positive {
  background: #e8f5e9;
  color: #2e7d32;
}

.sentiment-negative {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

.sentiment-mild-negative {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.sentiment-neutral {
  background: var(--el-fill-color-light);
  color: var(--text-secondary);
}

.sentiment-mixed {
  background: #f3e5f5;
  color: #7b1fa2;
}

.web-sentiment-note {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
  font-size: 13px;
  line-height: 1.65;
  color: var(--text);
}

.web-sentiment-label {
  display: inline-block;
  margin-right: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.web-sentiment-src {
  font-size: 11px;
  color: var(--text-secondary);
}

.web-related-block {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--ui-border, #eee);
}

.web-related {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  align-items: baseline;
  font-size: 13px;
  line-height: 1.6;
  margin-top: 6px;
}

.web-related-label {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 6px;
}

.web-related-label.syn {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}

.web-related-label.ant {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}

.related-item strong {
  color: var(--el-color-primary);
  font-weight: 600;
}

.related-meaning {
  color: var(--text-secondary);
}

.web-related-source {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

.web-local-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.web-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

/* 词卡网格：等高对齐 */
.vocab-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  align-items: stretch;
}

.vocab-card {
  display: flex;
  flex-direction: column;
  min-height: 100px;
  height: 100%;
  padding: 14px;
  background: var(--bg);
  border: 1px solid var(--ui-border, #eee);
  border-radius: var(--ui-radius, 12px);
  transition: box-shadow 0.2s;
}

.vocab-card:hover {
  box-shadow: var(--ui-shadow, 0 2px 12px rgba(0, 0, 0, 0.06));
}

.vocab-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.word {
  font-size: 16px;
  color: var(--el-color-primary);
}

.type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
  flex-shrink: 0;
}

.meaning {
  font-size: 13px;
  line-height: 1.55;
  flex: 1;
}

.extra {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 6px;
  line-height: 1.45;
}
</style>
