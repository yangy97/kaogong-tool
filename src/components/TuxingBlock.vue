<script setup lang="ts">
import type { TuxingData } from '@/types/tuxing'
import { figureToSvg, placeholderSvg } from '@/utils/tuxingRender'
import { computed } from 'vue'

const props = defineProps<{
  data: TuxingData
}>()

const figureSize = 88

const sequenceHtml = computed(() =>
  props.data.sequence.map((fig) => (fig ? figureToSvg(fig, figureSize) : placeholderSvg(figureSize))),
)

const optionsHtml = computed(() =>
  props.data.options.map((fig) => figureToSvg(fig, figureSize - 8)),
)
</script>

<template>
  <div class="tuxing-block">
    <div class="sequence">
      <div v-for="(svg, i) in sequenceHtml" :key="'s' + i" class="figure-box" v-html="svg" />
    </div>
    <ul class="figure-options">
      <li v-for="(svg, i) in optionsHtml" :key="'o' + i">
        <strong>{{ 'ABCD'[i] }}.</strong>
        <div class="figure-box small" v-html="svg" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.tuxing-block {
  margin: 12px 0 16px;
}

.sequence {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #fafbfc;
  border-radius: 10px;
  border: 1px solid var(--border, #e8e8e8);
}

.figure-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid #ddd;
  border-radius: 6px;
  background: #fff;
  padding: 2px;
}

.figure-box.small {
  border-color: #e0e0e0;
}

.figure-options {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.figure-options li {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--bg, #f5f5f5);
  border-radius: 8px;
}

.figure-options strong {
  min-width: 24px;
  font-size: 15px;
}
</style>
