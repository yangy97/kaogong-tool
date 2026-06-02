<script setup lang="ts">
import type { ExamPoint } from '@/types'

defineProps<{
  topics: ExamPoint[]
  selectedId: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div class="topic-section">
    <h3 class="topic-title">选择考点</h3>
    <div class="topic-grid">
      <button
        type="button"
        class="topic-chip"
        :class="{ active: selectedId === '' }"
        @click="emit('select', '')"
      >
        全部考点
      </button>
      <button
        v-for="topic in topics"
        :key="topic.id"
        type="button"
        class="topic-chip"
        :class="{ active: topic.id === selectedId }"
        :title="topic.description"
        @click="emit('select', topic.id)"
      >
        {{ topic.name }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.topic-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--ui-border, #eee);
}

.topic-title {
  font-size: 15px;
  margin-bottom: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.topic-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-chip {
  min-height: 36px;
  padding: 8px 16px;
  border-radius: var(--ui-radius-pill, 20px);
  border: 1px solid var(--ui-border, #eee);
  background: #fff;
  font-size: 13px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.2;
}

.topic-chip:hover {
  border-color: var(--el-color-primary-light-5);
  color: var(--el-color-primary);
}

.topic-chip.active {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(255, 36, 66, 0.25);
}
</style>
