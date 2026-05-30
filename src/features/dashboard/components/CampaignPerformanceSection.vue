<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { Activity } from 'lucide-vue-next'
import { useCampaigns } from '@/features/campaigns/queries'
import type { Campaign } from '@/features/campaigns/types'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'

const { t, lang, dir } = useI18n()
const echartsLocale = useEChartsLocale(lang)

const { data: campaigns, isLoading } = useCampaigns()

const campaignList = computed(() => campaigns.value ?? [])

const baseOption = computed(() => ({
  rtl: dir.value === 'rtl',
  locale: echartsLocale.value,
}))

// --- Chart 1: Campaign Status Donut ---
const statusDonutOption = computed(() => {
  const list = campaignList.value
  const counts: Record<string, number> = {
    in_progress: 0,
    completed: 0,
    draft: 0,
    archived: 0,
  }
  for (const c of list) {
    counts[c.status] = (counts[c.status] ?? 0) + 1
  }

  const colorMap: Record<string, string> = {
    in_progress: '#8b5cf6',
    completed: '#22c55e',
    draft: '#6b7280',
    archived: '#374151',
  }

  const statusLabels: Record<string, string> = {
    in_progress: t('dashboard.campaigns.statusInProgress' as any),
    completed: t('dashboard.campaigns.statusCompleted' as any),
    draft: t('dashboard.campaigns.statusDraft' as any),
    archived: t('dashboard.campaigns.statusArchived' as any),
  }

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([status, value]) => ({
      name: statusLabels[status] ?? status,
      value,
      itemStyle: { color: colorMap[status] },
    }))

  return {
    ...baseOption.value,
    tooltip: { trigger: 'item' as const },
    legend: {
      orient: 'horizontal' as const,
      bottom: 0,
      left: 'center',
      textStyle: { color: '#9ca3af', fontSize: 11 },
    },
    graphic: [
      {
        type: 'text',
        left: 'center',
        top: '38%',
        style: {
          text: String(list.length),
          fontSize: 24,
          fontWeight: 'bold',
          fill: '#f9fafb',
          textAlign: 'center',
        },
      },
      {
        type: 'text',
        left: 'center',
        top: '52%',
        style: {
          text: t('dashboard.campaigns.totalCampaigns' as any),
          fontSize: 11,
          fill: '#9ca3af',
          textAlign: 'center',
        },
      },
    ],
    series: [
      {
        type: 'pie',
        radius: ['55%', '80%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: false,
        label: { show: false },
        emphasis: {
          label: { show: false },
        },
        data,
      },
    ],
  }
})

// --- Chart 2: Step Completion Rate ---
const STEP_KEYS: { key: keyof Campaign; labelKey: string }[] = [
  { key: 'segmentation_completed', labelKey: 'dashboard.campaigns.stepSegmentation' },
  { key: 'ppc_viability_completed', labelKey: 'dashboard.campaigns.stepPPC' },
  { key: 'funnel_completed', labelKey: 'dashboard.campaigns.stepFunnel' },
  { key: 'content_strategy_completed', labelKey: 'dashboard.campaigns.stepContent' },
  { key: 'meta_ads_completed', labelKey: 'dashboard.campaigns.stepMetaAds' },
  { key: 'google_ads_completed', labelKey: 'dashboard.campaigns.stepGoogleAds' },
  { key: 'linkedin_ads_completed', labelKey: 'dashboard.campaigns.stepLinkedInAds' },
]

const stepCompletionOption = computed(() => {
  const list = campaignList.value
  const total = list.length || 1
  const rates = STEP_KEYS.map(({ key, labelKey }) => {
    const completed = list.filter((c) => c[key]).length
    return {
      name: t(labelKey as any),
      rate: Math.round((completed / total) * 100),
    }
  })

  return {
    ...baseOption.value,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params
        return `${p.name}: ${p.value}%`
      },
    },
    grid: {
      left: dir.value === 'rtl' ? '3%' : '28%',
      right: dir.value === 'rtl' ? '28%' : '3%',
      top: '6%',
      bottom: '6%',
      containLabel: false,
    },
    xAxis: {
      type: 'value' as const,
      max: 100,
      axisLabel: { color: '#6b7280', formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'category' as const,
      data: rates.map((r) => r.name),
      inverse: true,
      axisLabel: { color: '#d1d5db', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar',
        data: rates.map((r) => ({
          value: r.rate,
          itemStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: '#7c3aed' },
                { offset: 1, color: '#a78bfa' },
              ],
            },
            borderRadius: dir.value === 'rtl' ? [4, 0, 0, 4] : [0, 4, 4, 0],
          },
        })),
        barWidth: '55%',
        label: {
          show: true,
          position: dir.value === 'rtl' ? 'left' : 'right',
          color: '#9ca3af',
          fontSize: 11,
          formatter: '{c}%',
        },
      },
    ],
  }
})

// --- Chart 3: Top 5 Active Campaigns Progress ---
const STEP_COLORS = [
  '#8b5cf6', // segmentation - primary purple
  '#6366f1', // ppc - indigo
  '#3b82f6', // funnel - blue
  '#06b6d4', // content - cyan
  '#22c55e', // meta ads - green
  '#f59e0b', // google ads - amber
  '#ef4444', // linkedin ads - red
]

