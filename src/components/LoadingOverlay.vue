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
  <el-dialog
    :model-value="visible"
    width="320px"
    align-center
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="loading-dialog"
    append-to-body
  >
    <div class="loading-body">
      <div class="spinner" />
      <p class="loading-message">{{ message ?? '加载中…' }}</p>
      <p v-if="subMessage" class="loading-sub">{{ subMessage }}</p>
      <el-button v-if="cancellable" class="loading-cancel" @click="$emit('cancel')">
        取消生成
      </el-button>
    </div>
  </el-dialog>
</template>

<style scoped>
.loading-body {
  text-align: center;
  padding: 8px 0 4px;
}

.spinner {
  width: 44px;
  height: 44px;
  border: 3px solid var(--el-border-color);
  border-top-color: var(--el-color-primary);
  border-radius: 50%;
  margin: 0 auto 20px;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-message {
  font-size: 16px;
  font-weight: 600;
}

.loading-sub {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.loading-cancel {
  margin-top: 20px;
}
</style>

<style>
.loading-dialog .el-dialog__header {
  display: none;
}

.loading-dialog .el-dialog__body {
  padding: 28px 24px 24px;
}
</style>
