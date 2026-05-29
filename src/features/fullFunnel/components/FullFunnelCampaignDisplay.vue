<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Check, RefreshCw,
  ChevronDown, ChevronUp,
  Target, Eye, Calendar, Layers, Megaphone,
} from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { exportFullFunnelCSV, exportFullFunnelPDF, exportFullFunnelPPTX } from '@/shared/utils/exportFullFunnel'
import type { FunnelStrategies, VisualConcept, PlatformTargeting, PublishingScheduleItem } from '../types'

const props = defineProps<{
  campaignData: Record<string, unknown>
  brandName: string
  selectedPlatforms: string[]
  currency: string
  budget: number
  duration: number
  selectedStages: string[]
  showBanner?: boolean
}>()

const emit = defineEmits<{
  reset: []
}>()

const { t } = useI18n()
const confetti = useConfetti()

const activeTab = ref<'overview' | 'ads' | 'strategies' | 'visuals' | 'targeting' | 'schedule'>('overview')
const expandedSections = ref<Record<string, boolean>>({})
const expandedPrompts = ref<Record<string, boolean>>({})

const platformList = [
  { id: 'meta', name: 'Meta', icon: '📘' },
  { id: 'google', name: 'Google Ads', icon: '🔍' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
]

const stages = [
  { id: 'tofu', name: 'TOFU', description: 'Awareness & Discovery', color: 'accent-cyan' },
  { id: 'mofu', name: 'MOFU', description: 'Consideration & Engagement', color: 'accent-magenta' },
  { id: 'bofu', name: 'BOFU', description: 'Decision & Conversion', color: 'accent-amber' },
]

const stageColors: Record<string, string> = {
  tofu: 'text-accent-cyan',
  mofu: 'text-accent-magenta',
  bofu: 'text-accent-amber',
}
const stageBgColors: Record<string, string> = {
  tofu: 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/30',
  mofu: 'bg-accent-magenta/10 text-accent-magenta border-accent-magenta/30',
  bofu: 'bg-accent-amber/10 text-accent-amber border-accent-amber/30',
}
const stageBarColors: Record<string, string> = {
  tofu: 'bg-accent-cyan',
  mofu: 'bg-accent-magenta',
  bofu: 'bg-accent-amber',
}

const tabs = computed(() => [
  { id: 'overview' as const, label: 'Overview', icon: Megaphone },
  { id: 'ads' as const, label: 'Ads', icon: Layers },
  { id: 'strategies' as const, label: t('funnelLauncher.tabStrategies'), icon: Target },
  { id: 'visuals' as const, label: t('funnelLauncher.tabVisuals'), icon: Eye },
  { id: 'targeting' as const, label: t('funnelLauncher.tabTargeting'), icon: Target },
  { id: 'schedule' as const, label: t('funnelLauncher.tabSchedule'), icon: Calendar },
])

function toggleSection(id: string) {
  expandedSections.value[id] = !expandedSections.value[id]
}

function platformIcon(p: string) {
  return platformList.find((pl) => pl.id === p)?.icon ?? '📱'
}

const adsByStage = computed(() => {
  const c = props.campaignData
  if (!c) return {}
  const result: Record<string, any[]> = {}
  if (c.ad_copies) {
    ;(c.ad_copies as any[]).forEach((group: any) => {
      const ads = group.ads ?? [group]
      ads.forEach((ad: any) => {
        const stage = ad.funnel_stage ?? 'tofu'
        if (!result[stage]) result[stage] = []
        result[stage].push(ad)
      })
    })
  }
  return result
})

const funnelStrategies = computed<FunnelStrategies | null>(() => props.campaignData?.funnel_strategies as FunnelStrategies ?? null)

const visualConcepts = computed<VisualConcept[]>(() => {
  const raw = props.campaignData?.visual_concepts
  return Array.isArray(raw) ? raw : []
})

const targetingSpecs = computed<Record<string, PlatformTargeting>>(() => (props.campaignData?.targeting_specs as Record<string, PlatformTargeting>) ?? {})

const publishingSchedule = computed<PublishingScheduleItem[]>(() => {
  const raw = props.campaignData?.publishing_schedule
  return Array.isArray(raw) ? raw : []
})

const scheduleHours = computed(() => {
  const hours = new Set(publishingSchedule.value.map((s) => s.time))
  return [...hours].sort()
})

const exporting = ref(false)

async function handleExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!props.campaignData) return
  exporting.value = true
  try {
    if (format === 'csv') {
      exportFullFunnelCSV(props.campaignData, adsByStage.value, funnelStrategies.value, visualConcepts.value, targetingSpecs.value, publishingSchedule.value)
    } else if (format === 'pdf') {
      await exportFullFunnelPDF(props.campaignData, adsByStage.value, funnelStrategies.value, visualConcepts.value, targetingSpecs.value, publishingSchedule.value, props.brandName)
    } else {
      await exportFullFunnelPPTX(props.campaignData, adsByStage.value, funnelStrategies.value, visualConcepts.value, targetingSpecs.value, publishingSchedule.value, props.brandName)
    }
    confetti.trigger()
  } finally {
    exporting.value = false
  }
}

