<script setup lang="ts">
import { computed } from 'vue'
import { X, Copy, Check } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'

const props = defineProps<{
  variant: any
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()

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

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.success(t('variant.copySuccess'))
}

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(props.variant, null, 2))
  toast.success(t('variant.copySuccess'))
}

function copyFullAdCopy() {
  const parts = [
    adCopy.value.headline ? `${t('variant.headlineLabel')}: ${adCopy.value.headline}` : '',
    adCopy.value.body ? `${t('variant.bodyLabel')}: ${adCopy.value.body}` : '',
    adCopy.value.cta ? `${t('variant.ctaLabel')}: ${adCopy.value.cta}` : '',
  ].filter(Boolean)
  navigator.clipboard.writeText(parts.join('\n'))
  toast.success(t('variant.copySuccess'))
}
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      @click.self="emit('close')"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="emit('close')" />

      <!-- Modal -->
      <div class="relative surface-card w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl ring-1 ring-white/5">
        <!-- Header -->
        <div class="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold">{{ t('variant.variantDetail') }}</h3>
            <span v-if="variant.variant_type === 'meta_creative'" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">
              {{ variant.framework_name ?? 'Meta' }}
            </span>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 rounded-lg border border-border/60 text-[11px] flex items-center gap-1.5 hover:bg-white/[0.04] transition"
              @click="copyJson"
            >
              <Copy class="h-3 w-3" /> {{ t('variant.copyAll') }}
            </button>
            <button
              class="h-8 w-8 grid place-items-center rounded-lg hover:bg-white/[0.06] transition"
              @click="emit('close')"
            >
              <X class="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <!-- Tags -->
          <div class="flex flex-wrap gap-1.5">
            <span v-if="variant.variant_type === 'meta_creative'" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">
              {{ variant.framework_name ?? 'Meta' }}
            </span>
            <span v-if="variant.audience" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ variant.audience }}</span>
            <span v-if="variant.style" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ variant.style }}</span>
            <span v-if="variant.ad_format" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber">{{ variant.ad_format }}</span>
            <span v-if="variant.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ variant.platform }}</span>
          </div>

          <!-- Ad Copy Section -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('variant.adCopySection') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyFullAdCopy"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('variant.copyAdCopy') }}
              </button>
            </div>

            <!-- Preview card -->
            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4 space-y-3">
              <div v-if="adCopy.headline" class="text-base font-semibold leading-snug">{{ adCopy.headline }}</div>
              <div v-if="adCopy.body" class="text-sm leading-relaxed text-foreground/80">{{ adCopy.body }}</div>
              <div v-if="adCopy.cta" class="flex items-center justify-end pt-1">
                <span class="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium grid place-items-center">{{ adCopy.cta }}</span>
              </div>
            </div>
          </section>

          <!-- Visual Prompt Section -->
          <section v-if="hasVisualPrompt">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('variant.visualPromptSection') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyText(visualPrompt)"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('variant.copyPrompt') }}
              </button>
            </div>
            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4">
              <p class="text-sm leading-relaxed text-muted-foreground italic">{{ visualPrompt }}</p>
            </div>
          </section>

          <!-- Metadata -->
          <section>
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{{ t('variant.metadata') }}</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div v-if="variant.platform" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.platformLabel') }}:</span>
                <span class="font-medium">{{ variant.platform }}</span>
              </div>
              <div v-if="variant.audience" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.audience') }}:</span>
                <span class="font-medium">{{ variant.audience }}</span>
              </div>
              <div v-if="variant.style" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.style') }}:</span>
                <span class="font-medium">{{ variant.style }}</span>
              </div>
              <div v-if="variant.ad_format" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.format') }}:</span>
                <span class="font-medium">{{ variant.ad_format }}</span>
              </div>
              <div v-if="variant.framework_name" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.frameworkLabel') }}:</span>
                <span class="font-medium">{{ variant.framework_name }}</span>
              </div>
              <div v-if="variant.variant_type" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.type') }}:</span>
                <span class="font-medium">{{ variant.variant_type === 'meta_creative' ? t('variant.meta') : t('variant.regular') }}</span>
              </div>
              <div v-if="variant.created_at" class="flex items-center gap-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-muted-foreground">{{ t('variant.createdAt') }}:</span>
                <span class="font-medium">{{ new Date(variant.created_at).toLocaleString() }}</span>
              </div>
            </div>
          </section>

          <!-- Raw Data -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('variant.rawData') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyJson"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('variant.copyAll') }}
              </button>
            </div>
            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4 max-h-60 overflow-auto">
              <pre class="text-[11px] text-muted-foreground whitespace-pre-wrap break-all font-mono">{{ JSON.stringify(variant, null, 2) }}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
