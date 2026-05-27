<script setup lang="ts">
import type { Question } from '@/types'

defineProps<{
  question: Question
  index: number
}>()

const diffLabel: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}
</script>

<template>
  <article class="question-card">
    <header>
      <span class="index">#{{ index + 1 }}</span>
      <span v-if="question.topicName" class="topic">{{ question.topicName }}</span>
      <span class="module">{{ question.moduleName }}</span>
      <span class="diff" :data-level="question.difficulty">
        {{ diffLabel[question.difficulty] }}
      </span>
    </header>

    <p class="stem">{{ question.stem }}</p>

    <ul v-if="question.options?.length" class="options">
      <li v-for="opt in question.options" :key="opt.key">
        <strong>{{ opt.key }}.</strong> {{ opt.text }}
      </li>
    </ul>

    <details class="answer-block">
      <summary>查看答案与解析</summary>
      <p><strong>答案：</strong>{{ question.answer }}</p>
      <p><strong>解析：</strong>{{ question.analysis }}</p>
    </details>
  </article>
</template>

<style scoped>
.question-card {
  background: var(--card);
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);
}

header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.index {
  background: var(--primary);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 20px;
}

.module {
  font-size: 14px;
  color: var(--text-secondary);
}

.topic {
  font-size: 12px;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1565c0;
  border-radius: 4px;
}

.diff {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 20px;
  background: #f0f0f0;
}

.diff[data-level='easy'] {
  background: #e8f5e9;
  color: #2e7d32;
}

.diff[data-level='hard'] {
  background: #fce4ec;
  color: #c62828;
}

.stem {
  font-size: 16px;
  line-height: 1.7;
  margin-bottom: 12px;
}

.options {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.options li {
  padding: 10px 14px;
  background: var(--bg);
  border-radius: 8px;
  font-size: 15px;
}

.answer-block {
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.answer-block summary {
  cursor: pointer;
  color: var(--primary);
  font-weight: 600;
  font-size: 14px;
}

.answer-block p {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}
</style>
