<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Eye, Image, Check, FileText } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'

const props = defineProps<{
  variant: any
}>()

const emit = defineEmits<{
  viewDetails: [variant: any]
}>()

const { t } = useI18n()
const toast = useToast()

const copiedField = ref<string | null>(null)

const adCopy = computed(() => {
  const d = props.variant?.data ?? {}
  if (d.ad_copy && typeof d.ad_copy === 'object') return d.ad_copy
  return {
    headline: d.headline ?? '',
    body: d.body ?? d.primary_text ?? '',
    cta: d.cta ?? '',
  }
})

const visualPrompt = computed(() => {
  const d = props.variant?.data ?? {}
  return d.image_prompt ?? d.visual_prompt ?? ''
})

const hasVisualPrompt = computed(() => !!visualPrompt.value)
const isMetaCreative = computed(() => props.variant?.variant_type === 'meta_creative')

async function copyToClipboard(text: string, fieldKey: string) {
  await navigator.clipboard.writeText(text)
  copiedField.value = fieldKey
  toast.success(t('variant.copySuccess'))
  setTimeout(() => {
    copiedField.value = null
  }, 1500)
}

function copyVisualPrompt() {
  if (visualPrompt.value) copyToClipboard(visualPrompt.value, 'prompt')
}

function copyAdCopy() {
  const parts = [
    adCopy.value.headline ? `${t('variant.headlineLabel')}: ${adCopy.value.headline}` : '',
    adCopy.value.body ? `${t('variant.bodyLabel')}: ${adCopy.value.body}` : '',
    adCopy.value.cta ? `${t('variant.ctaLabel')}: ${adCopy.value.cta}` : '',
  ].filter(Boolean)
  copyToClipboard(parts.join('\n'), 'adCopy')
}

function copyAll() {
  copyToClipboard(JSON.stringify(props.variant, null, 2), 'all')
}
</script>

<template>
  <div :class="['surface-card p-4 group relative', isMetaCreative ? 'border-s-2 border-s-accent-cyan' : '']">
    <!-- Tags row -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      <span v-if="isMetaCreative" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">
        {{ variant.framework_name ?? 'Meta' }}
      </span>
      <span v-if="variant.audience" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ variant.audience }}</span>
      <span v-if="variant.style" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ variant.style }}</span>
      <span v-if="variant.ad_format" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber">{{ variant.ad_format }}</span>
      <span v-if="variant.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ variant.platform }}</span>
    </div>

    <!-- Ad copy content -->
    <div class="rounded-lg border border-border/40 bg-overlay-subtle p-3 space-y-2 mb-3">
      <div v-if="adCopy.headline" class="text-sm font-semibold leading-snug">{{ adCopy.headline }}</div>
      <div v-if="adCopy.body" class="text-xs leading-relaxed text-foreground/80 line-clamp-4">{{ adCopy.body }}</div>
      <div v-if="adCopy.cta" class="flex items-center justify-end pt-1">
        <span class="h-6 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium grid place-items-center">{{ adCopy.cta }}</span>
      </div>
    </div>

    <!-- Visual prompt teaser -->
    <div v-if="hasVisualPrompt" class="mb-3">
      <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Image class="h-3 w-3" />
        <span class="italic truncate">{{ visualPrompt }}</span>
      </div>
    </div>

    <!-- Action bar -->
    <div class="flex items-center gap-1 pt-2 border-t border-border/30">
      <button
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-overlay-medium transition text-muted-foreground hover:text-foreground"
        @click="copyAdCopy"
      >
        <Check v-if="copiedField === 'adCopy'" class="h-3 w-3 text-success" />
        <FileText v-else class="h-3 w-3" />
        <span v-if="copiedField === 'adCopy'" class="text-success">{{ t('common.copied') }}</span>
        <span v-else>{{ t('variant.copyAdCopy') }}</span>
      </button>

      <button
        v-if="hasVisualPrompt"
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-overlay-medium transition text-muted-foreground hover:text-foreground"
        @click="copyVisualPrompt"
      >
        <Check v-if="copiedField === 'prompt'" class="h-3 w-3 text-success" />
        <Image v-else class="h-3 w-3" />
        <span v-if="copiedField === 'prompt'" class="text-success">{{ t('common.copied') }}</span>
        <span v-else>{{ t('variant.copyPrompt') }}</span>
      </button>

      <div class="flex-1" />

      <button
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-overlay-medium transition text-muted-foreground hover:text-foreground"
        @click="copyAll"
      >
        <Check v-if="copiedField === 'all'" class="h-3 w-3 text-success" />
        <Copy v-else class="h-3 w-3" />
        <span v-if="copiedField === 'all'" class="text-success">{{ t('common.copied') }}</span>
        <span v-else>{{ t('variant.copyAll') }}</span>
      </button>

      <button
        class="h-7 px-2.5 rounded-md text-[11px] flex items-center gap-1 hover:bg-overlay-medium transition text-muted-foreground hover:text-primary font-medium"
        @click="emit('viewDetails', variant)"
      >
        <Eye class="h-3 w-3" /> {{ t('variant.viewDetails') }}
      </button>
    </div>
  </div>
</template>
