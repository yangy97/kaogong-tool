<script setup lang="ts">
import { computed } from 'vue'
import type { SelectOption } from '@/types/form'
import type { VocabCategory, VocabItem, VocabWebLookupResult } from '@/types'

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
