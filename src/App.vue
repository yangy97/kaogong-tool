<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import ModuleSelector from '@/components/ModuleSelector.vue'
import TopicSelector from '@/components/TopicSelector.vue'
import VocabPanel from '@/components/VocabPanel.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import PublishPanel from '@/components/PublishPanel.vue'
import ImageGallery from '@/components/ImageGallery.vue'
import HistoryPanel from '@/components/HistoryPanel.vue'
import ModeTabs from '@/components/ModeTabs.vue'
import { ElMessage } from 'element-plus'
import type { SelectGroup, SelectOption } from '@/types/form'
import type {
  AiProviderId,
  AiProviderOption,
  AppMode,
  ExamExpert,
  ExamModule,
  ExamPoint,
  Question,
  VocabCategory,
  VocabItem,
  VocabWebLookupResult,
  XhsPostContent,
  PrepareResult,
} from '@/types'
import {
  copyToClipboard,
  delay,
  downloadImagesAsZip,
  downloadSingleImage,
  generatePlatformImages,
  getDownloadFolderHint,
  openDouyinCreator,
  openXhsCreator,
  revokeImageUrls,
  type GeneratedImage,
  type ImagePlatform,
} from '@/utils/xhsCard'

const appMode = ref<AppMode>('exam')
const modules = ref<ExamModule[]>([])
const examModules = computed(() => modules.value.filter((m) => m.id !== 'words700'))
const selectedModuleId = ref('yanyu')
const selectedTopicId = ref('')
const currentTopics = computed<ExamPoint[]>(() => {
  const mod = modules.value.find((m) => m.id === selectedModuleId.value)
  return mod?.topics ?? []
})
const count = ref(3)
const difficulty = ref<'easy' | 'medium' | 'hard'>('medium')
const questions = ref<Question[]>([])
const source = ref<'ai' | 'vocab' | null>(null)
const sourceMode = ref('')
const loading = ref(false)
const loadingMessage = ref('正在生成题目…')
const loadingSubMessage = ref('')
const publishing = ref(false)
const post = ref<XhsPostContent | null>(null)
const copyText = ref('')
const douyinCopyText = ref('')
const creatorUrl = ref('')
const douyinCreatorUrl = ref('')
const aiConfigured = ref(false)
const aiProviders = ref<AiProviderOption[]>([])
const selectedAiProvider = ref<AiProviderId>('deepseek')
const aiModel = ref('')
const activeAiModel = ref('')
const activeAiProvider = ref('')
const activeExpertTag = ref('')
const experts = ref<ExamExpert[]>([])
const selectedExpertId = ref('none')
const xhsImages = ref<GeneratedImage[]>([])
const douyinImages = ref<GeneratedImage[]>([])
const xhsZipName = ref('考公小红书配图.zip')
const douyinZipName = ref('考公抖音配图.zip')
const previousDayQuestions = ref<Question[]>([])
const previousDayDate = ref<string | null>(null)
const includeTodayAnswers = ref(false)
const loadedHistoryId = ref<number | null>(null)
const historyPanelRef = ref<{ refresh: () => Promise<void> } | null>(null)
const imageLoading = ref(false)
const loadingPlatform = ref<ImagePlatform | null>(null)
let generateAbort: AbortController | null = null
let generateRunId = 0
const cancelRequested = ref(false)
const showCancelBtn = ref(false)

function isAbortError(err: unknown): boolean {
  return (err instanceof DOMException || err instanceof Error) && (err as Error).name === 'AbortError'
}

function handleCancelGenerate() {
  cancelRequested.value = true
  generateAbort?.abort()
}

const vocabCategories = ref<VocabCategory[]>([])
/** 词库总词条数（去重后） */
const vocabLibraryTotal = ref(0)
/** 当前筛选结果条数 */
const vocabFilteredTotal = ref(0)
const selectedVocabCategory = ref('')
const vocabKeyword = ref('')
const vocabList = ref<VocabItem[]>([])
const vocabWebLookup = ref<VocabWebLookupResult | null>(null)
const vocabWebLoading = ref(false)

function showToast(msg: string, duration = 3000) {
  ElMessage({ message: msg, duration, showClose: true })
}

function setLoading(msg: string, sub = '') {
  loadingMessage.value = msg
  loadingSubMessage.value = sub
}

