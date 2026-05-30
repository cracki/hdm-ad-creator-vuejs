<script setup lang="ts">
import { computed } from 'vue'
import {
  Building2, Megaphone, Sparkles, Brain, TrendingUp,
  TrendingDown, Minus, BarChart3,
} from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useAuthStore } from '@/features/auth/store'
import { useDashboardStats } from '../composables/useDashboardStats'

const { t } = useI18n()
const auth = useAuthStore()
const { stats } = useDashboardStats()

const firstName = computed(() => auth.user?.first_name || '')

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return t('dashboard.goodMorning' as any)
  if (h < 18) return t('dashboard.goodAfternoon' as any)
  return t('dashboard.goodEvening' as any)
})

const growthTrend = computed<'up' | 'down' | 'flat'>(() => {
  const s = stats.value
  if (s.brandGrowthLast7d > s.brandGrowthPrev7d) return 'up'
  if (s.brandGrowthLast7d < s.brandGrowthPrev7d) return 'down'
  return 'flat'
})
</script>

<template>
  <div class="mb-6">
    <h2 class="text-xl font-semibold">
      {{ greeting }}{{ firstName ? `، ${firstName}` : '' }}
    </h2>
    <p class="text-sm text-muted-foreground mt-1">{{ t('dashboard.subtitle' as any) }}</p>
  </div>

  <!-- KPI Cards -->
  <div class="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
    <!-- Total Brands -->
    <div class="surface-card p-4 sm:p-5 border-s-4 border-s-primary" data-loc="dashboard.kpi-brands">
      <div class="flex items-center gap-2 mb-3">
        <div class="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
          <Building2 class="h-4 w-4 text-primary" />
        </div>
        <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.totalBrands' as any) }}</span>
      </div>
      <div class="flex items-end gap-2">
        <span class="text-2xl font-bold font-display">{{ stats.brands }}</span>
        <span class="text-[11px] text-muted-foreground mb-1">
          +{{ stats.brandGrowthLast7d }} {{ t('dashboard.thisWeek' as any) }}
        </span>
      </div>
    </div>

    <!-- Active Campaigns -->
    <div class="surface-card p-4 sm:p-5 border-s-4 border-s-accent-cyan" data-loc="dashboard.kpi-campaigns">
      <div class="flex items-center gap-2 mb-3">
        <div class="h-8 w-8 rounded-lg bg-accent-cyan/15 grid place-items-center">
          <Megaphone class="h-4 w-4 text-accent-cyan" />
        </div>
        <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.activeCampaigns' as any) }}</span>
      </div>
      <div class="flex items-end gap-2">
        <span class="text-2xl font-bold font-display">{{ stats.activeCampaigns }}</span>
        <span class="text-[11px] text-muted-foreground mb-1">
          / {{ stats.totalCampaigns }} {{ t('dashboard.total' as any) }}
        </span>
      </div>
    </div>

    <!-- Completed -->
    <div class="surface-card p-4 sm:p-5 border-s-4 border-s-accent-magenta" data-loc="dashboard.kpi-completed">
      <div class="flex items-center gap-2 mb-3">
        <div class="h-8 w-8 rounded-lg bg-accent-magenta/15 grid place-items-center">
          <Sparkles class="h-4 w-4 text-accent-magenta" />
        </div>
        <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.completedCampaigns' as any) }}</span>
      </div>
      <span class="text-2xl font-bold font-display">{{ stats.completedCampaigns }}</span>
    </div>

    <!-- Intelligence -->
    <div class="surface-card p-4 sm:p-5 border-s-4 border-s-success" data-loc="dashboard.kpi-intelligence">
      <div class="flex items-center gap-2 mb-3">
        <div class="h-8 w-8 rounded-lg bg-success/15 grid place-items-center">
          <Brain class="h-4 w-4 text-success" />
        </div>
        <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.analysesCompleted' as any) }}</span>
      </div>
      <span class="text-2xl font-bold font-display">{{ stats.totalCampaigns }}</span>
    </div>

    <!-- Brand Growth -->
    <div class="surface-card p-4 sm:p-5 border-s-4 border-s-amber-400" data-loc="dashboard.kpi-growth">
      <div class="flex items-center gap-2 mb-3">
        <div class="h-8 w-8 rounded-lg bg-amber-400/15 grid place-items-center">
          <BarChart3 class="h-4 w-4 text-amber-400" />
        </div>
        <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.weeklyGrowth' as any) }}</span>
      </div>
      <div class="flex items-end gap-2">
        <span class="text-2xl font-bold font-display">{{ stats.brandGrowthLast7d }}</span>
        <component
          :is="growthTrend === 'up' ? TrendingUp : growthTrend === 'down' ? TrendingDown : Minus"
          class="h-4 w-4 mb-1"
          :class="growthTrend === 'up' ? 'text-success' : growthTrend === 'down' ? 'text-destructive' : 'text-muted-foreground'"
        />
      </div>
    </div>
  </div>
</template>
