<script setup lang="ts">
defineProps<{
  visible: boolean
  message?: string
  subMessage?: string
  cancellable?: boolean
}>()

defineEmits<{
  cancel: []
}>()
</script>

<template>
  <Transition name="fade">
    <div v-if="visible" class="overlay">
      <div class="box">
        <div class="spinner" />
        <p class="message">{{ message ?? '加载中…' }}</p>
        <p v-if="subMessage" class="sub">{{ subMessage }}</p>
        <button v-if="cancellable" type="button" class="cancel-btn" @click.stop="$emit('cancel')">
          取消生成
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.box {
  background: var(--card);
  border-radius: 16px;
  padding: 36px 48px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  text-align: center;
  min-width: 260px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}

.sub {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 8px;
}

.cancel-btn {
  margin-top: 20px;
  padding: 8px 28px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
