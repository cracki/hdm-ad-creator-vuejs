<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { Brain } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'
import { useContentIntelligenceHistory } from '@/features/market/queries'

const { t, lang, dir } = useI18n()
const echartsLocale = useEChartsLocale(lang)

const { data: history, isLoading } = useContentIntelligenceHistory()

const isEmpty = computed(() => !isLoading.value && (!history.value || history.value.length === 0))

const chartOption = computed(() => {
  if (isEmpty.value) return null

  const runs = history.value ?? []
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  // Build a map of day-key => count for last 30 days
  const dayCounts = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * dayMs)
    const key = d.toISOString().slice(0, 10)
    dayCounts.set(key, 0)
  }

  for (const run of runs) {
    const runDate = new Date(run.created_at ?? Date.now()).toISOString().slice(0, 10)
    if (dayCounts.has(runDate)) {
      dayCounts.set(runDate, (dayCounts.get(runDate) ?? 0) + 1)
    }
  }

  const dates = [...dayCounts.keys()]
  const values = [...dayCounts.values()]

  return {
    rtl: dir.value === 'rtl',
    locale: echartsLocale.value,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: 'rgba(15,15,20,0.9)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    grid: {
      left: dir.value === 'rtl' ? 20 : 40,
      right: dir.value === 'rtl' ? 40 : 20,
      top: 16,
      bottom: 32,
    },
    xAxis: {
      type: 'category' as const,
      data: dates.map(d => d.slice(5)),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.06)' } },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      minInterval: 1,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
    },
    series: [
      {
        type: 'line' as const,
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#f59e0b' },
        areaStyle: {
          color: {
            type: 'linear' as const,
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245,158,11,0.25)' },
              { offset: 1, color: 'rgba(245,158,11,0.02)' },
            ],
          },
        },
      },
    ],
  }
})
</script>

<template>
  <!-- Empty state -->
  <div v-if="isEmpty" class="flex flex-col items-center justify-center py-10 text-center">
    <div class="h-12 w-12 rounded-xl bg-accent-amber/15 grid place-items-center mb-3">
      <Brain class="h-6 w-6 text-accent-amber" />
    </div>
    <p class="text-sm text-muted-foreground">{{ t('dashboard.contentIntelligence.empty' as any) }}</p>
  </div>

  <!-- Chart -->
  <template v-else>
    <VChart
      v-if="chartOption"
      :option="chartOption"
      :loading="isLoading"
      autoresize
      style="height: 280px; width: 100%"
    />
  </template>
</template>
