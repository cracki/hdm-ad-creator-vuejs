<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, Eye, Image, Check, FileText, Palette } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import type { AdLibraryAd } from '../types'

const props = defineProps<{
  ad: AdLibraryAd
}>()

const emit = defineEmits<{
  viewDetails: [ad: AdLibraryAd]
}>()

const { t } = useI18n()
const toast = useToast()
const copiedField = ref<string | null>(null)

const data = computed(() => props.ad.data as Record<string, unknown>)

const headline = computed(() => String(data.value.headline ?? ''))
const primaryText = computed(() => String(data.value.primary_text ?? ''))
const description = computed(() => String(data.value.description ?? ''))
const cta = computed(() => String(data.value.cta ?? ''))
const emotionalAppeal = computed(() => String(data.value.emotional_appeal ?? ''))
const valueProp = computed(() => String(data.value.value_proposition ?? ''))
const hookType = computed(() => String(data.value.hook_type ?? ''))

const visualDirection = computed(() => {
  const vd = data.value.visual_direction
  if (!vd || typeof vd !== 'object') return null
  return vd as Record<string, unknown>
})

const visualMood = computed(() => visualDirection.value ? String(visualDirection.value.mood ?? '') : '')
const visualSubject = computed(() => visualDirection.value ? String(visualDirection.value.subject ?? '') : '')

const motivations = computed(() => {
  const m = data.value.motivations_targeted
  return Array.isArray(m) ? m.map(String) : []
})

const painPoints = computed(() => {
  const p = data.value.pain_points_addressed
  return Array.isArray(p) ? p.map(String) : []
})

async function copyToClipboard(text: string, fieldKey: string) {
  await navigator.clipboard.writeText(text)
  copiedField.value = fieldKey
  toast.success(t('common.copied'))
  setTimeout(() => { copiedField.value = null }, 1500)
}

function copyAdCopy() {
  const parts = [
    headline.value ? `${t('adlib.headline')}: ${headline.value}` : '',
    primaryText.value ? `${t('adlib.primaryText')}: ${primaryText.value}` : '',
    description.value ? `${t('adlib.description')}: ${description.value}` : '',
    cta.value ? `${t('adlib.cta')}: ${cta.value}` : '',
  ].filter(Boolean)
  copyToClipboard(parts.join('\n'), 'adCopy')
}

function copyVisual() {
  if (!visualDirection.value) return
  copyToClipboard(JSON.stringify(visualDirection.value, null, 2), 'visual')
}

function copyAll() {
  copyToClipboard(JSON.stringify(props.ad, null, 2), 'all')
}
</script>

<template>
  <div class="surface-card p-4 group relative">
    <!-- Tags row -->
    <div class="flex flex-wrap gap-1.5 mb-3">
      <span v-if="ad.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ ad.platform }}</span>
      <span v-if="ad.funnel_stage" class="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-info">{{ ad.funnel_stage }}</span>
      <span v-if="ad.angle_name" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ ad.angle_name }}</span>
      <span v-if="ad.persona" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-cyan/15 text-accent-cyan">{{ ad.persona }}</span>
      <span v-if="hookType" class="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">{{ hookType }}</span>
    </div>

    <!-- Ad copy preview -->
    <div class="rounded-lg border border-border/40 bg-white/[0.015] p-3 space-y-2 mb-3">
      <div v-if="headline" class="text-sm font-semibold leading-snug">{{ headline }}</div>
      <div v-if="primaryText" class="text-xs leading-relaxed text-foreground/80 line-clamp-4">{{ primaryText }}</div>
      <div v-if="description" class="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">{{ description }}</div>
      <div v-if="cta" class="flex items-center justify-end pt-1">
        <span class="h-6 px-2.5 rounded-md bg-primary text-primary-foreground text-[11px] font-medium grid place-items-center">{{ cta }}</span>
      </div>
    </div>

    <!-- Visual direction teaser -->
    <div v-if="visualDirection" class="mb-3">
      <div class="flex items-center gap-1.5 mb-1">
        <Palette class="h-3 w-3 text-muted-foreground" />
        <span class="text-[11px] font-medium text-muted-foreground">{{ t('adlib.visualDirection') }}</span>
      </div>
      <div class="text-[11px] text-muted-foreground space-y-0.5 pl-5">
        <div v-if="visualMood" class="italic truncate">{{ visualMood }}</div>
        <div v-if="visualSubject" class="italic line-clamp-2">{{ visualSubject }}</div>
      </div>
    </div>

    <!-- Emotional appeal & value prop -->
    <div v-if="emotionalAppeal || valueProp" class="mb-3 space-y-1.5">
      <div v-if="emotionalAppeal" class="flex items-center gap-1.5">
        <span class="text-[11px] px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber">{{ emotionalAppeal }}</span>
      </div>
      <div v-if="valueProp" class="text-[11px] text-muted-foreground line-clamp-2">{{ valueProp }}</div>
    </div>

    <!-- Motivations & Pain Points -->
    <div v-if="motivations.length || painPoints.length" class="mb-3 space-y-1.5">
      <div v-if="motivations.length" class="flex flex-wrap gap-1">
        <span v-for="m in motivations" :key="m" class="text-[10px] px-1.5 py-0.5 rounded-full bg-success/10 text-success">{{ m }}</span>
      </div>
      <div v-if="painPoints.length" class="flex flex-wrap gap-1">
        <span v-for="p in painPoints" :key="p" class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-amber/10 text-accent-amber">{{ p }}</span>
      </div>
    </div>

    <!-- Action bar -->
    <div class="flex items-center gap-1 pt-2 border-t border-border/30">
      <button
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-white/[0.06] transition text-muted-foreground hover:text-foreground"
        @click="copyAdCopy"
      >
        <Check v-if="copiedField === 'adCopy'" class="h-3 w-3 text-success" />
        <FileText v-else class="h-3 w-3" />
        <span v-if="copiedField === 'adCopy'" class="text-success">{{ t('common.copied') }}</span>
        <span v-else>{{ t('adlib.copyAdCopy') }}</span>
      </button>

      <button
        v-if="visualDirection"
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-white/[0.06] transition text-muted-foreground hover:text-foreground"
        @click="copyVisual"
      >
        <Check v-if="copiedField === 'visual'" class="h-3 w-3 text-success" />
        <Image v-else class="h-3 w-3" />
        <span v-if="copiedField === 'visual'" class="text-success">{{ t('common.copied') }}</span>
        <span v-else>{{ t('adlib.copyVisual') }}</span>
      </button>

      <div class="flex-1" />

      <button
        class="h-7 px-2 rounded-md text-[11px] flex items-center gap-1 hover:bg-white/[0.06] transition text-muted-foreground hover:text-foreground"
        @click="copyAll"
      >
        <Check v-if="copiedField === 'all'" class="h-3 w-3 text-success" />
        <Copy v-else class="h-3 w-3" />
      </button>

      <button
        class="h-7 px-2.5 rounded-md text-[11px] flex items-center gap-1 hover:bg-white/[0.06] transition text-muted-foreground hover:text-primary font-medium"
        @click="emit('viewDetails', ad)"
      >
        <Eye class="h-3 w-3" /> {{ t('adlib.viewDetails') }}
      </button>
    </div>
  </div>
</template>
