<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import VChart from 'vue-echarts'
import { Activity } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useEChartsLocale } from '@/shared/plugins/echarts'
import { useBrands } from '@/features/brands/queries'

const { t, lang, dir } = useI18n()
const echartsLocale = useEChartsLocale(lang)
const { data: brands } = useBrands()

const COLORS = ['#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e']
const radarIndicators = computed(() => [
  { name: t('dashboard.brandHealth.analysis' as any), max: 100 },
  { name: t('dashboard.brandHealth.competitors' as any), max: 100 },
  { name: t('dashboard.brandHealth.social' as any), max: 100 },
  { name: t('dashboard.brandHealth.assets' as any), max: 100 },
])

interface BrandScore {
  brand_uuid: string
  company_name: string
  industry: string
  score: number
  radarValues: number[]
}

const brandScores = computed<BrandScore[]>(() => {
  if (!brands.value) return []

  return brands.value.map((brand) => {
    let analysis = 10
    let competitors = 10
    let socialMedia = 10
    let assets = 10

    if (brand.selected_industry?.name) {
      analysis += 25
      competitors += 20
    }
    if (brand.company_name.length > 3) {
      analysis += 15
    }
    if (brand.website_url && brand.website_url.length > 5) {
      socialMedia += 25
      assets += 20
    }

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(brand.created_at).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (daysSinceCreation > 7) {
      analysis += 20
      competitors += 15
      socialMedia += 15
      assets += 15
    }

    analysis = Math.min(analysis, 100)
    competitors = Math.min(competitors, 100)
    socialMedia = Math.min(socialMedia, 100)
    assets = Math.min(assets, 100)

    const score = Math.round((analysis + competitors + socialMedia + assets) / 4)

    return {
      brand_uuid: brand.brand_uuid,
      company_name: brand.company_name,
      industry: brand.selected_industry?.name ?? '',
      score,
      radarValues: [analysis, competitors, socialMedia, assets],
    }
  })
})

const topBrands = computed(() => brandScores.value.slice(0, 5))

const radarOption = computed(() => ({
  rtl: dir.value === 'rtl',
  locale: echartsLocale.value,
  tooltip: {
    trigger: 'item',
    backgroundColor: 'rgba(15, 15, 20, 0.9)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    textStyle: { color: '#e2e8f0', fontSize: 12 },
  },
  legend: {
    show: topBrands.value.length > 1,
    bottom: 0,
    textStyle: { color: '#94a3b8', fontSize: 11 },
    itemWidth: 12,
    itemHeight: 8,
  },
  radar: {
    indicator: radarIndicators.value,
    shape: 'polygon' as const,
    radius: '65%',
    axisName: {
      color: '#94a3b8',
      fontSize: 11,
    },
    splitArea: {
      areaStyle: { color: ['rgba(139, 92, 246, 0.02)', 'rgba(139, 92, 246, 0.05)'] },
    },
    splitLine: {
      lineStyle: { color: 'rgba(148, 163, 184, 0.12)' },
    },
    axisLine: {
      lineStyle: { color: 'rgba(148, 163, 184, 0.12)' },
    },
  },
  series: [
    {
      type: 'radar',
      data: topBrands.value.map((b, i) => ({
        name: b.company_name,
        value: b.radarValues,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: COLORS[i] },
        itemStyle: { color: COLORS[i] },
        areaStyle: { color: COLORS[i], opacity: 0.15 },
      })),
    },
  ],
}))

function getScoreColor(score: number): string {
  if (score > 60) return '#22c55e'
  if (score > 30) return '#f59e0b'
  return '#ef4444'
}

function getScoreBarClass(score: number): string {
  if (score > 60) return 'bg-emerald-500'
  if (score > 30) return 'bg-amber-500'
  return 'bg-red-500'
}

function getCompanyInitial(name: string): string {
  return name.charAt(0).toUpperCase()
}
</script>

<template>
  <div data-loc="dashboard.brand-health">
    <!-- Radar Chart -->
    <VChart
      v-if="topBrands.length > 0"
      :option="radarOption"
      autoresize
      style="height: 320px; width: 100%"
    />

    <!-- Empty State -->
    <div
      v-if="!brands || brands.length === 0"
      class="flex flex-col items-center justify-center py-12 text-center"
    >
      <div class="h-12 w-12 rounded-xl bg-primary/10 grid place-items-center mb-3">
        <Activity class="h-6 w-6 text-primary" />
      </div>
      <p class="text-sm text-muted-foreground">
        {{ t('dashboard.brandHealth.noBrands' as any) }}
      </p>
    </div>

    <!-- Brand List -->
    <div v-if="brandScores.length > 0" class="mt-4 space-y-2">
      <RouterLink
        v-for="brand in brandScores"
        :key="brand.brand_uuid"
        :to="`/brands/${brand.brand_uuid}`"
        class="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors group"
      >
        <!-- Company Initial -->
        <div
          class="h-8 w-8 rounded-full grid place-items-center text-xs font-bold shrink-0"
          :style="{
            backgroundColor: `${getScoreColor(brand.score)}20`,
            color: getScoreColor(brand.score),
          }"
        >
          {{ getCompanyInitial(brand.company_name) }}
        </div>

        <!-- Name + Industry -->
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {{ brand.company_name }}
          </p>
          <p v-if="brand.industry" class="text-[11px] text-muted-foreground truncate">
            {{ brand.industry }}
          </p>
        </div>

        <!-- Progress Bar -->
        <div class="flex items-center gap-2 shrink-0 w-28">
          <div class="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="getScoreBarClass(brand.score)"
              :style="{ width: `${brand.score}%` }"
            />
          </div>
          <span class="text-[11px] text-muted-foreground tabular-nums w-8 text-end">
            {{ brand.score }}%
          </span>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
