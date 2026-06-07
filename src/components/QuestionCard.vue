<script setup lang="ts">
import type { Question } from '@/types'
import StemContent from './StemContent.vue'
import TuxingBlock from './TuxingBlock.vue'

defineProps<{
  question: Question
  index: number
}>()

const diffLabel: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

const diffType: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  easy: 'success',
  medium: 'info',
  hard: 'danger',
}
</script>

<template>
  <el-card class="question-card" shadow="never">
    <div class="question-head">
      <el-tag type="danger" effect="dark" round>#{{ index + 1 }}</el-tag>
      <el-tag v-if="question.expertTag" type="warning" size="small">
        {{ question.expertTag }}解析
      </el-tag>
      <el-tag v-if="question.topicName" type="primary" size="small" effect="plain">
        {{ question.topicName }}
      </el-tag>
      <el-tag v-if="question.tuxing" color="#f3e5f5" style="color: #7b1fa2; border: none" size="small">
        AI 图形
      </el-tag>
      <el-text type="info" size="small">{{ question.moduleName }}</el-text>
      <el-tag
        :type="diffType[question.difficulty] ?? 'info'"
        size="small"
        effect="plain"
        class="diff-tag"
      >
        {{ diffLabel[question.difficulty] }}
      </el-tag>
    </div>

    <StemContent :content="question.stem" class="stem" />

    <TuxingBlock v-if="question.tuxing" :tuxing="question.tuxing" />

    <ul v-else-if="question.options?.length" class="options">
      <li v-for="opt in question.options" :key="opt.key">
        <strong>{{ opt.key }}.</strong> {{ opt.text }}
      </li>
    </ul>

    <el-collapse class="answer-collapse">
      <el-collapse-item title="查看答案与解析" name="answer">
        <p><strong>答案：</strong>{{ question.answer }}</p>
        <p class="analysis"><strong>解析：</strong>{{ question.analysis }}</p>
      </el-collapse-item>
    </el-collapse>
  </el-card>
</template>

<style scoped>
.question-card {
  border: none;
  box-shadow: var(--shadow);
}

.question-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.diff-tag {
  margin-left: auto;
}

.stem {
  font-size: 16px;
  margin-bottom: 12px;
}

.options {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.options li {
  padding: 10px 14px;
  background: var(--bg);
  border-radius: 8px;
  font-size: 15px;
}

.answer-collapse {
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 4px;
}

.answer-collapse :deep(.el-collapse-item__header) {
  color: var(--el-color-primary);
  font-weight: 600;
  border: none;
}

.analysis {
  margin-top: 10px;
  color: var(--el-text-color-secondary);
  line-height: 1.7;
}
</style>
