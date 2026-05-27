<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { api } from '@/api'
import ModuleSelector from '@/components/ModuleSelector.vue'
import TopicSelector from '@/components/TopicSelector.vue'
import VocabPanel from '@/components/VocabPanel.vue'
import QuestionCard from '@/components/QuestionCard.vue'
import PublishPanel from '@/components/PublishPanel.vue'
import ImageGallery from '@/components/ImageGallery.vue'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import type {
  AiProviderId,
  AiProviderOption,
  AppMode,
  ExamModule,
  ExamPoint,
  GenerationMode,
  Question,
  VocabCategory,
  VocabItem,
  XhsPostContent,
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
const source = ref<'ai' | 'template' | 'public-api' | 'parametric' | null>(null)
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
const generationMode = ref<GenerationMode>('public')
const toast = ref('')
const xhsImages = ref<GeneratedImage[]>([])
const douyinImages = ref<GeneratedImage[]>([])
const xhsZipName = ref('考公小红书配图.zip')
const douyinZipName = ref('考公抖音配图.zip')
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
const vocabTotal = ref(0)
const selectedVocabCategory = ref('')
const vocabKeyword = ref('')
const vocabList = ref<VocabItem[]>([])

function showToast(msg: string, duration = 3000) {
  toast.value = msg
  setTimeout(() => (toast.value = ''), duration)
}

function setLoading(msg: string, sub = '') {
  loadingMessage.value = msg
  loadingSubMessage.value = sub
}

function resetOutput() {
  post.value = null
  questions.value = []
  source.value = null
  sourceMode.value = ''
  revokeImageUrls(xhsImages.value)
  revokeImageUrls(douyinImages.value)
  xhsImages.value = []
  douyinImages.value = []
}

const sourceLabel = computed(() => {
  if (source.value === 'ai') {
    const p = aiProviders.value.find((x) => x.id === (activeAiProvider.value as AiProviderId))
    const tag = p?.name ? `${p.name}/` : ''
    return activeAiModel.value ? `AI 生成 (${tag}${activeAiModel.value})` : 'AI 实时生成'
  }
  if (sourceMode.value === 'public-api-ai-hybrid') return '公共数据 + AI 补全'
  if (source.value === 'public-api') return '公共数据接口'
  if (sourceMode.value === 'public-api-mixed') return '公共数据 + 随机变式'
  if (source.value === 'parametric' || sourceMode.value === 'parametric') return '随机变式（每次不同）'
  if (sourceMode.value === 'vocab-random') return '词汇随机抽取'
  return source.value === 'template' ? '内置题库' : ''
})

const showAiOptions = computed(() => aiConfigured.value && generationMode.value !== 'public')

const currentProvider = computed(() =>
  aiProviders.value.find((p) => p.id === selectedAiProvider.value),
)

const aiModels = computed(() => currentProvider.value?.models ?? [])

const configuredProviderHint = computed(() => {
  const names = aiProviders.value.filter((p) => p.configured).map((p) => p.name)
  return names.length ? names.join('、') : '未配置'
})

watch(selectedAiProvider, (id) => {
  const p = aiProviders.value.find((x) => x.id === id)
  if (p?.configured) aiModel.value = p.defaultModel
})

watch(selectedModuleId, () => {
  selectedTopicId.value = ''
})

watch(appMode, (mode) => {
  resetOutput()
  if (mode === 'vocab') loadVocabList()
})

async function loadVocabMeta() {
  const [stats, cats] = await Promise.all([
    api.getVocabStats(),
    api.getVocabCategories(),
  ])
  vocabTotal.value = stats.total
  vocabCategories.value = cats.categories
}

async function loadVocabList() {
  const res = await api.listVocab({
    categoryId: selectedVocabCategory.value || undefined,
    keyword: vocabKeyword.value || undefined,
    page: 1,
  })
  vocabList.value = res.items
  vocabTotal.value = res.total
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
  setLoading('正在生成题目…', '拉取公共数据 / AI 命题中，请稍候')
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
      generationMode: generationMode.value,
      aiProvider: selectedAiProvider.value,
      aiModel: showAiOptions.value && aiModel.value ? aiModel.value : undefined,
    }, { signal })
    questions.value = res.questions
    source.value = res.source
    sourceMode.value = res.mode ?? ''
    activeAiModel.value = res.aiModel ?? ''
    activeAiProvider.value = res.aiProvider ?? selectedAiProvider.value

    setLoading('正在准备发布文案…', '即将完成，也可取消')
    const xhs = await api.prepareXhs(res.questions, { signal })
    post.value = xhs.post
    copyText.value = xhs.copyText
    douyinCopyText.value = xhs.douyinCopyText
    creatorUrl.value = xhs.creatorUrl
    douyinCreatorUrl.value = xhs.douyinCreatorUrl

    const topicHint = res.topic ? `（${res.topic.name}）` : ''
    showToast(`已生成 ${questions.value.length} 道题${topicHint}`)
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
    source.value = 'template'
    sourceMode.value = 'vocab-random'

    setLoading('正在准备发布文案…')
    const xhs = await api.prepareXhs(questions.value, { signal })
    post.value = xhs.post
    copyText.value = xhs.copyText
    douyinCopyText.value = xhs.douyinCopyText
    creatorUrl.value = xhs.creatorUrl
    douyinCreatorUrl.value = xhs.douyinCreatorUrl

    showToast(`已随机抽取 ${questions.value.length} 道词汇题`)
  })
}

