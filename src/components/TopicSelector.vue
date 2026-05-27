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
    <h3>选择考点</h3>
    <div class="topic-grid">
      <button
        class="topic-chip"
        :class="{ active: selectedId === '' }"
        @click="emit('select', '')"
      >
        全部考点
      </button>
      <button
        v-for="topic in topics"
        :key="topic.id"
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
  border-top: 1px solid var(--border);
}

h3 {
  font-size: 15px;
  margin-bottom: 12px;
  color: var(--text-secondary);
}

.topic-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.topic-chip {
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--card);
  font-size: 13px;
  color: var(--text);
  transition: all 0.2s;
}

.topic-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.topic-chip.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}
</style>
