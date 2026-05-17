<script setup lang="ts">
import { computed, watch, defineAsyncComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Brain, Users, Target, Layers, Grid3x3, MonitorSmartphone,
  Settings2, Sparkles, Image as ImageIcon, Download,
  Check, Lock, ArrowLeft, ArrowRight,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign, useCampaignAds } from '@/features/campaigns/queries'
import { useCampaignWizard, WIZARD_STEPS, getFirstIncompleteStep } from '@/features/campaigns/machines/campaignWizard'
import { useQueryClient } from '@tanstack/vue-query'

const Step1BrandIntelligence = defineAsyncComponent(() => import('./Step1BrandIntelligence.vue'))
const Step2AudienceStrategy = defineAsyncComponent(() => import('./Step2AudienceStrategy.vue'))
const Step3PPCViability = defineAsyncComponent(() => import('./Step3PPCViability.vue'))
const Step4FunnelDashboard = defineAsyncComponent(() => import('./Step4FunnelDashboard.vue'))
const Step5ContentMatrix = defineAsyncComponent(() => import('./Step5ContentMatrix.vue'))
const Step6PlatformSelection = defineAsyncComponent(() => import('./Step6PlatformSelection.vue'))
const Step7PlatformStrategy = defineAsyncComponent(() => import('./Step7PlatformStrategy.vue'))
const Step8AdGeneration = defineAsyncComponent(() => import('./Step8AdGeneration.vue'))
const Step9VisualCreator = defineAsyncComponent(() => import('./Step9VisualCreator.vue'))
const Step10Export = defineAsyncComponent(() => import('./Step10Export.vue'))

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const queryClient = useQueryClient()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignUuid)
const { data: ads } = useCampaignAds(campaignUuid)

const adsCount = computed(() => Array.isArray(ads.value) ? ads.value.length : 0)

const wizard = useCampaignWizard(
  computed(() => campaign.value ?? null),
  adsCount,
)

const ICONS: Record<string, any> = {
  Brain, Users, Target, Layers, Grid3x3, MonitorSmartphone,
  Settings2, Sparkles, ImageIcon, Download,
}

const stepFromRoute = computed(() => {
  const s = Number(route.params.stepNumber)
  return s >= 1 && s <= 10 ? s : null
})

// Sync route → wizard
watch(stepFromRoute, (s) => {
  if (s && wizard.canNavigateTo.value[s]) {
    wizard.initStep(s)
  }
}, { immediate: true })

// Sync wizard → route
watch(() => wizard.currentStep.value, (step) => {
  const target = `/campaigns/${campaignUuid.value}/wizard/${step}`
  if (route.path !== target) {
    router.replace(target)
  }
})

// Auto-redirect when campaign loads (no step in URL)
watch(campaign, (c) => {
  if (!c) return
  if (!stepFromRoute.value) {
    const first = getFirstIncompleteStep(c, adsCount.value)
    wizard.initStep(first)
  }
}, { immediate: true })

function onStepCompleted() {
  queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
}

function goToStep(n: number) {
  wizard.goToStep(n)
}

function goNext() {
  wizard.next()
}

function goBack() {
  wizard.back()
}

function saveAndExit() {
  router.push('/campaigns')
}

const { setActions } = usePageActions()
setActions([{ label: t('smart.saveExit'), icon: ArrowLeft, handler: saveAndExit }])

const stepComponent = computed(() => {
  switch (wizard.currentStep.value) {
    case 1: return Step1BrandIntelligence
    case 2: return Step2AudienceStrategy
    case 3: return Step3PPCViability
    case 4: return Step4FunnelDashboard
    case 5: return Step5ContentMatrix
    case 6: return Step6PlatformSelection
    case 7: return Step7PlatformStrategy
    case 8: return Step8AdGeneration
    case 9: return Step9VisualCreator
    case 10: return Step10Export
    default: return Step1BrandIntelligence
  }
})
</script>

