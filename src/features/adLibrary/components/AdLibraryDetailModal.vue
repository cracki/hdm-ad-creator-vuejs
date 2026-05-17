<script setup lang="ts">
import { computed } from 'vue'
import { X, Copy, Palette } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import type { AdLibraryAd } from '../types'

const props = defineProps<{
  ad: AdLibraryAd
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()
const toast = useToast()

const data = computed(() => props.ad.data as Record<string, unknown>)

const headline = computed(() => String(data.value.headline ?? ''))
const primaryText = computed(() => String(data.value.primary_text ?? ''))
const description = computed(() => String(data.value.description ?? ''))
const cta = computed(() => String(data.value.cta ?? ''))
const emotionalAppeal = computed(() => String(data.value.emotional_appeal ?? ''))
const valueProp = computed(() => String(data.value.value_proposition ?? ''))
const hypothesis = computed(() => String(data.value.a_b_test_hypothesis ?? ''))
const hookType = computed(() => String(data.value.hook_type ?? ''))

const visualDirection = computed(() => {
  const vd = data.value.visual_direction
  if (!vd || typeof vd !== 'object') return null
  return vd as Record<string, unknown>
})

const visualMood = computed(() => visualDirection.value ? String(visualDirection.value.mood ?? '') : '')
const visualStyle = computed(() => visualDirection.value ? String(visualDirection.value.style ?? '') : '')
const visualSubject = computed(() => visualDirection.value ? String(visualDirection.value.subject ?? '') : '')
const colorPalette = computed(() => visualDirection.value ? String(visualDirection.value.color_palette ?? '') : '')

const motivations = computed(() => {
  const m = data.value.motivations_targeted
  return Array.isArray(m) ? m.map(String) : []
})

const painPoints = computed(() => {
  const p = data.value.pain_points_addressed
  return Array.isArray(p) ? p.map(String) : []
})

function copyJson() {
  navigator.clipboard.writeText(JSON.stringify(props.ad, null, 2))
  toast.success(t('common.copied'))
}

function copyFullAdCopy() {
  const parts = [
    headline.value ? `${t('adlib.headline')}: ${headline.value}` : '',
    primaryText.value ? `${t('adlib.primaryText')}: ${primaryText.value}` : '',
    description.value ? `${t('adlib.description')}: ${description.value}` : '',
    cta.value ? `${t('adlib.cta')}: ${cta.value}` : '',
  ].filter(Boolean)
  navigator.clipboard.writeText(parts.join('\n'))
  toast.success(t('common.copied'))
}

function copyVisual() {
  if (!visualDirection.value) return
  navigator.clipboard.writeText(JSON.stringify(visualDirection.value, null, 2))
  toast.success(t('common.copied'))
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
            <h3 class="text-sm font-semibold">{{ t('adlib.adDetail') }}</h3>
            <span v-if="ad.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ ad.platform }}</span>
            <span v-if="ad.funnel_stage" class="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-info">{{ ad.funnel_stage }}</span>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="h-8 px-3 rounded-lg border border-border/60 text-[11px] flex items-center gap-1.5 hover:bg-white/[0.04] transition"
              @click="copyJson"
            >
              <Copy class="h-3 w-3" /> {{ t('adlib.copyAll') }}
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
            <span v-if="ad.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ ad.platform }}</span>
            <span v-if="ad.funnel_stage" class="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-info">{{ ad.funnel_stage }}</span>
            <span v-if="ad.angle_name" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ ad.angle_name }}</span>
            <span v-if="ad.persona" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ ad.persona }}</span>
            <span v-if="hookType" class="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">{{ hookType }}</span>
          </div>

          <!-- Ad Copy Section -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('adlib.adCopySection') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyFullAdCopy"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('adlib.copyAdCopy') }}
              </button>
            </div>

            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4 space-y-3">
              <div v-if="headline" class="text-base font-semibold leading-snug">{{ headline }}</div>
              <div v-if="primaryText" class="text-sm leading-relaxed text-foreground/80">{{ primaryText }}</div>
              <div v-if="description" class="text-sm leading-relaxed text-muted-foreground">{{ description }}</div>
              <div v-if="cta" class="flex items-center justify-end pt-1">
                <span class="h-8 px-3 rounded-md bg-primary text-primary-foreground text-[11px] font-medium grid place-items-center">{{ cta }}</span>
              </div>
            </div>
          </section>

          <!-- Visual Direction Section -->
          <section v-if="visualDirection">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('adlib.visualSection') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyVisual"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('adlib.copyVisual') }}
              </button>
            </div>
            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4 space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div v-if="visualMood" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                  <div class="flex items-center gap-1.5 mb-1">
                    <Palette class="h-3 w-3 text-muted-foreground" />
                    <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ t('adlib.mood') }}</span>
                  </div>
                  <div class="text-xs">{{ visualMood }}</div>
                </div>
                <div v-if="visualStyle" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                  <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.style') }}</span>
                  <div class="text-xs">{{ visualStyle }}</div>
                </div>
              </div>
              <div v-if="visualSubject" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.subject') }}</span>
                <div class="text-xs leading-relaxed">{{ visualSubject }}</div>
              </div>
              <div v-if="colorPalette" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.colorPalette') }}</span>
                <div class="text-xs">{{ colorPalette }}</div>
              </div>
            </div>
          </section>

          <!-- Emotional Appeal & Value Proposition -->
          <section v-if="emotionalAppeal || valueProp">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{{ t('adlib.metadataSection') }}</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-if="emotionalAppeal" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.emotionalAppeal') }}</span>
                <span class="text-xs px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber">{{ emotionalAppeal }}</span>
              </div>
              <div v-if="hookType" class="p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.hookType') }}</span>
                <span class="text-xs">{{ hookType }}</span>
              </div>
            </div>
            <div v-if="valueProp" class="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.valueProp') }}</span>
              <div class="text-xs leading-relaxed">{{ valueProp }}</div>
            </div>
            <div v-if="hypothesis" class="mt-2 p-2.5 rounded-lg bg-white/[0.02] border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.hypothesis') }}</span>
              <div class="text-xs leading-relaxed text-muted-foreground">{{ hypothesis }}</div>
            </div>
          </section>

          <!-- Motivations & Pain Points -->
          <section v-if="motivations.length || painPoints.length">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{{ t('adlib.personasCount') }}</h4>
            <div class="space-y-2">
              <div v-if="motivations.length">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{{ t('adlib.motivations') }}</span>
                <div class="flex flex-wrap gap-1">
                  <span v-for="m in motivations" :key="m" class="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">{{ m }}</span>
                </div>
              </div>
              <div v-if="painPoints.length">
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{{ t('adlib.painPoints') }}</span>
                <div class="flex flex-wrap gap-1">
                  <span v-for="p in painPoints" :key="p" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber">{{ p }}</span>
                </div>
              </div>
            </div>
          </section>

          <!-- Raw Data -->
          <section>
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{{ t('adlib.rawData') }}</h4>
              <button
                class="h-6 px-2 rounded border border-border/50 text-[10px] flex items-center gap-1 hover:bg-white/[0.04] transition"
                @click="copyJson"
              >
                <Copy class="h-2.5 w-2.5" /> {{ t('adlib.copyAll') }}
              </button>
            </div>
            <div class="rounded-xl border border-border/50 bg-white/[0.02] p-4 max-h-60 overflow-auto">
              <pre class="text-[11px] text-muted-foreground whitespace-pre-wrap break-all font-mono">{{ JSON.stringify(ad, null, 2) }}</pre>
            </div>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>
