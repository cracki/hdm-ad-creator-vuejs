<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Target, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCw, Shield, TrendingUp, Check } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign } from '../queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const isPrereqMet = computed(() => campaign.value?.segmentation_completed ?? false)

const opKey = computed(() => `${campaignUuid.value}:ppc-viability`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => result.value?.step)
const viabilityData = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return null
  return payload.data ?? payload
})
const services = computed(() => {
  if (!viabilityData.value) return []
  const d = viabilityData.value
  const svcs = d.brand_trust_analysis?.services_bpc_scores
    ?? d.strategic_prioritization?.ppc_opportunity_ranking
    ?? d.services
    ?? d.platforms
    ?? d.recommendations
    ?? []
  return Array.isArray(svcs) ? svcs : []
})

async function runPPC() {
  if (!isPrereqMet.value || !operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const { campaignsApi } = await import('../api')
      return (await campaignsApi.runPPCViability(campaignUuid.value)).data
    })
  } finally {
    operationManager.finish(opKey.value)
  }
}

function goNext() {
  router.push(`/campaigns/${campaignUuid.value}/funnel`)
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
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 2 / 4</div>
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
        <!-- Already completed -->
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
        <div v-if="!stepData && !loading && !(campaign?.ppc_viability_completed)" class="surface-card p-8 text-center">
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
        <div v-if="loading" class="surface-card p-8 text-center">
          <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <div class="text-sm font-medium mb-1">{{ t('ppc.analyzing') }}</div>
          <div class="text-xs text-muted-foreground">{{ t('ppc.analyzingDesc') }}</div>
        </div>

        <!-- Error -->
        <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
          <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
          <div class="flex-1 text-sm text-destructive">{{ error }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runPPC">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
          </button>
        </div>

        <!-- Results -->
        <div v-if="stepData && !loading">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs text-muted-foreground">{{ t('ppc.servicesFound', { count: services.length }) }}</div>
            <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runPPC">
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
          </div>

          <div class="space-y-3 mb-6">
            <div
              v-for="(svc, idx) in services"
              :key="idx"
              class="surface-card p-5"
            >
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="h-8 w-8 rounded-lg bg-overlay-light grid place-items-center shrink-0">
                    <TrendingUp class="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div class="text-sm font-semibold">{{ svc.name || svc.platform || svc.service || `${t('ppc.service')} ${idx + 1}` }}</div>
                    <div v-if="svc.type || svc.category || svc.classification" class="text-[11px] text-muted-foreground">{{ svc.type || svc.category || svc.classification }}</div>
                  </div>
                </div>
                <div v-if="svc.score || svc.viability_score || svc.priority" class="flex items-center gap-1">
                  <span class="h-1.5 w-1.5 rounded-full bg-success" />
                  <span class="text-xs font-semibold text-success">
                    {{ svc.score ?? svc.bpc_score ?? svc.viability_score ?? svc.priority }}
                  </span>
                </div>
              </div>

              <p v-if="svc.description || svc.recommendation || svc.reasoning" class="text-xs text-muted-foreground leading-relaxed mb-3">
                {{ svc.description || svc.recommendation || svc.reasoning }}
              </p>

              <div v-if="svc.pros?.length" class="flex flex-wrap gap-1">
                <span v-for="pro in (svc.pros ?? [])" :key="pro" class="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success/80">
                  {{ pro }}
                </span>
              </div>
              <div v-if="svc.cons?.length" class="flex flex-wrap gap-1 mt-1">
                <span v-for="con in svc.cons" :key="con" class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80">
                  {{ con }}
                </span>
              </div>
            </div>
          </div>

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
