<script setup lang="ts">
import type { ExamModule } from '@/types'

defineProps<{
  modules: ExamModule[]
  selectedId: string
}>()

const emit = defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <div class="module-grid">
    <button
      v-for="mod in modules"
      :key="mod.id"
      class="module-card"
      :class="{ active: mod.id === selectedId }"
      @click="emit('select', mod.id)"
    >
      <span class="category">{{ mod.category }}</span>
      <span class="name">{{ mod.name }}</span>
      <span class="desc">{{ mod.description }}</span>
    </button>
  </div>
</template>

<style scoped>
.module-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.module-card {
  background: var(--card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: left;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.module-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow);
}

.module-card.active {
  border-color: var(--primary);
  background: var(--primary-light);
}

.category {
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
}

.name {
  font-size: 16px;
  font-weight: 700;
}

.desc {
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
