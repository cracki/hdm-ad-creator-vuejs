<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'
import { useAdLibraryRuns } from '@/features/adLibrary/queries'

const { t, lang, dir } = useI18n()
const echartsLocale = useEChartsLocale(lang)

const { data: runs, isLoading } = useAdLibraryRuns()

const isEmpty = computed(() => !isLoading.value && (!runs.value || runs.value.length === 0))

const platformStats = computed(() => {
  const list = runs.value ?? []
  const platforms: Record<string, number> = { meta: 0, google: 0, linkedin: 0 }

  for (const run of list) {
    // Platform info may be in request_payload.platforms (array) or request_payload.platform
    const payload = (run as unknown as Record<string, unknown>).request_payload as Record<string, unknown> | undefined
    const raw = payload?.platforms ?? payload?.platform
    const platformList = Array.isArray(raw) ? raw : raw ? [raw] : []

    if (platformList.length === 0) {
      // Default to meta if no platform info
      platforms['meta']++
      continue
    }

    for (const p of platformList) {
      const lower = String(p).toLowerCase()
      if (lower.includes('google')) platforms['google']++
      else if (lower.includes('linkedin')) platforms['linkedin']++
      else platforms['meta']++
    }
  }

  return platforms
})

const totalRuns = computed(() => {
  const stats = platformStats.value
  return stats.meta + stats.google + stats.linkedin
})

const recentCount = computed(() => {
  const list = runs.value ?? []
  const dayMs = 7 * 24 * 60 * 60 * 1000
  return list.filter(r => Date.now() - new Date(r.created_at ?? Date.now()).getTime() < dayMs).length
})

const chartOption = computed(() => {
  if (isEmpty.value) return null

  const stats = platformStats.value
  const platformLabels = [
    t('dashboard.adGeneration.meta' as any),
    t('dashboard.adGeneration.google' as any),
    t('dashboard.adGeneration.linkedin' as any),
  ]
  const values = [stats.meta, stats.google, stats.linkedin]
  const colors = ['#06b6d4', '#a855f7', '#ec4899']

  return {
    rtl: dir.value === 'rtl',
    locale: echartsLocale.value,
    tooltip: {
      trigger: 'axis' as const,
      axisPointer: { type: 'shadow' as const },
      backgroundColor: 'rgba(15,15,20,0.9)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: {
      left: dir.value === 'rtl' ? 60 : 80,
      right: 20,
      top: 8,
      bottom: 8,
    },
    xAxis: {
      type: 'value' as const,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    yAxis: {
      type: 'category' as const,
      data: platformLabels,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      axisTick: { show: false },
    },
    series: [
      {
        type: 'bar' as const,
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: dir.value === 'rtl' ? [4, 0, 0, 4] : [0, 4, 4, 0] },
        })),
        barWidth: 20,
      },
    ],
  }
})
</script>

<template>
  <!-- Empty state -->
  <div v-if="isEmpty" class="flex flex-col items-center justify-center py-10 text-center">
    <div class="h-12 w-12 rounded-xl bg-accent-magenta/15 grid place-items-center mb-3">
      <Sparkles class="h-6 w-6 text-accent-magenta" />
    </div>
    <p class="text-sm text-muted-foreground">{{ t('dashboard.adGeneration.empty' as any) }}</p>
  </div>

  <!-- Chart + stats -->
  <template v-else>
    <VChart
      v-if="chartOption"
      :option="chartOption"
      :loading="isLoading"
      autoresize
      style="height: 280px; width: 100%"
    />

    <!-- Stat row -->
    <div class="flex items-center gap-4 mt-3 pt-3 border-t border-overlay-subtle">
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ t('dashboard.adGeneration.totalRuns' as any) }}</span>
        <span class="text-sm font-semibold">{{ totalRuns }}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-muted-foreground">{{ t('dashboard.adGeneration.last7d' as any) }}</span>
        <span class="text-sm font-semibold text-success">{{ recentCount }}</span>
      </div>
    </div>
  </template>
</template>
