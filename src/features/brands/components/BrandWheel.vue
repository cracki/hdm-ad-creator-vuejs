<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'
import type { TraitShare } from './personality'

/** Donut "brand wheel": trait composition of the detected archetype. */
const props = defineProps<{
  shares: TraitShare[]
}>()

const { lang } = useI18n()
const echartsLocale = useEChartsLocale(lang)

const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e', '#6366f1']

const option = computed(() => ({
  rtl: false, // ECharts canvas stays LTR; labels are localized strings.
  locale: echartsLocale.value,
  tooltip: {
    trigger: 'item' as const,
    backgroundColor: 'rgba(15, 15, 20, 0.9)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
    formatter: (params: { name: string; percent: number }) => `${params.name}: ${params.percent}%`,
  },
  legend: {
    bottom: 0,
    textStyle: { color: '#94a3b8', fontSize: 11 },
    itemWidth: 12,
    itemHeight: 8,
  },
  series: [
    {
      type: 'pie' as const,
      radius: ['48%', '72%'],
      center: ['50%', '44%'],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: 'rgba(15, 15, 20, 0.6)', borderWidth: 2 },
      label: {
        show: true,
        color: '#cbd5e1',
        fontSize: 10,
        formatter: '{d}%',
      },
      data: props.shares.map((s, i) => ({
        name: s.name,
        value: s.percent,
        itemStyle: { color: COLORS[i % COLORS.length] },
      })),
    },
  ],
}))
</script>

<template>
  <div data-testid="brand-wheel" class="w-full">
    <VChart :option="option" autoresize style="height: 260px; width: 100%" />
  </div>
</template>
