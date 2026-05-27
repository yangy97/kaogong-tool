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
  <aside v-if="post" class="publish-panel">
    <h3>📤 一键发布</h3>

    <div class="preview-box">
      <div class="title">{{ post.title }}</div>
      <pre class="body">{{ post.body.slice(0, 300) }}{{ post.body.length > 300 ? '…' : '' }}</pre>
      <div class="tags">
        <span v-for="tag in post.tags.slice(0, 6)" :key="tag" class="tag">#{{ tag }}</span>
      </div>
    </div>

    <div class="platform-block xhs">
      <div class="platform-head">
        <span class="platform-icon">📕</span>
        <div>
          <strong>小红书</strong>
          <p>3:4 竖图 · 暖色风格</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn secondary" @click="emit('copyXhs')">复制文案</button>
        <button class="btn secondary" :disabled="publishing" @click="emit('downloadXhs')">
          下载 ZIP
        </button>
        <button class="btn primary xhs-btn" :disabled="publishing" @click="emit('publishXhs')">
          {{ publishing ? '准备中…' : '一键发布小红书' }}
        </button>
      </div>
      <p v-if="xhsImageCount" class="ready">✅ 已生成 {{ xhsImageCount }} 张小红书配图</p>
    </div>

    <div class="platform-block douyin">
      <div class="platform-head">
        <span class="platform-icon">🎵</span>
        <div>
          <strong>抖音</strong>
          <p>9:16 竖图 · 深色高对比</p>
        </div>
      </div>
      <div class="actions">
        <button class="btn secondary" @click="emit('copyDouyin')">复制文案</button>
        <button class="btn secondary" :disabled="publishing" @click="emit('downloadDouyin')">
          下载 ZIP
        </button>
        <button class="btn primary douyin-btn" :disabled="publishing" @click="emit('publishDouyin')">
          {{ publishing ? '准备中…' : '一键发布抖音' }}
        </button>
      </div>
      <p v-if="douyinImageCount" class="ready">✅ 已生成 {{ douyinImageCount }} 张抖音配图</p>
    </div>

    <p class="tip">
      发布流程：复制文案 → 下载对应平台 ZIP → 打开创作中心上传图片并粘贴文案。
    </p>
  </aside>
</template>

<style scoped>
.publish-panel {
  background: var(--card);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  position: sticky;
  top: 24px;
}

h3 {
  font-size: 18px;
  margin-bottom: 16px;
}

.preview-box {
  background: var(--bg);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--primary);
}

.body {
  font-size: 12px;
  white-space: pre-wrap;
  color: var(--text-secondary);
  font-family: inherit;
  line-height: 1.5;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tag {
  font-size: 11px;
  color: var(--primary);
  background: var(--primary-light);
  padding: 2px 6px;
  border-radius: 4px;
}

.platform-block {
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
}

.platform-block.douyin {
  border-color: #333;
  background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%);
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
}

.platform-head p {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn {
  padding: 10px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.primary {
  color: #fff;
}

.btn.xhs-btn {
  background: var(--primary);
}

.btn.xhs-btn:hover:not(:disabled) {
  background: #e01e3c;
}

.btn.douyin-btn {
  background: linear-gradient(135deg, #1a1a2e, #16213e);
  border: 1px solid #00f2ea;
}

.btn.douyin-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #252540, #1e2a4a);
}

.btn.secondary {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
}

.ready {
  font-size: 12px;
  color: #2e7d32;
  margin-top: 8px;
}

.tip {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>
