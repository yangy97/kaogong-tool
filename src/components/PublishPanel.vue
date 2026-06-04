<script setup lang="ts">
import { ref } from 'vue'
import type { XhsPostContent } from '@/types'
import { copyToClipboard } from '@/utils/xhsCard'

const props = defineProps<{
  post: XhsPostContent | null
  publishing: boolean
  previousDayDate?: string | null
  previousDayCount?: number
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

const titleCopied = ref(false)

async function handleCopyTitle() {
  if (!props.post?.title) return
  try {
    await copyToClipboard(props.post.title)
    titleCopied.value = true
    setTimeout(() => {
      titleCopied.value = false
    }, 2000)
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <el-card v-if="post" class="publish-panel" shadow="never">
    <template #header>
      <span class="panel-title">📤 一键发布</span>
    </template>

    <el-scrollbar max-height="240" class="preview-scroll">
      <div class="preview-box">
        <div class="title-row">
          <div class="title-block">
            <div class="title-label">发布标题</div>
            <div class="title">{{ post.title }}</div>
          </div>
          <el-button size="small" type="primary" plain @click="handleCopyTitle">
            {{ titleCopied ? '已复制' : '复制标题' }}
          </el-button>
        </div>
        <div class="body-label-row">
          <span class="body-label">正文预览</span>
          <el-text
            :type="post.body.length > 1000 ? 'warning' : 'info'"
            size="small"
          >
            {{ post.body.length }} / 1000 字
          </el-text>
        </div>
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
      v-if="previousDayCount"
      type="success"
      :closable="false"
      show-icon
      :title="`文案已包含昨日（${previousDayDate}）${previousDayCount} 题答案；今日题目答案明日揭晓。配图含昨日解析图 + 今日题目图。`"
      class="tip-alert"
    />

    <el-alert
      v-else
      type="warning"
      :closable="false"
      show-icon
      title="今日题目不含答案（明日揭晓）。首次发布无昨日答案段；从第二天起会自动附带前一日答案。"
      class="tip-alert"
    />

    <el-alert
      type="info"
      :closable="false"
      show-icon
      title="发布流程：复制标题 → 复制文案 → 下载 ZIP → 创作中心上传图片并粘贴。"
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

@media (max-width: 768px) {
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

.title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.title-block {
  flex: 1;
  min-width: 0;
}

.title-label,
.body-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.body-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.title {
  font-size: 15px;
  font-weight: 700;
  color: var(--el-color-primary);
  line-height: 1.4;
  word-break: break-all;
}

.title-row .el-button {
  flex-shrink: 0;
  margin-top: 14px;
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
