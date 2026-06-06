<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { api } from '@/api'
import type { QuestionSetSummary } from '@/types'

const props = defineProps<{
  activeId?: number | null
}>()

const emit = defineEmits<{
  view: [id: number]
  loaded: [items: QuestionSetSummary[]]
}>()

const items = ref<QuestionSetSummary[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 5
const loading = ref(false)
const loadingMore = ref(false)

const sourceLabel = (source: QuestionSetSummary['source']) =>
  source === 'vocab' ? '词汇' : 'AI'

const hasMore = computed(() => items.value.length < total.value)

const emptyText = computed(() =>
  loading.value && !items.value.length ? '加载中…' : '暂无历史记录，生成题目后会自动保存在这里',
)

function formatTime(raw: string) {
  const s = raw.trim()
  // 服务端返回的本地时间：2026-06-04 10:04:31
  const localMatch = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/.exec(s)
  if (localMatch) {
    return `${localMatch[2]}/${localMatch[3]} ${localMatch[4]}:${localMatch[5]}`
  }
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchPage(targetPage: number, append: boolean) {
  const res = await api.listQuestionHistory({ page: targetPage, pageSize })
  total.value = res.total
  if (append) {
    const existIds = new Set(items.value.map((x) => x.id))
    const merged = res.items.filter((x) => !existIds.has(x.id))
    items.value = [...items.value, ...merged]
  } else {
    items.value = res.items
  }
  page.value = targetPage
}

async function loadFirstPage() {
  loading.value = true
  try {
    await fetchPage(1, false)
    emit('loaded', items.value)
  } catch {
    items.value = []
    total.value = 0
    emit('loaded', [])
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value || loading.value) return
  loadingMore.value = true
  try {
    await fetchPage(page.value + 1, true)
  } finally {
    loadingMore.value = false
  }
}

onMounted(() => {
  void loadFirstPage()
})

defineExpose({ refresh: loadFirstPage })
</script>

<template>
  <el-card class="history-panel panel-in-shell" shadow="never" v-loading="loading && !items.length">
    <template #header>
      <div class="head">
        <span class="panel-title">📚 历史题目</span>
      </div>
    </template>

    <el-empty v-if="!items.length && !loading" :description="emptyText" />

    <div v-else class="list-wrap">
      <div class="list">
        <div
          v-for="item in items"
          :key="item.id"
          class="history-item"
          :class="{ active: props.activeId === item.id }"
          role="button"
          tabindex="0"
          @click="emit('view', item.id)"
          @keydown.enter="emit('view', item.id)"
        >
          <div class="item-info">
            <div class="item-title">
              <el-tag size="small" effect="plain">{{ item.postDate }}</el-tag>
              <el-tag size="small" type="danger" effect="plain">{{ item.moduleName }}</el-tag>
              <el-tag v-if="item.topicName" size="small" type="info" effect="plain">
                {{ item.topicName }}
              </el-tag>
              <el-tag size="small" round>{{ item.questionCount }} 题</el-tag>
              <el-tag size="small" type="warning" effect="plain">{{ sourceLabel(item.source) }}</el-tag>
              <el-tag
                v-if="item.hasTuxing"
                size="small"
                color="#f3e5f5"
                style="color: #7b1fa2; border: none"
              >
                含图形
              </el-tag>
              <el-tag v-if="item.hasTable" size="small" type="info" effect="plain">含表格</el-tag>
              <el-tag
                v-if="item.xhsPublishCount"
                size="small"
                color="#fff0f0"
                style="color: #e53935; border: none"
              >
                小红书×{{ item.xhsPublishCount }}
              </el-tag>
              <el-tag
                v-if="item.douyinPublishCount"
                size="small"
                color="#f0f4ff"
                style="color: #3949ab; border: none"
              >
                抖音×{{ item.douyinPublishCount }}
              </el-tag>
            </div>
            <div class="item-meta">
              <span>#{{ item.id }}</span>
              <span>{{ formatTime(item.savedAt) }}</span>
            </div>
            <p class="preview">{{ item.previewStem }}</p>
          </div>

          <span v-if="props.activeId === item.id" class="item-status">已查看</span>
        </div>
      </div>

      <div v-if="items.length" class="list-footer">
        <el-text type="info" size="small">共 {{ total }} 条 · 已加载 {{ items.length }} 条</el-text>
        <el-button
          v-if="hasMore"
          size="small"
          :loading="loadingMore"
          @click="loadMore"
        >
          加载更多
        </el-button>
        <el-text v-else type="success" size="small">已全部加载</el-text>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.history-panel {
  border: none;
}

.head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
}

.list-wrap {
  max-height: min(420px, 50vh);
  overflow-y: auto;
  padding-right: 4px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.history-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background-color 0.15s;
}

.history-item:hover {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-fill-color-light);
}

.history-item.active {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 0 0 1px var(--el-color-primary-light-8);
  background: var(--el-color-primary-light-9);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.preview {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-status {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
}

.list-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px 4px 4px;
  margin-top: 4px;
  border-top: 1px dashed var(--el-border-color-lighter);
  position: sticky;
  bottom: 0;
  background: linear-gradient(to top, var(--el-fill-color-blank) 80%, transparent);
}
</style>