<template>
  <Topbar
    :title="campaign?.name ?? ''"
    :subtitle="campaign?.brand?.company_name ?? ''"
  >
    <template #actions>
      <button data-loc="wizard.save-exit-btn" class="h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition" @click="saveAndExit">
        {{ t('smart.saveExit') }}
      </button>
    </template>
  </Topbar>

  <!-- Progress bar -->
  <div class="px-4 sm:px-6 py-3 border-b border-border/60 bg-background/40 backdrop-blur-xl">
    <div class="flex items-center gap-3">
      <span class="text-xs font-medium whitespace-nowrap">{{ t('smart.stepOf') }} {{ wizard.currentStep.value }}/10</span>
      <div data-loc="wizard.progress-bar" class="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div class="h-full rounded-full bg-[image:var(--gradient-brand)] relative transition-all duration-500" :style="{ width: `${wizard.progress.value}%` }">
          <div class="absolute inset-0 shimmer" />
        </div>
      </div>
      <span class="text-xs text-muted-foreground">{{ wizard.progress.value }}%</span>
    </div>
  </div>

  <!-- Mobile stepper -->
  <div class="lg:hidden border-b border-border/60 bg-surface/30 overflow-x-auto">
    <div class="flex items-center gap-1.5 px-4 py-2 min-w-max">
      <button
        v-for="step in WIZARD_STEPS"
        :key="step.n"
        data-loc="wizard.mobile-step"
        :class="[
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] sm:text-[11px] font-medium whitespace-nowrap transition',
          wizard.currentStep.value === step.n ? 'bg-[image:var(--gradient-brand)] text-primary-foreground' :
          wizard.stepCompletion.value[step.n] ? 'bg-success/15 text-success' : 'bg-white/[0.03] text-muted-foreground',
        ]"
        @click="goToStep(step.n)"
      >
        {{ step.n }}. {{ t(step.labelKey as any) }}
      </button>
    </div>
  </div>

  <div class="flex-1 grid lg:grid-cols-[280px_1fr] min-h-0">
    <!-- Desktop sidebar stepper -->
    <aside class="hidden lg:block border-e border-border/60 overflow-y-auto p-4 bg-surface/30">
      <div class="space-y-1">
        <button
          v-for="step in WIZARD_STEPS"
          :key="step.n"
          data-loc="wizard.desktop-step"
          :class="[
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition relative',
            wizard.currentStep.value === step.n ? 'bg-white/[0.05]' : 'hover:bg-white/[0.02]',
          ]"
          @click="goToStep(step.n)"
        >
          <span v-if="wizard.currentStep.value === step.n" class="absolute start-0 top-2 bottom-2 w-0.5 rounded-full bg-[image:var(--gradient-brand)]" />
          <div
            :class="[
              'h-7 w-7 rounded-lg grid place-items-center text-[11px] font-semibold shrink-0 border',
              wizard.stepCompletion.value[step.n] ? 'bg-success/15 border-success/40 text-success' :
              wizard.currentStep.value === step.n ? 'bg-[image:var(--gradient-brand)] border-transparent text-primary-foreground' :
              'border-border/60 text-muted-foreground',
            ]"
          >
            <Check v-if="wizard.stepCompletion.value[step.n]" class="h-3.5 w-3.5" />
            <template v-else>{{ step.n }}</template>
          </div>
          <div class="min-w-0 flex-1">
            <div :class="['text-xs font-medium truncate', wizard.currentStep.value === step.n ? '' : wizard.stepCompletion.value[step.n] ? 'text-foreground' : 'text-muted-foreground']">
              {{ t(step.labelKey as any) }}
            </div>
            <div class="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <component :is="ICONS[step.iconKey]" class="h-2.5 w-2.5" />
              {{ wizard.stepCompletion.value[step.n] ? t('smart.approved') : wizard.currentStep.value === step.n ? t('smart.inProgress') : t('smart.locked') }}
            </div>
          </div>
          <Lock v-if="!wizard.stepCompletion.value[step.n] && wizard.currentStep.value !== step.n" class="h-3 w-3 text-muted-foreground/50" />
        </button>
      </div>
    </aside>

    <!-- Step content -->
    <section class="overflow-y-auto">
      <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6 animate-[fade-up_0.4s_ease-out]">
        <div v-if="campaignLoading" class="flex justify-center py-20">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>

        <template v-else-if="campaign">
          <component
            :is="stepComponent"
            :campaign="campaign"
            :campaign-uuid="campaignUuid"
            @completed="onStepCompleted"
          />

          <!-- Navigation -->
          <div class="flex items-center justify-between gap-2 pt-4">
            <button
              data-loc="wizard.prev-btn"
              class="h-10 px-3 sm:px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition flex items-center gap-1.5"
              :class="{ 'opacity-50 pointer-events-none': !wizard.canGoBack.value }"
              @click="goBack"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span class="hidden sm:inline">{{ t('smart.previous') }}</span>
            </button>
            <button
              v-if="wizard.currentStep.value < 10"
              data-loc="wizard.continue-btn"
              :disabled="!wizard.canGoNext.value"
              class="h-10 px-4 sm:px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
              @click="goNext"
            >
              <span class="hidden sm:inline">{{ t('smart.approveContinue') }}</span>{{ t('smart.continue') }}
              <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>
