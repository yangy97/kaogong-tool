<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { FORM_SELECT_OPEN, createSelectId, notifySelectOpen } from '@/utils/selectRegistry'

export interface SelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export interface SelectGroup {
  label: string
  options: SelectOption[]
}

const props = withDefaults(
  defineProps<{
    modelValue: string | number
    options?: SelectOption[]
    groups?: SelectGroup[]
    disabled?: boolean
    placeholder?: string
  }>(),
  { placeholder: '请选择' },
)

const emit = defineEmits<{ 'update:modelValue': [string | number] }>()

const selectId = createSelectId()
const open = ref(false)
const root = ref<HTMLElement | null>(null)

const flatOptions = computed(() => {
  if (props.options?.length) return props.options
  return (props.groups ?? []).flatMap((g) => g.options)
})

const displayLabel = computed(() => {
  const hit = flatOptions.value.find((o) => o.value === props.modelValue && !o.disabled)
  return hit?.label ?? props.placeholder
})

function closeMenu() {
  open.value = false
}

function toggle() {
  if (props.disabled) return
  if (open.value) {
    closeMenu()
    return
  }
  // 先通知其他实例关闭，再打开当前（同步事件，可靠互斥）
  notifySelectOpen(selectId)
  open.value = true
}

function onOtherSelectOpen(e: Event) {
  const id = (e as CustomEvent<{ id: number }>).detail?.id
  if (id !== selectId) closeMenu()
}

function pick(value: string | number, disabled?: boolean) {
  if (disabled) return
  emit('update:modelValue', value)
  closeMenu()
}

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) {
    closeMenu()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeMenu()
}

watch(
  () => props.disabled,
  (v) => {
    if (v) closeMenu()
  },
)

onMounted(() => {
  document.addEventListener(FORM_SELECT_OPEN, onOtherSelectOpen)
  document.addEventListener('click', onDocClick, true)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener(FORM_SELECT_OPEN, onOtherSelectOpen)
  document.removeEventListener('click', onDocClick, true)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    ref="root"
    class="form-select"
    :class="{ open, disabled }"
  >
    <button
      type="button"
      class="form-select-trigger"
      :disabled="disabled"
      :aria-expanded="open"
      @click="toggle"
    >
      <span class="form-select-value">{{ displayLabel }}</span>
      <svg class="form-select-chevron" viewBox="0 0 12 12" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
    </button>

    <div v-show="open" class="form-select-menu">
      <template v-if="options?.length">
        <button
          v-for="opt in options"
          :key="String(opt.value)"
          type="button"
          class="form-select-option"
          :class="{ active: modelValue === opt.value, disabled: opt.disabled }"
          :disabled="opt.disabled"
          @click.stop="pick(opt.value, opt.disabled)"
        >
          <span v-if="modelValue === opt.value" class="check">✓</span>
          {{ opt.label }}
        </button>
      </template>
      <template v-else>
        <div v-for="group in groups" :key="group.label" class="form-select-group">
          <div class="form-select-group-label">{{ group.label }}</div>
          <button
            v-for="opt in group.options"
            :key="String(opt.value)"
            type="button"
            class="form-select-option"
            :class="{ active: modelValue === opt.value, disabled: opt.disabled }"
            :disabled="opt.disabled"
            @click.stop="pick(opt.value, opt.disabled)"
          >
            <span v-if="modelValue === opt.value" class="check">✓</span>
            {{ opt.label }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.form-select {
  position: relative;
  width: 100%;
}

.form-select.open {
  z-index: 60;
}

.form-select-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 12px;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  color: var(--text);
  text-align: left;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-select-trigger:hover:not(:disabled) {
  border-color: #ddd;
}

.form-select.open .form-select-trigger,
.form-select-trigger:focus-visible {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-light);
}

.form-select-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-select-chevron {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: transform 0.2s;
}

.form-select.open .form-select-chevron {
  transform: rotate(180deg);
}

.form-select-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  padding: 6px;
}

.form-select-option {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 9px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 14px;
  line-height: 1.4;
  color: var(--text);
  text-align: left;
}

.form-select-option:hover:not(:disabled) {
  background: var(--bg);
}

.form-select-option.active {
  background: var(--primary-light);
  color: var(--primary);
  font-weight: 500;
}

.form-select-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.check {
  flex-shrink: 0;
  font-size: 12px;
  margin-top: 2px;
}

.form-select-group-label {
  padding: 6px 10px 4px;
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 600;
}

.form-select.disabled .form-select-trigger {
  opacity: 0.6;
  cursor: not-allowed;
  background: #fafafa;
}
</style>
