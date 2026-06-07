<script setup lang="ts">
import type { TuxingData } from '@/types/tuxing'
import { placeholderDataUrl } from '@/utils/tuxingRender'
import { computed } from 'vue'

const props = defineProps<{
  tuxing: TuxingData
}>()

const figureSize = 88
const optSize = figureSize - 8

const sequenceUrls = computed(() => {
  const baked = props.tuxing.imageUrls?.sequence
  const sz = props.tuxing.imageUrls?.seqSize ?? figureSize
  if (baked?.length) {
    return baked.map((url) => url ?? placeholderDataUrl(sz))
  }
  return props.tuxing.sequence.map(() => placeholderDataUrl(sz))
})

const optionUrls = computed(() => {
  const baked = props.tuxing.imageUrls?.options
  const sz = props.tuxing.imageUrls?.optSize ?? optSize
  if (baked?.length) {
    return baked.map((url) => url || placeholderDataUrl(sz))
  }
  return props.tuxing.options.map(() => placeholderDataUrl(sz))
})
</script>

<template>
  <div class="tuxing-block">
    <div class="sequence">
      <div v-for="(url, i) in sequenceUrls" :key="'s' + i" class="figure-box">
        <img
          :src="url"
          :width="tuxing.imageUrls?.seqSize ?? figureSize"
          :height="tuxing.imageUrls?.seqSize ?? figureSize"
          alt=""
        />
      </div>
    </div>
    <ul class="figure-options">
      <li v-for="(url, i) in optionUrls" :key="'o' + i">
        <strong>{{ 'ABCD'[i] }}.</strong>
        <div class="figure-box small">
          <img
            :src="url"
            :width="tuxing.imageUrls?.optSize ?? optSize"
            :height="tuxing.imageUrls?.optSize ?? optSize"
            alt=""
          />
        </div>
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
  line-height: 0;
}

.figure-box img {
  display: block;
  image-rendering: auto;
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