function clearImageCache() {
  revokeImageUrls(xhsImages.value)
  revokeImageUrls(douyinImages.value)
  xhsImages.value = []
  douyinImages.value = []
}

function applyPrepareResult(xhs: PrepareResult) {
  post.value = xhs.post
  copyText.value = xhs.copyText
  douyinCopyText.value = xhs.douyinCopyText
  creatorUrl.value = xhs.creatorUrl
  douyinCreatorUrl.value = xhs.douyinCreatorUrl
  previousDayQuestions.value = xhs.previousDayQuestions
  previousDayDate.value = xhs.previousDayDate
  includeTodayAnswers.value = xhs.includeTodayAnswers ?? false
  if (xhs.questions.length) {
    questions.value = xhs.questions
  }
  clearImageCache()
}

function resetOutput() {
  post.value = null
  questions.value = []
  source.value = null
  sourceMode.value = ''
  loadedHistoryId.value = null
  previousDayQuestions.value = []
  previousDayDate.value = null
  includeTodayAnswers.value = false
  clearImageCache()
}

const sourceLabel = computed(() => {
  if (source.value === 'vocab') return '词汇随机抽取'
  if (sourceMode.value === 'history') return '历史存档'
  if (source.value !== 'ai') return ''
  const p = aiProviders.value.find((x) => x.id === (activeAiProvider.value as AiProviderId))
  const tag = p?.name ? `${p.name}/` : ''
  const expert = activeExpertTag.value ? ` · ${activeExpertTag.value}解析` : ''
  return activeAiModel.value
    ? `AI 生成 (${tag}${activeAiModel.value}${expert})`
    : `AI 生成${expert}`
})

const showAiOptions = computed(() => aiConfigured.value)

const currentProvider = computed(() =>
  aiProviders.value.find((p) => p.id === selectedAiProvider.value),
)

const recommendedExperts = computed(() =>
  experts.value.filter((e) => e.recommended !== false),
)

const otherExperts = computed(() =>
  experts.value.filter((e) => e.recommended === false),
)

