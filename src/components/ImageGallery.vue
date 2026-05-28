<script setup lang="ts">
import { ref, watch } from 'vue'
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

function selectTab(id: ImagePlatform) {
  activeTab.value = id
  const hasImages = id === 'xhs' ? props.xhsImages.length : props.douyinImages.length
  if (!hasImages) {
    emit('needImages', id)
  }
}

watch(
  () => props.xhsImages.length,
  (len) => {
    if (len && !props.douyinImages.length && activeTab.value === 'douyin') {
      emit('needImages', 'douyin')
    }
  },
)
</script>

<template>
  <section v-if="xhsImages.length || douyinImages.length || imageLoading" class="gallery">
    <div class="gallery-head">
      <h3>🖼️ 配图预览</h3>
    </div>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab"
        :class="{ active: activeTab === tab.id }"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
        <span class="tab-desc">{{ tab.desc }}</span>
      </button>
    </div>

    <p v-if="imageLoading && loadingPlatform === activeTab" class="loading-tab">
      正在生成{{ getPlatformLabel(activeTab) }}配图…
    </p>

    <template v-else-if="activeTab === 'xhs' && xhsImages.length">
      <div class="tab-actions">
        <span>{{ xhsImages.length }} 张</span>
        <button class="zip-btn" @click="emit('downloadZip', 'xhs')">下载小红书 ZIP</button>
      </div>
      <p class="path-hint">文件名：<code>{{ xhsZipName }}</code> → 解压后在创作中心「上传图文」使用</p>
      <div class="grid xhs-grid">
        <figure v-for="img in xhsImages" :key="img.filename" class="thumb">
          <img :src="img.url" :alt="img.label" />
          <figcaption>
            <span>{{ img.label }}</span>
            <button @click="emit('downloadOne', img)">下载</button>
          </figcaption>
        </figure>
      </div>
    </template>

    <template v-else-if="activeTab === 'douyin' && douyinImages.length">
      <div class="tab-actions">
        <span>{{ douyinImages.length }} 张</span>
        <button class="zip-btn douyin" @click="emit('downloadZip', 'douyin')">下载抖音 ZIP</button>
      </div>
      <p class="path-hint">文件名：<code>{{ douyinZipName }}</code> → 在抖音创作中心「发布图文」上传</p>
      <div class="grid douyin-grid">
        <figure v-for="img in douyinImages" :key="img.filename" class="thumb">
          <img :src="img.url" :alt="img.label" />
          <figcaption>
            <span>{{ img.label }}</span>
            <button @click="emit('downloadOne', img)">下载</button>
          </figcaption>
        </figure>
      </div>
    </template>
  </section>
</template>

<style scoped>
.gallery {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  margin-top: 24px;
}

.gallery-head h3 {
  font-size: 18px;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  text-align: left;
  font-size: 14px;
  font-weight: 600;
}

.tab.active {
  border-color: var(--primary);
  background: var(--primary-light);
  color: var(--primary);
}

.tab-desc {
  display: block;
  font-size: 11px;
  font-weight: 400;
  color: var(--text-secondary);
  margin-top: 4px;
}

.tab-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-secondary);
}

.zip-btn {
  padding: 8px 16px;
  background: var(--primary);
  color: #fff;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
}

.zip-btn.douyin {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1px solid #00f2ea;
}

.path-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.path-hint code {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 6px;
  border-radius: 4px;
}

.grid {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.xhs-grid {
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}

.douyin-grid {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}

.thumb {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
}

.thumb img {
  width: 100%;
  display: block;
  object-fit: cover;
}

.xhs-grid .thumb img {
  aspect-ratio: 3/4;
}

.douyin-grid .thumb img {
  aspect-ratio: 9/16;
}

.thumb figcaption {
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
}

.thumb figcaption button {
  padding: 3px 6px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 10px;
  color: var(--primary);
}

.loading-tab {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-secondary);
  font-size: 14px;
}
</style>
