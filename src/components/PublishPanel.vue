<script setup lang="ts">
import type { XhsPostContent } from '@/types'

defineProps<{
  post: XhsPostContent | null
  publishing: boolean
  xhsImageCount?: number
  douyinImageCount?: number
}>()

const emit = defineEmits<{
  copyXhs: []
  copyDouyin: []
  downloadXhs: []
  downloadDouyin: []
  publishXhs: []
  publishDouyin: []
}>()
</script>

<template>
  <el-card v-if="post" class="publish-panel" shadow="never">
    <template #header>
      <span class="panel-title">📤 一键发布</span>
    </template>

    <el-scrollbar max-height="200" class="preview-scroll">
      <div class="preview-box">
        <div class="title">{{ post.title }}</div>
        <pre class="body">{{ post.body.slice(0, 300) }}{{ post.body.length > 300 ? '…' : '' }}</pre>
        <div class="tags">
          <el-tag
            v-for="tag in post.tags.slice(0, 6)"
            :key="tag"
            type="danger"
            effect="plain"
            size="small"
          >
            #{{ tag }}
          </el-tag>
        </div>
      </div>
    </el-scrollbar>

    <el-card shadow="never" class="platform-block xhs-block">
      <div class="platform-head">
        <span class="platform-icon">📕</span>
        <div>
          <strong>小红书</strong>
          <el-text type="info" size="small" tag="p">3:4 竖图 · 暖色风格</el-text>
        </div>
      </div>
      <el-space direction="vertical" fill class="actions">
        <el-button @click="emit('copyXhs')">复制文案</el-button>
        <el-button :disabled="publishing" @click="emit('downloadXhs')">下载 ZIP</el-button>
        <el-button type="primary" :disabled="publishing" @click="emit('publishXhs')">
          {{ publishing ? '准备中…' : '一键发布小红书' }}
        </el-button>
      </el-space>
      <el-text v-if="xhsImageCount" type="success" size="small" class="ready">
        ✅ 已生成 {{ xhsImageCount }} 张小红书配图
      </el-text>
    </el-card>

    <el-card shadow="never" class="platform-block douyin-block">
      <div class="platform-head">
        <span class="platform-icon">🎵</span>
        <div>
          <strong>抖音</strong>
          <el-text type="info" size="small" tag="p">9:16 竖图 · 中心安全区 · 深色高对比</el-text>
        </div>
      </div>
      <el-space direction="vertical" fill class="actions">
        <el-button @click="emit('copyDouyin')">复制文案</el-button>
        <el-button :disabled="publishing" @click="emit('downloadDouyin')">下载 ZIP</el-button>
        <el-button class="douyin-btn" :disabled="publishing" @click="emit('publishDouyin')">
          {{ publishing ? '准备中…' : '一键发布抖音' }}
        </el-button>
      </el-space>
      <el-text v-if="douyinImageCount" type="success" size="small" class="ready">
        ✅ 已生成 {{ douyinImageCount }} 张抖音配图
      </el-text>
    </el-card>

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="发布流程：复制文案 → 下载对应平台 ZIP → 打开创作中心上传图片并粘贴文案。"
      class="tip-alert"
    />
  </el-card>
</template>

<style scoped>
.publish-panel {
  border: none;
  box-shadow: var(--shadow);
  position: sticky;
  top: 16px;
}

@media (max-width: 900px) {
  .publish-panel {
    position: static;
    top: auto;
  }
}

.panel-title {
  font-size: 18px;
  font-weight: 700;
}

.preview-scroll {
  margin-bottom: 16px;
}

.preview-box {
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
}

.title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--el-color-primary);
}

.body {
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--el-text-color-secondary);
  font-family: inherit;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.platform-block {
  margin-bottom: 12px;
}

.xhs-block {
  background: var(--el-fill-color-blank);
}

.douyin-block {
  background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%);
  border: 1px solid #ddd;
}

.platform-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.platform-icon {
  font-size: 24px;
}

.platform-head strong {
  font-size: 15px;
  display: block;
}

.actions {
  width: 100%;
}

.actions :deep(.el-space__item) {
  width: 100%;
}

.actions .el-button {
  width: 100%;
}

.douyin-btn {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1px solid #00f2ea;
  color: #fff;
}

.douyin-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #252540, #1e2a4a);
  color: #fff;
}

.ready {
  display: block;
  margin-top: 8px;
}

.tip-alert {
  margin-top: 4px;
}

.tip-alert :deep(.el-alert__title) {
  font-size: 12px;
  line-height: 1.5;
}
</style>
