<script setup lang="ts">
import { computed } from 'vue'
import { Target, Loader2, AlertCircle, RefreshCw, Check, Shield } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const opKey = computed(() => `${props.campaignUuid}:ppc-viability`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => result.value?.step)
const isAlreadyCompleted = computed(() => props.campaign.ppc_viability_completed)
const isPrereqMet = computed(() => props.campaign.segmentation_completed)

const services = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return []
  const d = payload.data ?? payload
  const items = d.brand_trust_analysis?.services_bpc_scores
    ?? d.strategic_prioritization?.ppc_opportunity_ranking
    ?? d.services
    ?? payload.results
    ?? []
  return Array.isArray(items) ? items : []
})

async function runPPC() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => (await campaignsApi.runPPCViability(props.campaignUuid)).data)
    emit('completed')
  } finally {
    operationManager.finish(opKey.value)
  }
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Target class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 3 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s3') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('ppc.description') }}</p>
      </div>
    </header>

    <!-- Prerequisite not met -->
    <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('ppc.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('ppc.prereqDesc') }}</div>
    </div>

    <template v-else>
      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('ppc.analyzing') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('ppc.analyzingDesc') }}</div>
      </div>

      <!-- Already completed -->
      <div v-if="isAlreadyCompleted && !stepData && !loading" class="surface-card p-8 text-center">
        <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
          <Check class="h-5 w-5 text-success" />
        </div>
        <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('ppc.alreadyCompletedDesc') }}</div>
        <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition mx-auto" @click="runPPC">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
        </button>
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runPPC">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
        </button>
      </div>

      <!-- Ready to run -->
      <div v-if="!stepData && !loading && !isAlreadyCompleted" class="surface-card p-8 text-center">
        <Target class="h-8 w-8 text-primary mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('ppc.ready') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('ppc.readyDesc') }}</div>
        <button class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto" @click="runPPC">
          <Target class="h-3.5 w-3.5" /> {{ t('ppc.runAnalysis') }}
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
        <div class="grid sm:grid-cols-2 gap-3">
          <div v-for="(svc, idx) in services" :key="idx" class="surface-card p-5 space-y-2">
            <div class="text-sm font-semibold">{{ svc.name || svc.service || `${t('ppc.service')} ${idx + 1}` }}</div>
            <div v-if="svc.recommendation || svc.viability || svc.classification" class="flex items-center gap-2">
              <span :class="['text-[11px] px-2 py-0.5 rounded font-semibold', (svc.recommendation === 'High' || svc.viability === 'high' || svc.classification === 'Performance-Friendly') ? 'bg-success/15 text-success' : (svc.recommendation === 'Medium' || svc.viability === 'medium' || svc.classification === 'Mixed') ? 'bg-warning/15 text-warning' : 'bg-destructive/15 text-destructive']">
                {{ svc.recommendation || svc.viability || svc.classification || '—' }}
              </span>
            </div>
            <p v-if="svc.description || svc.reasoning" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">{{ svc.description || svc.reasoning }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
