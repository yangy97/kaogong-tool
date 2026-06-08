<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
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
const pageSize = 10
const loading = ref(false)
const loadingMore = ref(false)
const scrollRoot = ref<HTMLElement | null>(null)
const loadSentinel = ref<HTMLElement | null>(null)
let loadObserver: IntersectionObserver | null = null

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

function setupLoadObserver() {
  loadObserver?.disconnect()
  if (!scrollRoot.value || !loadSentinel.value || !hasMore.value) return
  loadObserver = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) void loadMore()
    },
    { root: scrollRoot.value, rootMargin: '120px', threshold: 0 },
  )
  loadObserver.observe(loadSentinel.value)
}

watch([() => items.value.length, hasMore], () => {
  void nextTick(() => setupLoadObserver())
})

onMounted(async () => {
  await loadFirstPage()
  await nextTick()
  setupLoadObserver()
})

onUnmounted(() => {
  loadObserver?.disconnect()
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

    <div v-else class="list-panel">
      <div ref="scrollRoot" class="list-scroll">
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

        <div v-if="hasMore" ref="loadSentinel" class="load-sentinel" aria-hidden="true" />
        <div v-if="loadingMore" class="load-hint">
          <el-text type="info" size="small">加载更多…</el-text>
        </div>
      </div>

      <div v-if="items.length" class="list-footer">
        <el-text type="info" size="small">共 {{ total }} 条 · 已加载 {{ items.length }} 条</el-text>
        <el-text v-if="!hasMore" type="success" size="small">已全部加载</el-text>
        <el-text v-else-if="!loadingMore" type="info" size="small">下滑加载更多</el-text>
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

.list-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.list-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
  overscroll-behavior: contain;
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

.load-sentinel {
  height: 1px;
}

.load-hint {
  text-align: center;
  padding: 8px 0 4px;
}

.list-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
  flex-shrink: 0;
  padding: 10px 4px 2px;
  border-top: 1px dashed var(--el-border-color-lighter);
  background: var(--el-fill-color-blank);
}
</style>
