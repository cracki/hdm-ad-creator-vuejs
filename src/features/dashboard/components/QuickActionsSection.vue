<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  Building2, Megaphone, TrendingUp, Brain,
  Sparkles, Layers, ArrowRight,
} from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

interface ActionItem {
  to: string
  icon: typeof Building2
  titleKey: string
  subtitleKey: string
  colorClass: string
  bgClass: string
  dataLoc: string
}

const actions: ActionItem[] = [
  {
    to: '/brands/new',
    icon: Building2,
    titleKey: 'brands.new',
    subtitleKey: 'dashboard.quickActions.brandSubtitle' as any,
    colorClass: 'text-primary',
    bgClass: 'bg-[image:var(--gradient-brand)]',
    dataLoc: 'dashboard.quick-new-brand',
  },
  {
    to: '/campaigns/new',
    icon: Megaphone,
    titleKey: 'camp.newCampaign',
    subtitleKey: 'camp.emptyDesc',
    colorClass: 'text-accent-cyan',
    bgClass: 'bg-accent-cyan/20',
    dataLoc: 'dashboard.quick-new-campaign',
  },
  {
    to: '/campaigns/full-funnel',
    icon: TrendingUp,
    titleKey: 'funnelLauncher.title',
    subtitleKey: 'funnelLauncher.subtitle',
    colorClass: 'text-accent-magenta',
    bgClass: 'bg-accent-magenta/20',
    dataLoc: 'dashboard.quick-full-funnel',
  },
  {
    to: '/market/intelligence',
    icon: Brain,
    titleKey: 'dashboard.quick.marketIntelligence',
    subtitleKey: 'dashboard.quick.marketIntelligenceDesc',
    colorClass: 'text-accent-amber',
    bgClass: 'bg-accent-amber/20',
    dataLoc: 'dashboard.quick-market',
  },
  {
    to: '/ad-library',
    icon: Sparkles,
    titleKey: 'dashboard.quick.adLibrary',
    subtitleKey: 'dashboard.quick.adLibraryDesc',
    colorClass: 'text-success',
    bgClass: 'bg-success/20',
    dataLoc: 'dashboard.quick-ad-library',
  },
  {
    to: '/scenario-variants',
    icon: Layers,
    titleKey: 'dashboard.quick.scenarioVariants',
    subtitleKey: 'dashboard.quick.scenarioVariantsDesc',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/20',
    dataLoc: 'dashboard.quick-scenario',
  },
]
</script>

<template>
  <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
    <RouterLink
      v-for="action in actions"
      :key="action.to"
      :to="action.to"
      :data-loc="action.dataLoc"
      class="surface-card p-4 flex items-center gap-3 hover:border-primary/40 transition group"
    >
      <div
        class="h-10 w-10 rounded-lg grid place-items-center shrink-0 group-hover:scale-105 transition-transform"
        :class="action.bgClass"
      >
        <component
          :is="action.icon"
          class="h-4 w-4"
          :class="[action.bgClass.includes('gradient-brand') ? 'text-primary-foreground' : action.colorClass]"
        />
      </div>
      <div class="min-w-0">
        <div class="text-sm font-medium">{{ t(action.titleKey as any) }}</div>
        <div class="text-[11px] text-muted-foreground">{{ t(action.subtitleKey as any) }}</div>
      </div>
      <ArrowRight class="h-4 w-4 text-muted-foreground ms-auto group-hover:translate-x-0.5 transition-transform" />
    </RouterLink>
  </div>
</template>
