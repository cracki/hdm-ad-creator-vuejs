<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import {
  Building2, Megaphone, Sparkles, Brain,
  Plus, ArrowRight, TrendingUp, BarChart3, HelpCircle,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useAuthStore } from '@/features/auth/store'
import { useBrands } from '@/features/brands/queries'
import { useCampaigns } from '@/features/campaigns/queries'
import SkeletonLoader from '@/shared/components/SkeletonLoader.vue'
import GuidedAction from '@/shared/components/guided-actions/GuidedAction.vue'
import { useProductTour } from '@/shared/composables/useProductTour'

const { t } = useI18n()
const auth = useAuthStore()
const { data: brands, isLoading: brandsLoading } = useBrands()
const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
const { startTour } = useProductTour()

const isLoading = computed(() => brandsLoading.value || campaignsLoading.value)

const stats = computed(() => ({
  brands: brands.value?.length ?? 0,
  campaigns: campaigns.value?.length ?? 0,
  activeCampaigns: campaigns.value?.filter(c => c.status === 'in_progress').length ?? 0,
  completedCampaigns: campaigns.value?.filter(c => c.status === 'completed').length ?? 0,
}))

const firstName = computed(() => auth.user?.first_name || '')

const recentCampaigns = computed(() => {
  if (!campaigns.value) return []
  return [...campaigns.value]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
})

const recentBrands = computed(() => {
  if (!brands.value) return []
  return [...brands.value]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 3)
})
</script>

