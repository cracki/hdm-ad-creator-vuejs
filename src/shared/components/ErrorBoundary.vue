<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue'
import { AlertTriangle, RefreshCw } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()
const hasError = ref(false)
const error = ref<Error | null>(null)

onErrorCaptured((err) => {
  hasError.value = true
  error.value = err
  console.error('[ErrorBoundary]', err)
  return false
})

function retry() {
  hasError.value = false
  error.value = null
}
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="surface-card p-8 text-center max-w-lg mx-auto my-8">
    <div class="h-12 w-12 rounded-xl bg-destructive/15 grid place-items-center mx-auto mb-4">
      <AlertTriangle class="h-5 w-5 text-destructive" />
    </div>
    <h3 class="font-semibold mb-1">{{ t('common.somethingWrong') }}</h3>
    <p class="text-sm text-muted-foreground mb-4">{{ error?.message ?? '' }}</p>
    <button
      data-loc="error-boundary.retry-btn"
      class="h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition inline-flex items-center gap-1.5"
      @click="retry"
    >
      <RefreshCw class="h-3 w-3" /> {{ t('common.retry') }}
    </button>
  </div>
</template>