async function handleVocabCategory(id: string) {
  selectedVocabCategory.value = id
  await loadVocabList()
}

async function handleVocabSearch(keyword: string) {
  vocabKeyword.value = keyword
  await loadVocabList()
}

async function ensureImages(platform: ImagePlatform): Promise<GeneratedImage[]> {
  if (!post.value || !questions.value.length) {
    throw new Error('请先生成题目')
  }
  const cache = platform === 'xhs' ? xhsImages : douyinImages
  if (cache.value.length) return cache.value

  const generated = await generatePlatformImages(questions.value, post.value, platform)
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
</script>

<template>
  <div class="app">
    <LoadingOverlay
      :visible="loading"
      :message="loadingMessage"
      :sub-message="loadingSubMessage"
      :cancellable="showCancelBtn"
      @cancel="handleCancelGenerate"
    />

    <header class="header">
      <div class="brand">
        <span class="logo">公</span>
        <div>
          <h1>考公助手</h1>
          <p>自动生成题目 · 一键发布小红书 / 抖音</p>
        </div>
      </div>
      <span class="badge" :class="{ ai: aiConfigured }">
        {{ aiConfigured ? `AI 已配置 · ${configuredProviderHint}` : '公共数据模式' }}
      </span>
    </header>

    <main class="main">
      <div class="mode-tabs">
        <button :class="{ active: appMode === 'exam' }" @click="appMode = 'exam'">
          📝 模块刷题
        </button>
        <button :class="{ active: appMode === 'vocab' }" @click="appMode = 'vocab'">
          📖 700 高频词
        </button>
      </div>

      <template v-if="appMode === 'exam'">
        <section class="panel">
          <h2>选择考公模块</h2>
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
          <div class="controls">
            <label>
              题目数量
              <select v-model.number="count" :disabled="loading">
                <option v-for="n in 10" :key="n" :value="n">{{ n }} 道</option>
              </select>
            </label>
            <label>
              难度
              <select v-model="difficulty" :disabled="loading">
                <option value="easy">简单</option>
                <option value="medium">中等</option>
                <option value="hard">困难</option>
              </select>
            </label>
            <label>
              出题方式
              <select v-model="generationMode" :disabled="loading">
                <option value="public">公共数据（默认）</option>
                <option value="ai" :disabled="!aiConfigured">AI 命题</option>
                <option value="hybrid" :disabled="!aiConfigured">混合（公共 + AI 补全）</option>
              </select>
            </label>
            <label v-if="showAiOptions">
              AI 提供商
              <select v-model="selectedAiProvider" :disabled="loading">
                <option
                  v-for="p in aiProviders"
                  :key="p.id"
                  :value="p.id"
                  :disabled="!p.configured"
                >
                  {{ p.name }}{{ p.configured ? '' : '（未配置 Key）' }}
                </option>
              </select>
            </label>
            <label v-if="showAiOptions">
              AI 模型
              <select v-model="aiModel" :disabled="loading || !currentProvider?.configured">
                <option v-for="m in aiModels" :key="m.id" :value="m.id">
                  {{ m.label }}
                </option>
              </select>
            </label>
            <button class="generate-btn" :disabled="loading" @click="handleGenerate">
              <span v-if="loading" class="btn-spinner" />
              {{ loading ? '生成中…' : '✨ 按考点生成题目' }}
            </button>
          </div>
        </section>
      </template>

      <template v-else>
        <VocabPanel
          v-model:keyword="vocabKeyword"
          :categories="vocabCategories"
          :selected-category-id="selectedVocabCategory"
          :vocab-list="vocabList"
          :total="vocabTotal"
          :loading="loading"
          @select-category="handleVocabCategory"
          @search="handleVocabSearch"
          @generate="handleVocabGenerate"
        />
        <div class="controls vocab-controls">
          <label>
            题目数量
            <select v-model.number="count" :disabled="loading">
              <option v-for="n in 10" :key="n" :value="n">{{ n }} 道</option>
            </select>
          </label>
        </div>
      </template>

      <template v-if="questions.length">
        <div class="content-grid">
          <section class="questions">
            <div class="section-head">
              <h2>题目列表</h2>
              <span v-if="sourceLabel" class="source-tag">{{ sourceLabel }}</span>
            </div>
            <QuestionCard
              v-for="(q, i) in questions"
              :key="q.id"
              :question="q"
              :index="i"
            />
          </section>

          <PublishPanel
            :post="post"
            :publishing="publishing"
            :xhs-image-count="xhsImages.length"
            :douyin-image-count="douyinImages.length"
            @copy-xhs="handleCopyXhs"
            @copy-douyin="handleCopyDouyin"
            @download-xhs="handleDownloadPlatform('xhs')"
            @download-douyin="handleDownloadPlatform('douyin')"
            @publish-xhs="handlePublishPlatform('xhs')"
            @publish-douyin="handlePublishPlatform('douyin')"
          />
        </div>

        <ImageGallery
          v-if="xhsImages.length || douyinImages.length"
          :xhs-images="xhsImages"
          :douyin-images="douyinImages"
          :xhs-zip-name="xhsZipName"
          :douyin-zip-name="douyinZipName"
          @download-zip="handleDownloadPlatform"
          @download-one="handleDownloadOne"
        />
      </template>

      <div v-else-if="!loading" class="empty">
        <p v-if="appMode === 'exam'">👆 选择模块和考点后点击「按考点生成题目」</p>
        <p v-else>👆 浏览词汇库，或点击「生成词汇题」开始</p>
        <p class="sub">支持公共数据出题 · 700 高频词 · 小红书 / 抖音双平台发布</p>
      </div>
    </main>

    <Transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </Transition>
  </div>
</template>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.logo {
  width: 48px;
  height: 48px;
  background: var(--primary);
  color: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 800;
}

h1 {
  font-size: 24px;
  font-weight: 800;
}

.brand p {
  font-size: 14px;
  color: var(--text-secondary);
}

.badge {
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 20px;
  background: #f0f0f0;
  color: var(--text-secondary);
}

.badge.ai {
  background: var(--primary-light);
  color: var(--primary);
}

.mode-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.mode-tabs button {
  padding: 10px 20px;
  border-radius: 8px;
  background: var(--card);
  border: 2px solid var(--border);
  font-size: 15px;
  font-weight: 600;
}

.mode-tabs button.active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.vocab-controls {
  background: var(--card);
  border-radius: var(--radius);
  padding: 16px 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.panel {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.panel h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

.controls {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  margin-top: 20px;
  flex-wrap: wrap;
}

.controls label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  color: var(--text-secondary);
}

.controls select {
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 15px;
  min-width: 100px;
}

.generate-btn {
  padding: 10px 28px;
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}

.generate-btn:hover:not(:disabled) {
  background: #e01e3c;
}

.generate-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
  align-items: start;
}

.questions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.section-head h2 {
  font-size: 18px;
}

.source-tag {
  font-size: 12px;
  padding: 2px 10px;
  background: var(--primary-light);
  color: var(--primary);
  border-radius: 20px;
}

.empty {
  text-align: center;
  padding: 80px 20px;
  color: var(--text-secondary);
}

.empty p {
  font-size: 18px;
  margin-bottom: 8px;
}

.empty .sub {
  font-size: 14px;
}

.toast {
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 3000;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
