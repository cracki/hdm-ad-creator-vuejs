<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Brain, Target, Layers, Grid3x3, MonitorSmartphone, Settings2,
  Sparkles, Image as ImageIcon, Download,
  Check, Lock, ChevronRight,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import Breadcrumb from '@/shared/components/Breadcrumb.vue'
import { useCampaign } from '../queries'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)

const breadcrumbs = computed(() => [
  { label: t('breadcrumb.campaigns'), to: '/campaigns' },
  { label: campaign.value?.name ?? 'Campaign' },
])

interface StepDef {
  labelKey: string
  icon: any
  routeSuffix: string
  flag: string
}

const STEPS: StepDef[] = [
  { labelKey: 'smart.s1', icon: Brain, routeSuffix: 'segmentation', flag: 'segmentation_completed' },
  { labelKey: 'smart.s3', icon: Target, routeSuffix: 'ppc-viability', flag: 'ppc_viability_completed' },
  { labelKey: 'smart.s4', icon: Layers, routeSuffix: 'funnel', flag: 'funnel_completed' },
  { labelKey: 'smart.s5', icon: Grid3x3, routeSuffix: 'content', flag: 'content_strategy_completed' },
  { labelKey: 'platform.title', icon: MonitorSmartphone, routeSuffix: 'platform', flag: '_platform_selected' },
  { labelKey: 'strategy.title', icon: Settings2, routeSuffix: 'ads-strategy', flag: '_ads_strategy_done' },
  { labelKey: 'adgen.title', icon: Sparkles, routeSuffix: 'generate-ads', flag: '_ads_generated' },
  { labelKey: 'visual.title', icon: ImageIcon, routeSuffix: 'visuals', flag: '_visuals_generated' },
  { labelKey: 'review.title', icon: Download, routeSuffix: 'review', flag: '_review' },
]

function isStepDone(step: StepDef): boolean {
  if (step.flag.startsWith('_')) {
    const idx = STEPS.indexOf(step)
    return idx > 0 ? STEPS.slice(0, idx).every((s) => isStepDone(s)) : false
  }
  return (campaign.value as any)?.[step.flag] ?? false
}

function canNavigate(step: StepDef): boolean {
  if (!campaign.value) return false
  const idx = STEPS.indexOf(step)
  if (idx === 0) return true
  return isStepDone(STEPS[idx - 1])
}

function navigateToStep(step: StepDef) {
  if (!canNavigate(step)) return
  router.push(`/campaigns/${campaignUuid.value}/${step.routeSuffix}`)
}

function getFirstIncompleteStep(): StepDef | undefined {
  return STEPS.find((s) => !isStepDone(s))
}

const hasAutoRedirected = ref(false)

watch(campaign, (c) => {
  if (!c || hasAutoRedirected.value) return
  const lastSegment = route.path.split('/').pop()
  if (lastSegment === campaignUuid.value) {
    hasAutoRedirected.value = true
    const first = getFirstIncompleteStep()
    if (first) navigateToStep(first)
  }
})
</script>

<template>
  <Topbar
    :title="campaign?.name ?? t('camp.loading')"
    :subtitle="campaign?.brand?.company_name"
  />
  <main class="flex-1 p-4 sm:p-6">
    <Breadcrumb :items="breadcrumbs" :show-back="true" back-to="/campaigns" />
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>

    <div v-else-if="campaign" class="max-w-2xl mx-auto space-y-2">
      <div
        v-for="(step, idx) in STEPS"
        :key="step.routeSuffix"
        :class="[
          'surface-card p-4 flex items-center gap-3 sm:gap-4 transition cursor-pointer',
          canNavigate(step) ? 'hover:border-primary/40' : 'opacity-50 cursor-not-allowed',
        ]"
        @click="navigateToStep(step)"
      >
        <!-- Icon -->
        <div
          :class="[
            'h-10 w-10 rounded-lg grid place-items-center shrink-0 border',
            isStepDone(step) ? 'bg-success/15 border-success/40 text-success' :
            idx === STEPS.findIndex(s => !isStepDone(s)) ? 'bg-[image:var(--gradient-brand)] border-transparent text-primary-foreground' :
            'border-border/60 text-muted-foreground',
          ]"
        >
          <Check v-if="isStepDone(step)" class="h-4 w-4" />
          <component :is="step.icon" v-else class="h-4 w-4" />
        </div>

        <!-- Label -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium">{{ t(step.labelKey as any) }}</div>
          <div class="text-[11px] text-muted-foreground mt-0.5">
            {{ isStepDone(step) ? t('status.completed') : idx === STEPS.findIndex(s => !isStepDone(s)) ? t('smart.inProgress') : t('smart.locked') }}
          </div>
        </div>

        <!-- Status -->
        <component :is="canNavigate(step) ? ChevronRight : Lock" class="h-4 w-4 text-muted-foreground/50" />
      </div>
    </div>
  </main>
</template>