const countOptions = computed<SelectOption[]>(() =>
  Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1} 道` })),
)

const difficultyOptions: SelectOption[] = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]

const aiProviderOptions = computed<SelectOption[]>(() =>
  aiProviders.value.map((p) => ({
    value: p.id,
    label: p.configured ? p.name : `${p.name}（未配置 Key）`,
    disabled: !p.configured,
  })),
)

const aiModelOptions = computed<SelectOption[]>(() =>
  (currentProvider.value?.models ?? []).map((m) => ({
    value: m.id,
    label: m.label,
  })),
)

const expertSelectGroups = computed<SelectGroup[]>(() => {
  const groups: SelectGroup[] = [
    {
      label: '解析方式',
      options: [{ value: 'none', label: '通用解析（不指定名师）' }],
    },
  ]
  if (recommendedExperts.value.length) {
    groups.push({
      label: '推荐（本模块擅长）',
      options: recommendedExperts.value.map((e) => ({
        value: e.id,
        label: `${e.name} · ${e.specialty}`,
      })),
    })
  }
  if (otherExperts.value.length) {
    groups.push({
      label: '其他名师',
      options: otherExperts.value.map((e) => ({
        value: e.id,
        label: `${e.name} · ${e.specialty}`,
      })),
    })
  }
  return groups
})

async function loadExperts(moduleId: string) {
  try {
    const res = await api.getExperts(moduleId)
    experts.value = res.experts
    const recommended = res.experts.find((e) => e.recommended)
    selectedExpertId.value = recommended?.id ?? 'none'
  } catch {
    experts.value = []
    selectedExpertId.value = 'none'
  }
}

const configuredProviderHint = computed(() => {
  const names = aiProviders.value.filter((p) => p.configured).map((p) => p.name)
  return names.length ? names.join('、') : '未配置'
})

watch(selectedAiProvider, (id) => {
  const p = aiProviders.value.find((x) => x.id === id)
  if (p?.configured) aiModel.value = p.defaultModel
})

watch(selectedModuleId, (id) => {
  selectedTopicId.value = ''
  loadExperts(id)
})

watch(appMode, (mode) => {
  if (mode === 'vocab') loadVocabList()
  if (mode === 'history') void historyPanelRef.value?.refresh()
})

async function loadVocabMeta() {
  const [stats, cats] = await Promise.all([
    api.getVocabStats(),
    api.getVocabCategories(),
  ])
  vocabLibraryTotal.value = stats.total
  vocabCategories.value = cats.categories
}

async function loadVocabList() {
  const categoryId = selectedVocabCategory.value || undefined
  const keyword = vocabKeyword.value.trim() || undefined
  const res = await api.listVocab({
    categoryId,
    keyword,
    page: 1,
    pageSize: 1000,
  })
  vocabList.value = res.items
  vocabFilteredTotal.value = res.total
}

onMounted(async () => {
  try {
    const [modRes, health, aiCfg] = await Promise.all([
      api.getModules(),
      api.health(),
      api.getAiConfig().catch(() => null),
      loadVocabMeta(),
    ])
    modules.value = modRes.modules
    aiConfigured.value = aiCfg?.anyConfigured ?? health.aiConfigured ?? false
    aiProviders.value = aiCfg?.providers ?? health.providers ?? []
    const firstConfigured = aiProviders.value.find((p) => p.configured)
    selectedAiProvider.value =
      firstConfigured?.id ?? aiCfg?.defaultProviderId ?? health.defaultProviderId ?? 'deepseek'
    aiModel.value = firstConfigured?.defaultModel ?? aiCfg?.defaultModel ?? ''
    await loadExperts(selectedModuleId.value)
    await loadVocabList()
  } catch {
    showToast('无法连接后端，请确认 server 已启动')
  }
})

async function runGenerate(generateFn: (signal: AbortSignal) => Promise<void>) {
  // 新一轮生成：取消上一轮，但不误伤本次
  if (generateAbort) {
    generateAbort.abort()
  }
  const runId = ++generateRunId
  const controller = new AbortController()
  generateAbort = controller
  cancelRequested.value = false
  showCancelBtn.value = false

  loading.value = true
  resetOutput()
  setLoading('正在生成题目…', 'AI 命题中，请稍候')
  await nextTick()

  // 延迟显示取消按钮，避免与「生成」点击冲突
  const cancelTimer = window.setTimeout(() => {
    if (runId === generateRunId && loading.value) {
      showCancelBtn.value = true
      loadingSubMessage.value = '如需停止可点击下方「取消」'
    }
  }, 400)

  try {
    await generateFn(controller.signal)
  } catch (err) {
    if (runId !== generateRunId) return
    if (isAbortError(err) || (err instanceof Error && err.message === '已取消')) {
      if (cancelRequested.value) showToast('已取消生成')
      return
    }
    showToast(err instanceof Error ? err.message : '生成失败')
  } finally {
    clearTimeout(cancelTimer)
    if (runId === generateRunId) {
      loading.value = false
      loadingSubMessage.value = ''
      showCancelBtn.value = false
      generateAbort = null
    }
  }
}

async function handleGenerate() {
  await runGenerate(async (signal) => {
    const res = await api.generateQuestions({
      moduleId: selectedModuleId.value,
      topicId: selectedTopicId.value || undefined,
      count: count.value,
      difficulty: difficulty.value,
      aiProvider: selectedAiProvider.value,
      aiModel: aiModel.value || undefined,
      expertId: selectedExpertId.value !== 'none' ? selectedExpertId.value : undefined,
    }, { signal })
    questions.value = res.questions
    source.value = res.source
    sourceMode.value = res.mode ?? ''
    activeAiModel.value = res.aiModel ?? ''
    activeAiProvider.value = res.aiProvider ?? selectedAiProvider.value
    activeExpertTag.value = res.expertTag ?? questions.value.find((q) => q.expertTag)?.expertTag ?? ''

    setLoading('正在准备发布文案…', '即将完成，也可取消')
    const xhs = await api.prepareXhs(res.questions, { signal, source: 'ai' })
    applyPrepareResult(xhs)
    void historyPanelRef.value?.refresh()

    const topicHint = res.topic ? `（${res.topic.name}）` : ''
    const prevHint = xhs.previousDayQuestions.length
      ? `，已附带昨日 ${xhs.previousDayQuestions.length} 题答案`
      : ''
    showToast(`已生成 ${questions.value.length} 道题${topicHint}${prevHint}`)
    void prefetchCoverPreviews()
  })
}

async function handleVocabGenerate() {
  await runGenerate(async (signal) => {
    const res = await api.generateVocab({
      count: count.value,
      categoryId: selectedVocabCategory.value || undefined,
      mode: 'quiz',
    })
    questions.value = res.questions ?? []
    source.value = 'vocab'
    sourceMode.value = 'vocab-random'

    setLoading('正在准备发布文案…')
    const xhs = await api.prepareXhs(questions.value, { signal, source: 'vocab' })
    applyPrepareResult(xhs)
    void historyPanelRef.value?.refresh()

    const prevHint = xhs.previousDayQuestions.length
      ? `，已附带昨日 ${xhs.previousDayQuestions.length} 题答案`
      : ''
    showToast(`已随机抽取 ${questions.value.length} 道词汇题${prevHint}`)
    void prefetchCoverPreviews()
  })
}

async function handleVocabCategory(id: string) {
  selectedVocabCategory.value = id
  vocabKeyword.value = ''
  vocabWebLookup.value = null
  await loadVocabList()
}

async function handleVocabSearch(keyword: string) {
  vocabKeyword.value = keyword
  vocabWebLookup.value = null
  await loadVocabList()
}

async function handleVocabWebSearch(keyword: string) {
  const q = keyword.trim()
  if (!q) {
    showToast('请输入要查询的词语')
    return
  }
  vocabWebLoading.value = true
  vocabWebLookup.value = null
  try {
    const result = await api.webLookupVocab(q)
    vocabWebLookup.value = result
    if (result.local.length) {
      vocabList.value = result.local
      vocabFilteredTotal.value = result.local.length
    }
    if (result.web) {
      showToast(`已查到「${result.web.word}」在线释义`)
    } else if (result.local.length) {
      showToast(`库内找到 ${result.local.length} 条，在线释义未返回`)
    } else {
      showToast('库内无匹配，请使用下方外链继续查')
    }
  } catch (err) {
    showToast(err instanceof Error ? err.message : '联网查词失败')
  } finally {
    vocabWebLoading.value = false
  }
}

async function ensureImages(platform: ImagePlatform): Promise<GeneratedImage[]> {
  if (!post.value || !questions.value.length) {
    throw new Error('请先生成题目')
  }
  const cache = platform === 'xhs' ? xhsImages : douyinImages
  if (cache.value.length) return cache.value

  const generated = await generatePlatformImages(questions.value, post.value, platform, {
    answerQuestions: includeTodayAnswers.value ? [] : previousDayQuestions.value,
    answerDate: previousDayDate.value ?? undefined,
    includeTodayAnswers: includeTodayAnswers.value,
  })
    const date = new Date().toISOString().slice(0, 10)
    if (platform === 'xhs') {
      xhsImages.value = generated
      xhsZipName.value = `考公小红书配图-${date}.zip`
    } else {
      douyinImages.value = generated
      douyinZipName.value = `考公抖音配图-${date}.zip`
    }
    return generated
}

async function handleNeedPlatformImages(platform: ImagePlatform) {
  if (!post.value || !questions.value.length) return
  const cache = platform === 'xhs' ? xhsImages : douyinImages
  if (cache.value.length || imageLoading.value) return

  imageLoading.value = true
  loadingPlatform.value = platform
  try {
    await ensureImages(platform)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '配图生成失败')
  } finally {
    imageLoading.value = false
    loadingPlatform.value = null
  }
}

async function prefetchCoverPreviews() {
  if (!post.value || !questions.value.length) return
  await handleNeedPlatformImages('xhs')
}

async function handleDownloadPlatform(platform: ImagePlatform) {
  if (!post.value || !questions.value.length) return
  publishing.value = true
  setLoading(`正在生成${platform === 'xhs' ? '小红书' : '抖音'}配图…`, '图片渲染中，请稍候')
  loading.value = true
  try {
    const imgs = await ensureImages(platform)
    const name = await downloadImagesAsZip(imgs, platform)
    showToast(`已下载 ${name}（${getDownloadFolderHint()}）`, 5000)
  } catch (err) {
    showToast(err instanceof Error ? err.message : '图片生成失败')
  } finally {
    publishing.value = false
    loading.value = false
  }
}

async function handleDownloadOne(img: GeneratedImage) {
  downloadSingleImage(img)
  showToast(`已下载 ${img.filename}`)
}

async function handlePublishPlatform(platform: ImagePlatform) {
  if (!post.value || !questions.value.length) return
  publishing.value = true
  setLoading(`正在准备${platform === 'xhs' ? '小红书' : '抖音'}发布…`, '生成配图并复制文案')
  loading.value = true
  try {
    const text = platform === 'xhs' ? copyText.value : douyinCopyText.value
    const url = platform === 'xhs' ? creatorUrl.value : douyinCreatorUrl.value
    const label = platform === 'xhs' ? '小红书' : '抖音'

    await copyToClipboard(text)
    const imgs = await ensureImages(platform)
    const name = await downloadImagesAsZip(imgs, platform)
    await delay(800)

    if (platform === 'xhs') openXhsCreator(url)
    else openDouyinCreator(url)

    showToast(
      `文案已复制，${name} 已下载，${label}创作中心已打开`,
      6000,
    )
  } catch (err) {
    showToast(err instanceof Error ? err.message : '发布准备失败')
  } finally {
    publishing.value = false
    loading.value = false
  }
}

async function handleCopyXhs() {
  try {
    await copyToClipboard(copyText.value)
    showToast('小红书文案已复制')
  } catch {
    showToast('复制失败')
  }
}

async function handleCopyDouyin() {
  try {
    await copyToClipboard(douyinCopyText.value)
    showToast('抖音文案已复制')
  } catch {
    showToast('复制失败')
  }
}

async function handleHistoryView(id: number) {
  loading.value = true
  setLoading('正在加载历史题目…', '准备发布文案')
  try {
    const xhs = await api.prepareHistorySet(id)
    applyPrepareResult(xhs)
    loadedHistoryId.value = id
    source.value = xhs.questions[0]?.type === 'vocab' ? 'vocab' : 'ai'
    sourceMode.value = 'history'

    const prevHint = xhs.previousDayQuestions.length
      ? `，文案已含昨日 ${xhs.previousDayQuestions.length} 题答案`
      : ''
    showToast(`已加载历史 #${id}，共 ${xhs.questions.length} 题${prevHint}`)
    void prefetchCoverPreviews()
    await nextTick()
    document.getElementById('loaded-questions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  } catch (err) {
    showToast(err instanceof Error ? err.message : '加载失败')
  } finally {
    loading.value = false
    loadingSubMessage.value = ''
  }
}
</script>

