import { computed, type ComputedRef } from 'vue'
import { use } from 'echarts/core'
import { BarChart, LineChart, PieChart, RadarChart, HeatmapChart, TreemapChart, ScatterChart, GaugeChart } from 'echarts/charts'
import {
  GridComponent, TooltipComponent, LegendComponent,
  CalendarComponent, RadarComponent, VisualMapComponent,
  VisualMapContinuousComponent, TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

use([
  BarChart, LineChart, PieChart, RadarChart,
  HeatmapChart, TreemapChart, ScatterChart, GaugeChart,
  GridComponent, TooltipComponent, LegendComponent,
  CalendarComponent, RadarComponent, VisualMapComponent,
  VisualMapContinuousComponent, TitleComponent,
  CanvasRenderer,
])

export function useEChartsLocale(lang: ComputedRef<string>) {
  return computed(() => {
    if (lang.value === 'fa') return 'FA'
    if (lang.value === 'ar') return 'AR'
    return undefined
  })
}
