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
      type="button"
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
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.module-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  min-height: 108px;
  padding: 16px;
  text-align: left;
  background: #fff;
  border: 2px solid var(--ui-border, #eee);
  border-radius: var(--ui-radius, 12px);
  box-shadow: var(--ui-shadow, 0 2px 12px rgba(0, 0, 0, 0.06));
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s, transform 0.15s;
}

.module-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: var(--ui-shadow-hover, 0 4px 16px rgba(255, 36, 66, 0.12));
  transform: translateY(-1px);
}

.module-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  box-shadow: 0 4px 16px rgba(255, 36, 66, 0.15);
}

.category {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
}

.name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.desc {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.45;
}

@media (max-width: 480px) {
  .module-grid {
    grid-template-columns: 1fr;
  }
}
</style>
