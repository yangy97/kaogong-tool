<script setup lang="ts">
import { computed } from 'vue'
import { parseStem } from '@/utils/stemFormat'

const props = defineProps<{
  content: string
}>()

const segments = computed(() => parseStem(props.content))
</script>

<template>
  <div class="stem-content">
    <template v-for="(seg, i) in segments" :key="i">
      <p v-if="seg.type === 'text'" class="stem-text">{{ seg.text }}</p>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="(cell, ci) in seg.rows[0]" :key="ci">{{ cell }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, ri) in seg.rows.slice(1)" :key="ri">
              <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stem-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stem-text {
  margin: 0;
  font-size: inherit;
  line-height: 1.7;
  white-space: pre-wrap;
}

.table-wrap {
  overflow-x: auto;
  margin: 4px 0;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 280px;
}

.data-table th,
.data-table td {
  border: 1px solid var(--border, #e0e0e0);
  padding: 8px 12px;
  text-align: center;
}

.data-table th {
  background: #f5f7fa;
  font-weight: 600;
  color: var(--text-secondary, #555);
}

.data-table tbody tr:nth-child(even) {
  background: #fafbfc;
}

.data-table tbody tr:hover {
  background: #f0f4f8;
}
</style>
