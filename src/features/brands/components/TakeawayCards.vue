<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Check } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'

/** Compact key-takeaway cards with copy-to-clipboard (ScenarioVariantCard pattern). */
defineProps<{
  items: string[]
}>()

const { t } = useI18n()
const toast = useToast()
const copiedIndex = ref<number | null>(null)

async function copyToClipboard(text: string, index: number) {
  await navigator.clipboard.writeText(text)
  copiedIndex.value = index
  toast.success(t('analysis.personality.copied' as any))
  setTimeout(() => {
    copiedIndex.value = null
  }, 1500)
}
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
    <div
      v-for="(item, i) in items"
      :key="i"
      data-testid="takeaway-card"
      class="flex items-start gap-2 p-3 rounded-lg border border-border/50 bg-overlay-subtle/50 group"
    >
      <p class="flex-1 text-sm leading-relaxed min-w-0">{{ item }}</p>
      <button
        type="button"
        data-testid="takeaway-copy"
        :aria-label="t('analysis.personality.copy' as any)"
        class="shrink-0 h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
        @click="copyToClipboard(item, i)"
      >
        <Check v-if="copiedIndex === i" class="h-3.5 w-3.5 text-success" />
        <Copy v-else class="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
</template>
