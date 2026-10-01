<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import { Target, ArrowLeft, ArrowRight, RefreshCw, Shield, Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import ErrorState from '@/shared/components/ErrorState.vue'
import StepReviewActions from '../components/StepReviewActions.vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useCampaign } from '../queries'
import { mergePpcBlueprints, ppcServiceList, campaignSelectedServices, splitPpcServicesBySelected } from '../types'
import PpcServiceCard from '../components/PpcServiceCard.vue'
import { useBrandServices } from '@/features/brands/queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { exportPPCViability } from '@/shared/utils/exportStep'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const queryClient = useQueryClient()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign } = useCampaign(campaignUuid)

// Detected brand services (F14) — primary source for the services list.
const brandUuid = computed(() => campaign.value?.brand?.brand_uuid ?? '')
const { data: detectedServices } = useBrandServices(brandUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const confetti = useConfetti()

const isPrereqMet = computed(() => campaign.value?.segmentation_completed ?? false)

const opKey = computed(() => `${campaignUuid.value}:ppc-viability`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => {
  if (result.value?.step) return result.value.step
  const latest = (campaign.value as any)?.latest_steps?.ppc_viability
  if (latest?.status === 'completed') return latest
  return undefined
})
const viabilityData = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return null
  return payload.data ?? payload
})
const services = computed<Record<string, any>[]>(() => {
  // Prefer the brand services endpoint (merged + deduplicated backend-side);
  // fall back to scraping the step payload for any services-like list when
  // the endpoint has nothing (e.g. brand never analyzed/scraped). Either way
  // the rows are enriched with the run's blueprints so the expandable cards
  // keep their platform/objective/risk details.
  const fromEndpoint = (detectedServices.value ?? []).map((s) => ({ ...s } as Record<string, any>))
  if (fromEndpoint.length) {
    return mergePpcBlueprints(fromEndpoint, viabilityData.value as Record<string, unknown>)
  }
  return ppcServiceList(viabilityData.value)
})

// QA round 3 fix 4: the rows the run actually analyzed (run payload), used
// for the truth-in-numbers header count and the selected-services split.
const analyzedRows = computed<Record<string, any>[]>(() => ppcServiceList(viabilityData.value))

// Selected-only primary cards: when the campaign has selected_services, those
// become the primary cards; other analyzed rows collapse under a toggle.
const selectedServiceNames = computed(() => campaignSelectedServices(campaign.value))
const serviceSplit = computed(() => {
  if (!selectedServiceNames.value.length) return { primary: services.value, others: [] as Record<string, unknown>[] }
  const candidates = analyzedRows.value.length ? analyzedRows.value : services.value
  return splitPpcServicesBySelected(candidates, selectedServiceNames.value)
})
const primaryServices = computed(() => serviceSplit.value.primary)
const otherServices = computed(() => serviceSplit.value.others)

// The header counts rows actually analyzed (run payload rows) — never the
// brand's total service count; falls back to the displayed rows when the run
// payload carries no service list.
const analyzedCount = computed(() =>
  analyzedRows.value.length || primaryServices.value.length + otherServices.value.length,
)

// Expandable cards (MOM 11.2): one card open at a time, collapsed by default.
const expandedService = ref<number | null>(null)
const showOtherServices = ref(false)

function toggleService(idx: number) {
  expandedService.value = expandedService.value === idx ? null : idx
}

// Review state restore: prefer the run just returned, else the persisted
// latest ppc_viability step on the campaign (latest_steps).
const reviewState = computed(() => {
  const fromResult = result.value?.step
  if (fromResult?.review_status != null) return fromResult
  return (campaign.value as any)?.latest_steps?.ppc_viability
})

async function runPPC(feedback?: string | Event) {
  // The same fn doubles as a click handler and the refine runner — never send
  // an Event as refinement feedback.
  const refinementFeedback = typeof feedback === 'string' ? feedback : undefined
  if (!isPrereqMet.value || !operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    const res = await run(async () => {
      const { campaignsApi } = await import('../api')
      return (await campaignsApi.runPPCViability(campaignUuid.value, { refinement_feedback: refinementFeedback })).data
    })
    // Keep the page live after a run/refine (MOM): refetch the campaign so
    // latest_steps / completion flags update without a manual refresh. The
    // displayed result prefers the fresh run response above, then latest_steps.
    if (res) {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid, 'steps'] })
    }
  } finally {
    operationManager.finish(opKey.value)
  }
}

function goNext() {
  router.push(`/campaigns/${campaignUuid.value}/funnel`)
}

