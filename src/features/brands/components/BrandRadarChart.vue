<script setup lang="ts">
import { computed } from 'vue'
import VChart from 'vue-echarts'
import { useI18n } from '@/shared/utils/i18n'
import type { DimensionScore } from './personality'

/**
 * Brand personality radar. ECharts renders LTR canvas regardless of page
 * direction — keep the chart unmirrored and let the localized axis names
 * (prettified dimension labels) render inside the canvas.
 */
const props = defineProps<{
  dimensions: DimensionScore[]
}>()

const { t } = useI18n()

function prettify(name: string): string {
  return name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const indicators = computed(() =>
  props.dimensions.map((d) => ({
    name: prettify(d.name),
    max: Math.max(100, Math.ceil(d.value / 10) * 10),
  })),
)

const option = computed(() => ({
  tooltip: {
    trigger: 'item' as const,
    backgroundColor: 'rgba(15, 15, 20, 0.9)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  radar: {
    indicator: indicators.value,
    shape: 'polygon' as const,
    radius: '65%',
    startAngle: 90,
    axisName: { color: '#94a3b8', fontSize: 11 },
    splitArea: { areaStyle: { color: ['rgba(139, 92, 246, 0.02)', 'rgba(139, 92, 246, 0.05)'] } },
    splitLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
    axisLine: { lineStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
  },
  series: [
    {
      type: 'radar' as const,
      data: [
        {
          name: t('analysis.personality.radarTitle' as any),
          value: props.dimensions.map((d) => d.value),
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 2, color: '#8b5cf6' },
          itemStyle: { color: '#8b5cf6' },
          areaStyle: { color: '#8b5cf6', opacity: 0.18 },
        },
      ],
    },
  ],
}))
</script>

<template>
  <div data-testid="brand-radar" class="w-full">
    <VChart :option="option" autoresize style="height: 260px; width: 100%" />
  </div>
</template>
