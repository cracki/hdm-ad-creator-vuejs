<script setup lang="ts">
import { AlertCircle, RefreshCw } from 'lucide-vue-next'

withDefaults(
  defineProps<{
    message: string
    title?: string
    failedStep?: string
    retryLabel?: string
  }>(),
  {
    retryLabel: 'Retry',
  },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="surface-card p-5 flex items-start gap-3">
    <AlertCircle class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
    <div class="flex-1 min-w-0">
      <div v-if="title" data-testid="error-title" class="text-sm font-semibold text-destructive mb-0.5">
        {{ title }}
      </div>
      <div class="text-sm text-destructive">{{ message }}</div>
      <div
        v-if="failedStep"
        data-testid="error-step"
        class="mt-1.5 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive/80 border border-destructive/20"
      >
        {{ failedStep }}
      </div>
    </div>
    <button
      data-testid="error-retry"
      class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition shrink-0"
      @click="emit('retry')"
    >
      <RefreshCw class="h-3 w-3" /> {{ retryLabel }}
    </button>
  </div>
</template>