const totalAds = computed(() => Object.values(adsByStage.value).flat().length)
</script>

<template>
  <div class="space-y-6">
    <!-- Success Banner -->
    <div v-if="showBanner !== false" class="surface-card p-5 bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div>
            <div class="text-sm font-semibold">{{ t('funnelLauncher.successTitle') }}</div>
            <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.successDesc', { count: totalAds }) }}</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="h-9 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="emit('reset')">
            <RefreshCw class="h-3 w-3" /> {{ t('funnelLauncher.newCampaign') }}
          </button>
          <StepExportButton :disabled="exporting" @export="handleExport" />
        </div>
      </div>
    </div>

    <!-- Export-only for history detail (no banner) -->
    <div v-if="showBanner === false" class="flex justify-end">
      <StepExportButton :disabled="exporting" @export="handleExport" />
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-overlay-subtle p-1 rounded-lg overflow-x-auto">
      <button
        v-for="tab in tabs" :key="tab.id"
        data-loc="funnel.tab-btn"
        @click="activeTab = tab.id"
        :class="[
          'flex items-center gap-1.5 whitespace-nowrap px-3 h-9 rounded-md text-xs font-medium transition',
          activeTab === tab.id ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground',
        ]"
      >
        <component :is="tab.icon" class="h-3.5 w-3.5" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Overview -->
    <div v-if="activeTab === 'overview'" class="surface-card p-5 space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3 rounded-lg bg-overlay-subtle">
          <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.totalAds') }}</div>
          <div class="text-xl font-bold">{{ totalAds }}</div>
        </div>
        <div class="p-3 rounded-lg bg-overlay-subtle">
          <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.platformCount') }}</div>
          <div class="text-xl font-bold">{{ selectedPlatforms.length }}</div>
        </div>
        <div class="p-3 rounded-lg bg-overlay-subtle">
          <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.budgetLabel') }}</div>
          <div class="text-xl font-bold">{{ currency }} {{ budget.toLocaleString() }}</div>
        </div>
        <div class="p-3 rounded-lg bg-overlay-subtle">
          <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.durationLabel') }}</div>
          <div class="text-xl font-bold">{{ duration }} {{ t('funnelLauncher.days') }}</div>
        </div>
      </div>
      <div v-if="funnelStrategies" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div v-for="stageId in ['tofu', 'mofu', 'bofu']" :key="stageId" class="p-3 rounded-lg border border-border/40">
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-semibold uppercase" :class="stageColors[stageId]">{{ stageId }}</span>
            <span class="text-xs text-muted-foreground">{{ (funnelStrategies as any)[stageId]?.budget_allocation_percent ?? 0 }}%</span>
          </div>
          <div class="h-1.5 rounded-full bg-overlay-subtle overflow-hidden">
            <div class="h-full rounded-full" :class="stageBarColors[stageId]" :style="{ width: ((funnelStrategies as any)[stageId]?.budget_allocation_percent ?? 0) + '%' }" />
          </div>
          <div class="text-[11px] text-muted-foreground mt-1">{{ (funnelStrategies as any)[stageId]?.objective ?? '' }}</div>
        </div>
      </div>
    </div>

    <!-- Ads -->
    <div v-if="activeTab === 'ads'" class="space-y-4">
      <div v-for="stage in selectedStages" :key="stage" class="border-b border-border/40 pb-4 last:border-0">
        <button
          data-loc="funnel.stage-toggle"
          @click="toggleSection(stage)"
          class="w-full flex items-center justify-between py-2"
        >
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold">{{ stages.find((s) => s.id === stage)?.name }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ adsByStage[stage]?.length ?? 0 }} {{ t('funnelLauncher.ads') }}</span>
          </div>
          <component :is="expandedSections[stage] ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
        </button>
        <div v-if="expandedSections[stage] && adsByStage[stage]" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div v-for="(ad, idx) in adsByStage[stage]" :key="idx" class="surface-card p-3">
            <div v-if="ad.platform" class="mb-1.5">
              <span class="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground font-medium">
                {{ platformIcon(ad.platform) }} {{ ad.platform }}
              </span>
            </div>
            <div v-if="ad.headline" class="font-medium text-sm mb-1">{{ ad.headline }}</div>
            <div class="text-xs text-muted-foreground mb-2">{{ ad.body_text ?? ad.body }}</div>
            <span v-if="ad.cta_button ?? ad.cta_text" class="inline-block text-[11px] px-2 py-1 rounded bg-primary text-primary-foreground font-medium">{{ ad.cta_button ?? ad.cta_text }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Strategies -->
    <div v-if="activeTab === 'strategies' && funnelStrategies" class="space-y-6">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div v-for="stageId in ['tofu', 'mofu', 'bofu']" :key="stageId" class="surface-card p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-bold uppercase" :class="stageColors[stageId]">{{ stageId }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded border" :class="stageBgColors[stageId]">{{ (funnelStrategies as any)[stageId]?.objective }}</span>
          </div>

          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.budgetAllocation') }}</div>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-2 rounded-full bg-overlay-subtle overflow-hidden">
                <div class="h-full rounded-full" :class="stageBarColors[stageId]" :style="{ width: ((funnelStrategies as any)[stageId]?.budget_allocation_percent ?? 0) + '%' }" />
              </div>
              <span class="text-xs font-semibold">{{ (funnelStrategies as any)[stageId]?.budget_allocation_percent }}%</span>
            </div>
          </div>

          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.psychology') }}</div>
            <div class="text-xs">{{ (funnelStrategies as any)[stageId]?.psychology }}</div>
          </div>

          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.messageAngle') }}</div>
            <div class="text-xs">{{ (funnelStrategies as any)[stageId]?.message_angle }}</div>
          </div>

          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.keyMessages') }}</div>
            <ul class="space-y-1">
              <li v-for="(msg, i) in ((funnelStrategies as any)[stageId]?.key_messages ?? [])" :key="i" class="text-xs text-muted-foreground flex gap-1.5">
                <span class="shrink-0">•</span>
                <span>{{ msg }}</span>
              </li>
            </ul>
          </div>

          <div v-if="(funnelStrategies as any)[stageId]?.emotional_hooks?.length">
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.emotionalHooks') }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(hook, i) in (funnelStrategies as any)[stageId].emotional_hooks" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{{ hook }}</span>
            </div>
          </div>

          <div v-if="(funnelStrategies as any)[stageId]?.creative_guidelines">
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.creativeGuidelines') }}</div>
            <div class="text-xs space-y-0.5">
              <div><span class="text-muted-foreground">{{ t('funnelLauncher.copyStyle') }}:</span> {{ (funnelStrategies as any)[stageId].creative_guidelines.copy_style }}</div>
              <div><span class="text-muted-foreground">{{ t('funnelLauncher.visualStyle') }}:</span> {{ (funnelStrategies as any)[stageId].creative_guidelines.visual_style }}</div>
            </div>
          </div>

          <div v-if="(funnelStrategies as any)[stageId]?.recommended_formats?.length">
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.recommendedFormats') }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(fmt, i) in (funnelStrategies as any)[stageId].recommended_formats" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ fmt }}</span>
            </div>
          </div>

          <div v-if="(funnelStrategies as any)[stageId]?.success_metrics?.length">
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.successMetrics') }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(m, i) in (funnelStrategies as any)[stageId].success_metrics" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success border border-success/20">{{ m }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Core Strategy -->
      <div v-if="funnelStrategies.core_strategy" class="surface-card p-5 space-y-3">
        <div class="text-sm font-bold mb-2">{{ t('funnelLauncher.coreStrategy') }}</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.valueProposition') }}</div>
            <div class="text-xs">{{ funnelStrategies.core_strategy.value_proposition }}</div>
          </div>
          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.brandPromise') }}</div>
            <div class="text-xs">{{ funnelStrategies.core_strategy.brand_promise }}</div>
          </div>
        </div>
        <div>
          <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.emotionalNarrative') }}</div>
          <div class="text-xs">{{ funnelStrategies.core_strategy.emotional_narrative }}</div>
        </div>
        <div v-if="funnelStrategies.core_strategy.content_pillars?.length">
          <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.contentPillars') }}</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="(p, i) in funnelStrategies.core_strategy.content_pillars" :key="i" class="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{{ p }}</span>
          </div>
        </div>
      </div>

      <!-- Cross-Platform Guidelines -->
      <div v-if="funnelStrategies.cross_platform_guidelines && Object.keys(funnelStrategies.cross_platform_guidelines).length" class="surface-card p-5 space-y-2">
        <div class="text-sm font-bold mb-2">{{ t('funnelLauncher.crossPlatformGuidelines') }}</div>
        <div class="space-y-2">
          <div v-for="(guideline, platform) in funnelStrategies.cross_platform_guidelines" :key="String(platform)" class="flex gap-3 items-start p-2 rounded-lg bg-overlay-subtle">
            <span class="text-sm shrink-0">{{ platformIcon(String(platform)) }}</span>
            <div>
              <div class="text-xs font-semibold capitalize">{{ String(platform) }}</div>
              <div class="text-xs text-muted-foreground">{{ guideline }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Visuals -->
    <div v-if="activeTab === 'visuals' && visualConcepts.length" class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div v-for="(vc, idx) in visualConcepts" :key="idx" class="surface-card p-4 space-y-3">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm">{{ platformIcon(vc.platform) }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded border" :class="stageBgColors[vc.funnel_stage]">{{ vc.funnel_stage?.toUpperCase() }}</span>
            <span class="text-[11px] px-2 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ vc.platform }}</span>
            <span v-if="vc.format" class="text-[11px] px-2 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ vc.format }}</span>
          </div>

          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.style') }}</div>
            <div class="text-xs">{{ vc.style }}</div>
          </div>
          <div>
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.mood') }}</div>
            <div class="text-xs italic text-muted-foreground">{{ vc.mood }}</div>
          </div>

          <div v-if="vc.color_palette?.length">
            <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.colorPalette') }}</div>
            <div class="flex items-center gap-2 flex-wrap">
              <div v-for="(color, ci) in vc.color_palette" :key="ci" class="flex items-center gap-1">
                <div class="h-4 w-4 rounded-full border border-border/40" :style="{ backgroundColor: color.startsWith('#') ? color : undefined }" />
                <span class="text-[10px] text-muted-foreground">{{ color }}</span>
              </div>
            </div>
          </div>

          <div v-if="vc.dimensions" class="text-[10px] text-muted-foreground">
            {{ t('funnelLauncher.dimensions') }}: {{ vc.dimensions.width }}x{{ vc.dimensions.height }} ({{ vc.dimensions.aspect_ratio }})
          </div>

          <div v-if="vc.image_prompt">
            <button class="text-[11px] text-muted-foreground font-medium hover:text-foreground transition" @click="expandedPrompts[`img-${idx}`] = !expandedPrompts[`img-${idx}`]">
              {{ t('funnelLauncher.imagePrompt') }} {{ expandedPrompts[`img-${idx}`] ? '▲' : '▼' }}
            </button>
            <div v-if="expandedPrompts[`img-${idx}`]" class="text-xs text-muted-foreground mt-1 bg-overlay-subtle p-2 rounded-lg">{{ vc.image_prompt }}</div>
          </div>

          <div v-if="vc.video_script">
            <button class="text-[11px] text-muted-foreground font-medium hover:text-foreground transition" @click="expandedPrompts[`vid-${idx}`] = !expandedPrompts[`vid-${idx}`]">
              {{ t('funnelLauncher.videoScript') }} {{ expandedPrompts[`vid-${idx}`] ? '▲' : '▼' }}
            </button>
            <div v-if="expandedPrompts[`vid-${idx}`]" class="text-xs text-muted-foreground mt-1 bg-overlay-subtle p-2 rounded-lg">{{ vc.video_script }}</div>
          </div>

          <div v-if="vc.thumbnail_prompt">
            <button class="text-[11px] text-muted-foreground font-medium hover:text-foreground transition" @click="expandedPrompts[`thumb-${idx}`] = !expandedPrompts[`thumb-${idx}`]">
              {{ t('funnelLauncher.thumbnailPrompt') }} {{ expandedPrompts[`thumb-${idx}`] ? '▲' : '▼' }}
            </button>
            <div v-if="expandedPrompts[`thumb-${idx}`]" class="text-xs text-muted-foreground mt-1 bg-overlay-subtle p-2 rounded-lg">{{ vc.thumbnail_prompt }}</div>
          </div>

          <div v-if="vc.visual_psychology" class="pt-2 border-t border-border/30">
            <div class="text-[11px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.visualPsychology') }}</div>
            <div class="text-[11px] text-muted-foreground">{{ vc.visual_psychology }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Targeting -->
    <div v-if="activeTab === 'targeting' && Object.keys(targetingSpecs).length" class="space-y-4">
      <div v-for="(spec, platform) in targetingSpecs" :key="String(platform)" class="surface-card p-5 space-y-4">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-lg">{{ platformIcon(String(platform)) }}</span>
          <span class="text-sm font-bold uppercase">{{ String(platform) }}</span>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div v-for="stageId in ['tofu', 'mofu', 'bofu']" :key="stageId" class="p-3 rounded-lg bg-overlay-subtle space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase" :class="stageColors[stageId]">{{ stageId }}</span>
              <span v-if="(spec as any)[stageId]?.estimated_reach" class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{{ (spec as any)[stageId].estimated_reach }}</span>
            </div>
            <div class="text-xs text-muted-foreground">{{ (spec as any)[stageId]?.strategy }}</div>
            <div v-if="(spec as any)[stageId]?.exclude?.length">
              <div class="text-[10px] text-muted-foreground font-medium mb-0.5">{{ t('funnelLauncher.exclusions') }}</div>
              <div class="flex flex-wrap gap-1">
                <span v-for="(ex, i) in (spec as any)[stageId].exclude" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive/80">{{ ex }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="(spec as any).geo_targeting" class="pt-2 border-t border-border/30">
          <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ t('funnelLauncher.geoTargeting') }}</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="c in ((spec as any).geo_targeting.countries ?? [])" :key="c" class="text-[10px] px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">{{ c }}</span>
            <span v-for="r in ((spec as any).geo_targeting.regions ?? [])" :key="r" class="text-[10px] px-2 py-0.5 rounded bg-accent-magenta/10 text-accent-magenta border border-accent-magenta/20">{{ r }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule -->
    <div v-if="activeTab === 'schedule'" class="space-y-4">
      <div v-if="scheduleHours.length" class="surface-card p-4">
        <div class="text-[11px] text-muted-foreground font-medium mb-2">{{ t('funnelLauncher.hoursSummary') }}</div>
        <div class="flex flex-wrap gap-2">
          <span v-for="h in scheduleHours" :key="h" class="text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 font-mono font-semibold">
            {{ h }}
          </span>
        </div>
      </div>

      <div v-if="publishingSchedule.length" class="surface-card overflow-x-auto">
        <table class="w-full text-xs">
          <thead>
            <tr class="border-b border-border/40">
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.date') }}</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.time') }}</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.dayOfWeek') }}</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">Platform</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">Stage</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.adFormat') }}</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.headlinePreview') }}</th>
              <th class="px-3 py-2 text-start text-muted-foreground font-medium">{{ t('funnelLauncher.notes') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in publishingSchedule" :key="idx" class="border-b border-border/20 hover:bg-overlay-subtle/50">
              <td class="px-3 py-2 font-mono">{{ item.date }}</td>
              <td class="px-3 py-2 font-mono font-semibold">{{ item.time }}</td>
              <td class="px-3 py-2">{{ item.day_of_week }}</td>
              <td class="px-3 py-2">
                <span class="inline-flex items-center gap-1">
                  {{ platformIcon(item.platform) }}
                  <span class="capitalize">{{ item.platform }}</span>
                </span>
              </td>
              <td class="px-3 py-2">
                <span class="text-[10px] px-1.5 py-0.5 rounded border" :class="stageBgColors[item.funnel_stage]">{{ item.funnel_stage?.toUpperCase() }}</span>
              </td>
              <td class="px-3 py-2 text-muted-foreground">{{ item.ad_format }}</td>
              <td class="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{{ item.headline_preview }}</td>
              <td class="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{{ item.notes }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="!publishingSchedule.length" class="surface-card p-8 text-center text-sm text-muted-foreground">
        No schedule data available
      </div>
    </div>
  </div>
</template>