<template>
  <el-container class="app">
    <LoadingOverlay
      :visible="loading"
      :message="loadingMessage"
      :sub-message="loadingSubMessage"
      :cancellable="showCancelBtn"
      @cancel="handleCancelGenerate"
    />

    <el-header class="header" height="auto">
      <div class="header-inner">
        <div class="brand">
          <el-avatar class="logo" :size="48" shape="square">公</el-avatar>
          <div>
            <h1>考公助手</h1>
            <el-text type="info">自动生成题目 · 一键发布小红书 / 抖音</el-text>
          </div>
        </div>
        <el-tag
          class="ai-badge"
          :type="aiConfigured ? 'danger' : 'info'"
          effect="plain"
          round
        >
          {{ aiConfigured ? `AI 已配置 · ${configuredProviderHint}` : '请配置 AI Key' }}
        </el-tag>
      </div>
    </el-header>

    <el-main class="main">
      <div class="page-shell">
        <ModeTabs v-model="appMode" />
        <div class="page-shell-body">
      <template v-if="appMode === 'exam'">
        <el-card class="panel panel-in-shell" shadow="never">
          <template #header>
            <span class="panel-title">选择考公模块</span>
          </template>
          <ModuleSelector
            :modules="examModules"
            :selected-id="selectedModuleId"
            @select="selectedModuleId = $event"
          />
          <TopicSelector
            v-if="currentTopics.length"
            :topics="currentTopics"
            :selected-id="selectedTopicId"
            @select="selectedTopicId = $event"
          />

          <el-form label-position="top" class="controls" @submit.prevent="handleGenerate">
            <div class="controls-basic">
              <el-form-item label="题目数量" class="control-item">
                <el-select v-model="count" size="large" :disabled="loading" class="control-select">
                    <el-option
                      v-for="opt in countOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
              </el-form-item>
              <el-form-item label="难度" class="control-item">
                <el-select v-model="difficulty" size="large" :disabled="loading" class="control-select">
                    <el-option
                      v-for="opt in difficultyOptions"
                      :key="opt.value"
                      :label="opt.label"
                      :value="opt.value"
                    />
                  </el-select>
              </el-form-item>
            </div>

            <el-card v-if="showAiOptions" shadow="never" class="controls-ai panel-nested">
              <template #header>
                <span class="controls-ai-title">AI 设置</span>
              </template>
              <div class="controls-ai-grid">
                <el-form-item label="AI 提供商" class="control-item">
                  <el-select
                    v-model="selectedAiProvider"
                    size="large"
                    :disabled="loading"
                    class="control-select"
                  >
                      <el-option
                        v-for="opt in aiProviderOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                        :disabled="opt.disabled"
                      />
                    </el-select>
                </el-form-item>
                <el-form-item label="AI 模型" class="control-item">
                  <el-select
                    v-model="aiModel"
                    size="large"
                    :disabled="loading || !currentProvider?.configured"
                    class="control-select"
                  >
                      <el-option
                        v-for="opt in aiModelOptions"
                        :key="opt.value"
                        :label="opt.label"
                        :value="opt.value"
                      />
                    </el-select>
                </el-form-item>
                <el-form-item label="解析风格" class="control-item control-item--full">
                  <el-select
                    v-model="selectedExpertId"
                    size="large"
                    :disabled="loading"
                    class="control-select"
                  >
                      <el-option-group
                        v-for="group in expertSelectGroups"
                        :key="group.label"
                        :label="group.label"
                      >
                        <el-option
                          v-for="opt in group.options"
                          :key="opt.value"
                          :label="opt.label"
                          :value="opt.value"
                        />
                      </el-option-group>
                    </el-select>
                </el-form-item>
              </div>
            </el-card>

            <el-alert
              v-if="!aiConfigured"
              type="warning"
              :closable="false"
              show-icon
              title="请在 server/.env 中配置 DEEPSEEK_API_KEY 等后再生成题目"
              class="ai-hint"
            />
            <el-button
              type="primary"
              size="large"
              :disabled="loading || !aiConfigured"
              :loading="loading"
              class="generate-btn"
              @click="handleGenerate"
            >
              ✨ AI 按考点生成题目
            </el-button>
          </el-form>
        </el-card>
      </template>

      <template v-else-if="appMode === 'history'">
        <HistoryPanel
          ref="historyPanelRef"
          :active-id="loadedHistoryId"
          @view="handleHistoryView"
        />
      </template>

      <template v-else>
        <VocabPanel
          v-model:keyword="vocabKeyword"
          v-model:count="count"
          :categories="vocabCategories"
          :selected-category-id="selectedVocabCategory"
          :vocab-list="vocabList"
          :library-total="vocabLibraryTotal"
          :filtered-total="vocabFilteredTotal"
          :loading="loading"
          :web-loading="vocabWebLoading"
          :web-lookup="vocabWebLookup"
          :count-options="countOptions"
          @select-category="handleVocabCategory"
          @search="handleVocabSearch"
          @web-search="handleVocabWebSearch"
          @generate="handleVocabGenerate"
        />
      </template>
        </div>
      </div>

      <template v-if="questions.length">
        <div id="loaded-questions" class="content-grid">
          <div class="content-main">
            <div class="questions">
              <div class="section-head">
                <h2>题目列表</h2>
                <el-tag v-if="loadedHistoryId" type="info" effect="plain" round>
                  历史 #{{ loadedHistoryId }}
                </el-tag>
                <el-tag v-if="sourceLabel" type="danger" effect="plain" round>
                  {{ sourceLabel }}
                </el-tag>
              </div>
              <QuestionCard
                v-for="(q, i) in questions"
                :key="q.id"
                :question="q"
                :index="i"
              />
            </div>
          </div>
          <aside v-if="post" class="content-side">
            <PublishPanel
              :post="post"
              :publishing="publishing"
              :previous-day-date="previousDayDate"
              :previous-day-count="previousDayQuestions.length"
              :xhs-image-count="xhsImages.length"
              :douyin-image-count="douyinImages.length"
              @copy-xhs="handleCopyXhs"
              @copy-douyin="handleCopyDouyin"
              @download-xhs="handleDownloadPlatform('xhs')"
              @download-douyin="handleDownloadPlatform('douyin')"
              @publish-xhs="handlePublishPlatform('xhs')"
              @publish-douyin="handlePublishPlatform('douyin')"
            />
          </aside>
        </div>
        <ImageGallery
          v-if="post"
          :xhs-images="xhsImages"
          :douyin-images="douyinImages"
          :xhs-zip-name="xhsZipName"
          :douyin-zip-name="douyinZipName"
          :image-loading="imageLoading"
          :loading-platform="loadingPlatform"
          @download-zip="handleDownloadPlatform"
          @download-one="handleDownloadOne"
          @need-images="handleNeedPlatformImages"
        />
      </template>

      <el-empty
        v-else-if="!loading && appMode !== 'history'"
        :description="appMode === 'exam' ? '选择模块和考点后点击「AI 按考点生成题目」' : appMode === 'vocab' ? '浏览词汇库，或点击「生成词汇题」开始' : '切换到刷题或词汇页生成题目'"
        class="empty"
      >
        <template #image>
          <span class="empty-emoji">{{ appMode === 'exam' ? '👆' : '📖' }}</span>
        </template>
        <el-text type="info" size="small">
          全部模块 AI 出题 · 700 高频词 · 小红书 / 抖音双平台发布
        </el-text>
      </el-empty>
    </el-main>
  </el-container>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  flex-direction: column;
}