const activeCampaignsOption = computed(() => {
  const list = campaignList.value
  const active = list
    .filter((c) => c.status === 'in_progress' || c.status === 'draft')
    .slice(0, 5)

  if (active.length === 0) {
    return {
      ...baseOption.value,
      title: {
        text: t('dashboard.campaigns.noActiveCampaigns' as any),
        left: 'center',
        top: 'center',
        textStyle: { color: '#6b7280', fontSize: 13, fontWeight: 'normal' },
      },
    }
  }

  const campaignNames = active.map((c) => {
    const name = c.name || c.campaign_uuid.slice(0, 8)
    return name.length > 20 ? name.slice(0, 18) + '...' : name
  })

  const seriesData = STEP_KEYS.map((step, i) => ({
    name: t(step.labelKey as any),
    type: 'bar',
    stack: 'total',
    barWidth: '50%',
    emphasis: { focus: 'series' as const },
    itemStyle: { color: STEP_COLORS[i] },
    data: active.map((c) => (c[step.key] ? 1 : 0)),
  }))

  return {
    ...baseOption.value,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
    },
    legend: {
      show: false,
    },
    grid: {
      left: dir.value === 'rtl' ? '3%' : '32%',
      right: dir.value === 'rtl' ? '32%' : '3%',
      top: '6%',
      bottom: '6%',
      containLabel: false,
    },
    xAxis: {
      type: 'value' as const,
      max: 7,
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'category' as const,
      data: campaignNames,
      inverse: true,
      axisLabel: { color: '#d1d5db', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: seriesData,
  }
})

// --- Chart 4: Platform Distribution (mock) ---
const platformDistOption = computed(() => {
  const platforms = [
    { name: 'Meta', tofu: 35, mofu: 25, bofu: 15 },
    { name: 'Google', tofu: 28, mofu: 22, bofu: 18 },
    { name: 'LinkedIn', tofu: 20, mofu: 12, bofu: 8 },
  ]

  const funnelColors = ['#8b5cf6', '#06b6d4', '#f59e0b']
  const funnelLabels = [
    t('dashboard.campaigns.tofu' as any),
    t('dashboard.campaigns.mofu' as any),
    t('dashboard.campaigns.bofu' as any),
  ]

  const funnelKeys: ('tofu' | 'mofu' | 'bofu')[] = ['tofu', 'mofu', 'bofu']

  return {
    ...baseOption.value,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#9ca3af', fontSize: 11 },
      data: funnelLabels,
    },
    grid: {
      left: dir.value === 'rtl' ? '3%' : '22%',
      right: dir.value === 'rtl' ? '22%' : '3%',
      top: '8%',
      bottom: '16%',
      containLabel: false,
    },
    xAxis: {
      type: 'value' as const,
      axisLabel: { color: '#6b7280' },
      splitLine: { lineStyle: { color: '#1f2937' } },
    },
    yAxis: {
      type: 'category' as const,
      data: platforms.map((p) => p.name),
      inverse: true,
      axisLabel: { color: '#d1d5db', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: funnelKeys.map((key, i) => ({
      name: funnelLabels[i],
      type: 'bar',
      stack: 'total',
      barWidth: '50%',
      emphasis: { focus: 'series' as const },
      itemStyle: { color: funnelColors[i] },
      data: platforms.map((p) => p[key]),
    })),
  }
})
</script>

<template>
  <div data-loc="dashboard.campaign-performance">
    <!-- Loading state -->
    <div
      v-if="isLoading"
      class="flex items-center justify-center py-16"
    >
      <div class="flex flex-col items-center gap-3">
        <Activity class="h-8 w-8 text-primary animate-pulse" />
        <p class="text-sm text-muted-foreground">{{ t('dashboard.campaigns.loading' as any) }}</p>
      </div>
    </div>

    <!-- No data state -->
    <div
      v-else-if="campaignList.length === 0"
      class="flex items-center justify-center py-16"
    >
      <p class="text-sm text-muted-foreground">{{ t('dashboard.campaigns.noData' as any) }}</p>
    </div>

    <!-- Charts grid -->
    <div
      v-else
      class="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      <!-- Chart 1: Status Donut -->
      <div class="surface-card rounded-xl p-4">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          {{ t('dashboard.campaigns.statusDonut' as any) }}
        </h4>
        <div style="height: 280px">
          <VChart :option="statusDonutOption" autoresize />
        </div>
      </div>

      <!-- Chart 2: Step Completion Rate -->
      <div class="surface-card rounded-xl p-4">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          {{ t('dashboard.campaigns.stepCompletion' as any) }}
        </h4>
        <div style="height: 280px">
          <VChart :option="stepCompletionOption" autoresize />
        </div>
      </div>

      <!-- Chart 3: Top 5 Active Campaigns Progress -->
      <div class="surface-card rounded-xl p-4">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          {{ t('dashboard.campaigns.progress' as any) }}
        </h4>
        <div style="height: 280px">
          <VChart :option="activeCampaignsOption" autoresize />
        </div>
      </div>

      <!-- Chart 4: Platform Distribution -->
      <div class="surface-card rounded-xl p-4">
        <h4 class="text-sm font-semibold text-foreground mb-3">
          {{ t('dashboard.campaigns.platformDist' as any) }}
        </h4>
        <div style="height: 280px">
          <VChart :option="platformDistOption" autoresize />
        </div>
      </div>
    </div>
  </div>
</template>