const exporting = ref(false)
const hasExportData = computed(() => !!stepData.value?.response_payload)

async function handleExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!stepData.value?.response_payload) return
  exporting.value = true
  try {
    await exportPPCViability(format, stepData.value.response_payload as Record<string, unknown>, {
      stepName: t('smart.s3'),
      campaignName: campaign.value?.name ?? 'Campaign',
      brandName: campaign.value?.brand?.company_name,
    })
    confetti.trigger()
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <Topbar :title="campaign?.name ?? ''" :subtitle="campaign?.brand?.company_name">
    <template #actions>
      <button
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
        @click="router.push(`/campaigns/${campaignUuid}`)"
      >
        {{ t('camp.backToCampaign') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <!-- Header -->
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Target class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 2 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s3') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('ppc.description') }}</p>
        </div>
      </header>

      <!-- Prerequisite not met -->
      <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('ppc.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('ppc.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/segmentation`)"
        >
          {{ t('ppc.goToSeg') }}
        </button>
      </div>

      <template v-else>
        <!-- Already completed (no data from latest_steps either) -->
        <div v-if="isPrereqMet && (campaign?.ppc_viability_completed) && !stepData && !loading" class="surface-card p-8 text-center mb-6">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('ppc.alreadyCompletedDesc') }}</div>
          <div class="flex items-center justify-center gap-3">
            <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runPPC">
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
            <button
              class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              @click="goNext"
            >
              {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Run button -->
        <div v-if="!stepData && !loading && !campaign?.ppc_viability_completed" class="surface-card p-8 text-center">
          <Target class="h-8 w-8 text-primary mx-auto mb-3" />
          <div class="text-sm font-medium mb-1">{{ t('ppc.ready') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('ppc.readyDesc') }}</div>
          <button
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto"
            data-loc="campaigns.ppc.run-btn"
            @click="runPPC"
          >
            <Target class="h-3.5 w-3.5" /> {{ t('ppc.runAnalysis') }}
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="surface-card p-8">
          <AiLoadingAnimation :message="t('ppc.analyzing')" :description="t('ppc.analyzingDesc')" />
        </div>

        <!-- Error -->
        <ErrorState v-if="error" :message="error" :retry-label="t('seg.retry')" class="mb-6" @retry="runPPC" />

        <!-- Results -->
        <div v-if="stepData && !loading">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs text-muted-foreground" data-testid="ppc-analyzed-count">{{ t('ppc.servicesFound', { count: analyzedCount }) }}</div>
            <div class="flex items-center gap-2">
              <StepExportButton :disabled="!hasExportData || exporting" @export="handleExport" />
              <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runPPC">
                <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
              </button>
            </div>
          </div>

          <!-- Primary cards: the campaign's selected services (QA fix 4) -->
          <div class="space-y-3 mb-6">
            <PpcServiceCard
              v-for="(svc, idx) in primaryServices"
              :key="`primary-${idx}`"
              :svc="svc"
              :idx="idx"
              :expanded="expandedService === idx"
              @toggle="toggleService(idx)"
            />
          </div>

          <!-- Other analyzed services (QA fix 4): available, but collapsed -->
          <div v-if="otherServices.length" class="mb-6">
            <button
              type="button"
              class="h-8 px-3 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-subtle transition flex items-center gap-1.5"
              data-testid="ppc-other-services-toggle"
              :aria-expanded="showOtherServices"
              @click="showOtherServices = !showOtherServices"
            >
              <component :is="showOtherServices ? ChevronUp : ChevronDown" class="h-3.5 w-3.5" />
              {{ t('ppc.otherServices') }} ({{ otherServices.length }})
            </button>
            <div v-if="showOtherServices" data-testid="ppc-other-services" class="space-y-3 mt-3">
              <PpcServiceCard
                v-for="(svc, i) in otherServices"
                :key="`other-${i}`"
                :svc="svc"
                :idx="primaryServices.length + i"
                :expanded="expandedService === primaryServices.length + i"
                @toggle="toggleService(primaryServices.length + i)"
              />
            </div>
          </div>

          <!-- Approve / Reject / Refine -->
          <StepReviewActions
            class="mb-6"
            :campaign-uuid="campaignUuid"
            step-type="ppc_viability"
            :review-status="reviewState?.review_status"
            :reject-reason="reviewState?.reject_reason"
            :run-step="runPPC"
          />

          <div class="flex items-center justify-end">
            <button
              class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              data-loc="campaigns.ppc.continue-btn"
              @click="goNext"
            >
              {{ t('smart.approveContinue') }} {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>