.header {
  padding: 20px 16px 0;
  height: auto !important;
}

.main {
  padding: 16px 16px 48px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  background: var(--el-color-primary) !important;
  color: #fff;
  font-size: 22px;
  font-weight: 800;
  flex-shrink: 0;
}

h1 {
  font-size: 22px;
  font-weight: 800;
  line-height: 1.3;
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px 16px;
  width: 100%;
}

.ai-badge {
  margin-left: auto;
  flex-shrink: 0;
}

@media (max-width: 576px) {
  .header-inner {
    flex-wrap: wrap;
  }

  .ai-badge {
    margin-left: auto;
  }
}

.page-shell {
  width: 100%;
  margin-bottom: 24px;
  background: #fff;
  border: 1px solid var(--ui-border, #e8e8ec);
  border-radius: var(--ui-radius, 12px);
  box-shadow: var(--ui-shadow);
  overflow: hidden;
}

.page-shell-body :deep(.panel-in-shell),
.page-shell-body :deep(.vocab-panel) {
  margin-bottom: 0;
  border: none !important;
  box-shadow: none !important;
  border-radius: 0 !important;
}

.panel {
  margin-bottom: 24px;
  border: none;
  box-shadow: var(--shadow);
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
}

.controls {
  margin-top: 16px;
}

.controls-basic {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
  margin-bottom: 20px;
}

@media (max-width: 576px) {
  .controls-basic {
    grid-template-columns: 1fr;
  }
}

.control-item {
  margin-bottom: 0;
}

.control-select {
  width: 100%;
}

.controls-ai {
  margin-bottom: 16px;
}

.controls-ai-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.controls-ai-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 16px;
}

.control-item--full {
  grid-column: 1 / -1;
}

@media (max-width: 720px) {
  .controls-ai-grid {
    grid-template-columns: 1fr;
  }

  .control-item--full {
    grid-column: auto;
  }
}

.ai-hint {
  margin-bottom: 16px;
}

.generate-btn {
  width: 100%;
}

@media (min-width: 576px) {
  .generate-btn {
    width: auto;
    min-width: 200px;
  }
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
  gap: 24px;
  align-items: start;
  margin-bottom: 24px;
}

.content-main {
  min-width: 0;
}

.content-side {
  min-width: 0;
}

/* 与 ui.css 中 --layout-stack-bp 保持一致 */
@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.section-head h2 {
  font-size: 18px;
}

.empty {
  padding: 48px 20px;
}

.empty-emoji {
  font-size: 48px;
}
</style>
