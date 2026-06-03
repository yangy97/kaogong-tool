<script setup lang="ts">
import type { AppMode } from '@/types'

const model = defineModel<AppMode>({ required: true })

const tabs: { id: AppMode; label: string; desc: string }[] = [
  { id: 'exam', label: '📝 模块刷题', desc: '按考点 AI 出题' },
  { id: 'vocab', label: '📖 700 高频词', desc: '词库 · 随机抽题' },
  { id: 'history', label: '📚 历史记录', desc: '存档 · 一键补发' },
]
</script>

<template>
  <div class="tabs-bar-wrap">
    <el-tabs v-model="model" class="app-tabs">
      <el-tab-pane v-for="tab in tabs" :key="tab.id" :name="tab.id">
        <template #label>
          <span class="tab-label">{{ tab.label }}</span>
          <el-text type="info" size="small" class="tab-desc">{{ tab.desc }}</el-text>
        </template>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

