<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { GeneratedImage, ImagePlatform } from '@/utils/xhsCard'
import { getPlatformLabel } from '@/utils/xhsCard'

const props = defineProps<{
  xhsImages: GeneratedImage[]
  douyinImages: GeneratedImage[]
  xhsZipName: string
  douyinZipName: string
  imageLoading?: boolean
  loadingPlatform?: ImagePlatform | null
}>()

const emit = defineEmits<{
  downloadZip: [platform: ImagePlatform]
  downloadOne: [img: GeneratedImage]
  needImages: [platform: ImagePlatform]
}>()

const activeTab = ref<ImagePlatform>('xhs')

const tabs: { id: ImagePlatform; label: string; desc: string }[] = [
  { id: 'xhs', label: '小红书风格', desc: '3:4 暖色' },
  { id: 'douyin', label: '抖音风格', desc: '9:16 深色' },
]

const activeImages = computed(() =>
  activeTab.value === 'xhs' ? props.xhsImages : props.douyinImages,
)

const previewUrls = computed(() => activeImages.value.map((img) => img.url))

const zipName = computed(() =>
  activeTab.value === 'xhs' ? props.xhsZipName : props.douyinZipName,
)

const pathHint = computed(() =>
  activeTab.value === 'xhs'
    ? '解压后在创作中心「上传图文」使用'
    : '在抖音创作中心「发布图文」上传',
)

const isActiveTabLoading = computed(
  () => !!props.imageLoading && props.loadingPlatform === activeTab.value,
)

function requestImagesIfNeeded(platform: ImagePlatform = activeTab.value) {
  const hasImages = platform === 'xhs' ? props.xhsImages.length : props.douyinImages.length
  if (!hasImages && !(props.imageLoading && props.loadingPlatform === platform)) {
    emit('needImages', platform)
  }
}

function selectTab(id: ImagePlatform) {
  activeTab.value = id
  requestImagesIfNeeded(id)
}

onMounted(() => {
  requestImagesIfNeeded('xhs')
})

watch(
  () => [props.xhsImages.length, props.douyinImages.length] as const,
  () => {
    if (!activeImages.value.length) {
      requestImagesIfNeeded(activeTab.value)
    }
  },
)
</script>

<template>
  <el-card class="gallery" shadow="never">
    <template #header>
      <div class="gallery-head">
        <span>🖼️ 配图预览</span>
        <el-text v-if="activeImages.length" type="info" size="small">
          点击缩略图可放大查看
        </el-text>
      </div>
    </template>

    <div class="tabs-bar-wrap">
      <el-tabs
        v-model="activeTab"
        class="app-tabs"
        @tab-change="(name: ImagePlatform) => selectTab(name)"
      >
        <el-tab-pane v-for="tab in tabs" :key="tab.id" :name="tab.id">
          <template #label>
            <span class="tab-label">{{ tab.label }}</span>
            <el-text type="info" size="small" class="tab-desc">{{ tab.desc }}</el-text>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div v-if="isActiveTabLoading" class="loading-tab">
      <el-skeleton :rows="2" animated />
      <el-text type="info">正在生成{{ getPlatformLabel(activeTab) }}配图…</el-text>
    </div>

    <template v-else-if="activeImages.length">
      <div class="tab-actions">
        <el-text type="info">{{ activeImages.length }} 张</el-text>
        <el-button
          type="primary"
          :class="{ 'douyin-zip': activeTab === 'douyin' }"
          @click="emit('downloadZip', activeTab)"
        >
          下载{{ getPlatformLabel(activeTab) }} ZIP
        </el-button>
      </div>
      <el-text type="info" size="small" class="path-hint">
        文件名：<el-text tag="code">{{ zipName }}</el-text> → {{ pathHint }}
      </el-text>

      <el-row :gutter="12" class="image-grid">
        <el-col
          v-for="(img, index) in activeImages"
          :key="img.filename"
          :xs="12"
          :sm="8"
          :md="6"
        >
          <el-card shadow="hover" class="thumb-card" :body-style="{ padding: '0' }">
            <el-image
              :src="img.url"
              :alt="img.label"
              fit="cover"
              class="thumb-image"
              :class="activeTab === 'xhs' ? 'ratio-xhs' : 'ratio-douyin'"
              :preview-src-list="previewUrls"
              :initial-index="index"
              preview-teleported
              hide-on-click-modal
            />
            <div class="thumb-footer">
              <el-text size="small" truncated>{{ img.label }}</el-text>
              <el-button
                type="primary"
                link
                size="small"
                @click.stop="emit('downloadOne', img)"
              >
                下载
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <div v-else class="empty-tab">
      <el-empty description="当前平台配图尚未生成" :image-size="72">
        <el-button type="primary" @click="requestImagesIfNeeded(activeTab)">
          生成{{ getPlatformLabel(activeTab) }}预览
        </el-button>
      </el-empty>
    </div>
  </el-card>
</template>

<style scoped>
.gallery {
  margin-top: 24px;
  border: none;
  box-shadow: var(--shadow);
}

.gallery-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  font-size: 18px;
  font-weight: 700;
}

.tab-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.douyin-zip {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1px solid #00f2ea;
}

.douyin-zip:hover {
  background: linear-gradient(135deg, #252540, #1e2a4a);
}

.path-hint {
  display: block;
  margin-bottom: 16px;
}

.path-hint code {
  font-family: inherit;
}

.image-grid {
  margin-top: 4px;
}

.thumb-card {
  margin-bottom: 12px;
}

.thumb-image {
  width: 100%;
  display: block;
  cursor: zoom-in;
}

.thumb-image.ratio-xhs {
  aspect-ratio: 3 / 4;
}

.thumb-image.ratio-douyin {
  aspect-ratio: 9 / 16;
}

.thumb-footer {
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.loading-tab,
.empty-tab {
  text-align: center;
  padding: 32px 20px;
}
</style>
