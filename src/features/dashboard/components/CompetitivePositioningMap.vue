<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { MapPin } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'
import { useBrands } from '@/features/brands/queries'

const { t, lang, dir } = useI18n()
const echartsLocale = useEChartsLocale(lang)

const { data: brands, isLoading } = useBrands()

const isEmpty = computed(() => !isLoading.value && (!brands.value || brands.value.length === 0))

const hasBrands = computed(() => brands.value != null && brands.value.length > 0)

// Mock quadrant data for placeholder scatter chart
const chartOption = computed(() => {
  if (isEmpty.value) return null

  // Mock data: quadrant scatter points
  const mockData = [
    // Leaders (high reach, high engagement)
    { value: [75, 82], name: 'Competitor A', category: 'leaders' },
    { value: [68, 76], name: 'Competitor B', category: 'leaders' },
    // Challengers (high reach, low engagement)
    { value: [72, 35], name: 'Competitor C', category: 'challengers' },
    { value: [80, 28], name: 'Competitor D', category: 'challengers' },
    // Niche (low reach, high engagement)
    { value: [30, 70], name: 'Competitor E', category: 'niche' },
    { value: [25, 65], name: 'Competitor F', category: 'niche' },
    // Weak (low reach, low engagement)
    { value: [20, 22], name: 'Competitor G', category: 'weak' },
    { value: [15, 18], name: 'Competitor H', category: 'weak' },
  ]

  const categoryColors: Record<string, string> = {
    leaders: '#22c55e',
    challengers: '#06b6d4',
    niche: '#f59e0b',
    weak: '#94a3b8',
  }

  return {
    rtl: dir.value === 'rtl',
    locale: echartsLocale.value,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: 'rgba(15,15,20,0.9)',
      borderColor: 'rgba(255,255,255,0.08)',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params: { data: { name: string; value: number[] } }) => {
        const d = params.data
        return `<strong>${d.name}</strong><br/>${t('dashboard.competitiveMap.reach' as any)}: ${d.value[0]}<br/>${t('dashboard.competitiveMap.engagement' as any)}: ${d.value[1]}`
      },
    },
    grid: {
      left: dir.value === 'rtl' ? 20 : 50,
      right: 30,
      top: 40,
      bottom: 44,
    },
    xAxis: {
      type: 'value' as const,
      name: t('dashboard.competitiveMap.reach' as any),
      nameLocation: 'middle' as const,
      nameGap: 28,
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      min: 0,
      max: 100,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    yAxis: {
      type: 'value' as const,
      name: t('dashboard.competitiveMap.engagement' as any),
      nameLocation: 'middle' as const,
      nameGap: 36,
      nameTextStyle: { color: '#94a3b8', fontSize: 11 },
      min: 0,
      max: 100,
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.04)' } },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.08)' } },
    },
    series: [
      {
        type: 'scatter' as const,
        data: mockData.map(d => ({
          value: d.value,
          name: d.name,
          itemStyle: { color: categoryColors[d.category], opacity: 0.85 },
        })),
        symbolSize: 16,
        emphasis: {
          itemStyle: { opacity: 1, borderColor: '#fff', borderWidth: 2 },
        },
        markLine: {
          silent: true,
          lineStyle: { color: 'rgba(255,255,255,0.08)', type: 'dashed' as const },
          data: [
            { xAxis: 50 },
            { yAxis: 50 },
          ],
        },
        markArea: {
          silent: true,
          data: [
            [
              {
                coord: [50, 50],
                itemStyle: { color: 'rgba(34,197,94,0.04)' },
                label: {
                  show: true,
                  position: 'insideTopEnd' as const,
                  formatter: t('dashboard.competitiveMap.leaders' as any),
                  color: '#4ade80',
                  fontSize: 10,
                },
              },
              { coord: [100, 100] },
            ],
            [
              {
                coord: [0, 50],
                itemStyle: { color: 'rgba(6,182,212,0.04)' },
                label: {
                  show: true,
                  position: 'insideTopStart' as const,
                  formatter: t('dashboard.competitiveMap.challengers' as any),
                  color: '#22d3ee',
                  fontSize: 10,
                },
              },
              { coord: [50, 100] },
            ],
            [
              {
                coord: [50, 0],
                itemStyle: { color: 'rgba(245,158,11,0.04)' },
                label: {
                  show: true,
                  position: 'insideBottomEnd' as const,
                  formatter: t('dashboard.competitiveMap.niche' as any),
                  color: '#fbbf24',
                  fontSize: 10,
                },
              },
              { coord: [100, 50] },
            ],
            [
              {
                coord: [0, 0],
                itemStyle: { color: 'rgba(148,163,184,0.04)' },
                label: {
                  show: true,
                  position: 'insideBottomStart' as const,
                  formatter: t('dashboard.competitiveMap.weak' as any),
                  color: '#94a3b8',
                  fontSize: 10,
                },
              },
              { coord: [50, 50] },
            ],
          ],
        },
      },
    ],
  }
})
</script>

<template>
  <!-- Empty state -->
  <div v-if="isEmpty" class="flex flex-col items-center justify-center py-10 text-center">
    <div class="h-12 w-12 rounded-xl bg-primary/15 grid place-items-center mb-3">
      <MapPin class="h-6 w-6 text-primary" />
    </div>
    <p class="text-sm text-muted-foreground">{{ t('dashboard.competitiveMap.empty' as any) }}</p>
  </div>

  <!-- Chart with hint -->
  <template v-else>
    <VChart
      v-if="chartOption"
      :option="chartOption"
      :loading="isLoading"
      autoresize
      style="height: 320px; width: 100%"
    />
    <p
      v-if="hasBrands"
      class="text-[11px] text-muted-foreground/70 mt-2 text-center"
    >
      {{ t('dashboard.competitiveMap.selectBrand' as any) }}
    </p>
  </template>
</template>