<template>
  <Topbar
    :title="t('dashboard.title')"
    :subtitle="t('dashboard.subtitle')"
  />

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <!-- Welcome -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold">
        {{ t('dashboard.welcomeBack') }}{{ firstName ? `, ${firstName}` : '' }}
      </h2>
    </div>

    <!-- Stats Cards -->
    <SkeletonLoader v-if="isLoading" variant="grid" :count="4" height="100px" />
    <div v-else class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
      <div class="surface-card p-4 sm:p-5" data-loc="dashboard.stat-brands">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-8 w-8 rounded-lg bg-primary/15 grid place-items-center">
            <Building2 class="h-4 w-4 text-primary" />
          </div>
          <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.totalBrands') }}</span>
        </div>
        <div class="text-2xl font-semibold">{{ stats.brands }}</div>
      </div>

      <div class="surface-card p-4 sm:p-5" data-loc="dashboard.stat-campaigns">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-8 w-8 rounded-lg bg-accent-cyan/15 grid place-items-center">
            <Megaphone class="h-4 w-4 text-accent-cyan" />
          </div>
          <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.activeCampaigns') }}</span>
        </div>
        <div class="text-2xl font-semibold">{{ stats.activeCampaigns }}</div>
      </div>

      <div class="surface-card p-4 sm:p-5" data-loc="dashboard.stat-ads">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-8 w-8 rounded-lg bg-accent-magenta/15 grid place-items-center">
            <Sparkles class="h-4 w-4 text-accent-magenta" />
          </div>
          <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.adsGenerated') }}</span>
        </div>
        <div class="text-2xl font-semibold">{{ stats.completedCampaigns }}</div>
      </div>

      <div class="surface-card p-4 sm:p-5" data-loc="dashboard.stat-analyses">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-8 w-8 rounded-lg bg-success/15 grid place-items-center">
            <Brain class="h-4 w-4 text-success" />
          </div>
          <span class="text-xs text-muted-foreground font-medium truncate">{{ t('dashboard.analysesCompleted') }}</span>
        </div>
        <div class="text-2xl font-semibold">{{ stats.campaigns }}</div>
      </div>
    </div>

    <!-- Welcome guided action (shown when no brands or campaigns exist) -->
    <GuidedAction
      v-if="!isLoading && stats.brands === 0 && stats.campaigns === 0"
      id="dashboard-welcome"
      variant="welcome"
      feature="dashboard"
      :icon="Sparkles"
      :title="t('guided.dashboard.title')"
      :description="t('guided.dashboard.desc')"
      :why="t('guided.dashboard.why')"
      :actions="[
        { labelKey: t('guided.dashboard.addBrand'), icon: Plus, to: '/brands/new', variant: 'primary' as const },
        { labelKey: t('guided.dashboard.tour'), icon: HelpCircle, variant: 'secondary' as const, handler: () => startTour('welcome') },
      ]"
      :steps="[
        { id: 'brand', title: t('guided.dashboard.step1'), description: t('guided.dashboard.step1Desc') },
        { id: 'campaign', title: t('guided.dashboard.step2'), description: t('guided.dashboard.step2Desc') },
        { id: 'ads', title: t('guided.dashboard.step3'), description: t('guided.dashboard.step3Desc') },
      ]"
      :show-progress="true"
      class="mb-8"
    />

    <!-- Quick Actions -->
    <div class="mb-8">
      <h3 class="text-sm font-semibold mb-3">{{ t('dashboard.quickActions') }}</h3>
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <RouterLink
          to="/brands/new"
          data-loc="dashboard.quick-new-brand"
          class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition group"
        >
          <div class="h-10 w-10 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
            <Plus class="h-4 w-4 text-primary-foreground" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium">{{ t('brands.new') }}</div>
            <div class="text-[11px] text-muted-foreground">{{ t('brands.addHint') }}</div>
          </div>
          <ArrowRight class="h-4 w-4 text-muted-foreground ms-auto group-hover:translate-x-0.5 transition-transform" />
        </RouterLink>

        <RouterLink
          to="/campaigns/new"
          data-loc="dashboard.quick-new-campaign"
          class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition group"
        >
          <div class="h-10 w-10 rounded-lg bg-accent-cyan/20 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
            <Megaphone class="h-4 w-4 text-accent-cyan" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium">{{ t('camp.newCampaign') }}</div>
            <div class="text-[11px] text-muted-foreground">{{ t('camp.emptyDesc') }}</div>
          </div>
          <ArrowRight class="h-4 w-4 text-muted-foreground ms-auto group-hover:translate-x-0.5 transition-transform" />
        </RouterLink>

        <RouterLink
          to="/campaigns/full-funnel"
          data-loc="dashboard.quick-full-funnel"
          class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition group"
        >
          <div class="h-10 w-10 rounded-lg bg-accent-magenta/20 grid place-items-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp class="h-4 w-4 text-accent-magenta" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-medium">{{ t('funnelLauncher.title') }}</div>
            <div class="text-[11px] text-muted-foreground">{{ t('funnelLauncher.subtitle') }}</div>
          </div>
          <ArrowRight class="h-4 w-4 text-muted-foreground ms-auto group-hover:translate-x-0.5 transition-transform" />
        </RouterLink>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="grid lg:grid-cols-2 gap-6">
      <!-- Recent Campaigns -->
      <div>
        <h3 class="text-sm font-semibold mb-3">{{ t('dashboard.recentActivity') }}</h3>
        <div v-if="isLoading" class="space-y-2">
          <SkeletonLoader variant="list" :count="3" height="60px" />
        </div>
        <div v-else-if="recentCampaigns.length === 0" class="surface-card p-6 text-center">
          <BarChart3 class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div class="text-sm text-muted-foreground">{{ t('camp.empty') }}</div>
        </div>
        <div v-else class="space-y-2">
          <RouterLink
            v-for="camp in recentCampaigns"
            :key="camp.campaign_uuid"
            :to="`/campaigns/${camp.campaign_uuid}`"
            data-loc="dashboard.recent-campaign"
            class="surface-card p-3 flex items-center gap-3 hover:border-primary/40 transition"
          >
            <div class="h-9 w-9 rounded-lg bg-accent-cyan/15 grid place-items-center shrink-0">
              <Megaphone class="h-4 w-4 text-accent-cyan" />
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ camp.name }}</div>
              <div class="text-[11px] text-muted-foreground">
                {{ camp.brand?.company_name ?? '—' }}
                <span class="ms-2">{{ new Date(camp.created_at).toLocaleDateString() }}</span>
              </div>
            </div>
            <span
              :class="[
                'text-[11px] font-medium px-2 py-0.5 rounded-md',
                camp.status === 'completed' ? 'bg-success/10 text-success' :
                camp.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                'bg-overlay-subtle text-muted-foreground',
              ]"
            >
              {{ camp.status }}
            </span>
          </RouterLink>
        </div>
      </div>

      <!-- Recent Brands -->
      <div>
        <h3 class="text-sm font-semibold mb-3">{{ t('brands.title') }}</h3>
        <div v-if="isLoading" class="space-y-2">
          <SkeletonLoader variant="list" :count="3" height="60px" />
        </div>
        <div v-else-if="recentBrands.length === 0" class="surface-card p-6 text-center">
          <Building2 class="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <div class="text-sm text-muted-foreground">{{ t('brands.add') }}</div>
        </div>
        <div v-else class="space-y-2">
          <RouterLink
            v-for="brand in recentBrands"
            :key="brand.brand_uuid"
            :to="`/brands/${brand.brand_uuid}`"
            data-loc="dashboard.recent-brand"
            class="surface-card p-3 flex items-center gap-3 hover:border-primary/40 transition"
          >
            <div class="h-9 w-9 rounded-lg bg-primary/15 grid place-items-center shrink-0 text-xs font-semibold text-primary">
              {{ brand.company_name.charAt(0).toUpperCase() }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ brand.company_name }}</div>
              <div class="text-[11px] text-muted-foreground">{{ brand.selected_industry?.name ?? '—' }}</div>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>
