<script setup lang="ts">
import { computed } from 'vue'
import { Layers, Loader2, AlertCircle, RefreshCw, Check, Shield } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const opKey = computed(() => `${props.campaignUuid}:funnel`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => result.value?.step)
const isAlreadyCompleted = computed(() => props.campaign.funnel_completed)
const isPrereqMet = computed(() => props.campaign.segmentation_completed && props.campaign.ppc_viability_completed)

const stages = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return []
  const personas = payload.funnel_context?.persona_profiles
  if (Array.isArray(personas) && personas.length > 0 && personas[0].messages) {
    const result: any[] = []
    for (const persona of personas) {
      for (const [stageKey, stageMsg] of Object.entries(persona.messages || {})) {
        const msg = stageMsg as any
        result.push({
          stage: stageKey,
          name: persona.persona_name,
          title: msg.headline_angle,
          description: msg.body_approach || persona.persona_summary,
          ...msg,
        })
      }
    }
    return result
  }
  const items = payload.stages ?? payload.data?.stages ?? payload.funnel_stages ?? []
  return Array.isArray(items) ? items : []
})

async function runFunnel() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => (await campaignsApi.runFunnel(props.campaignUuid)).data)
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
        <Layers class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 4 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s4') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('funnel.description') }}</p>
      </div>
    </header>

    <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('funnel.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('funnel.prereqDesc') }}</div>
    </div>

    <template v-else>
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('funnel.analyzing') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('funnel.analyzingDesc') }}</div>
      </div>

      <div v-if="isAlreadyCompleted && !stepData && !loading" class="surface-card p-8 text-center">
        <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
          <Check class="h-5 w-5 text-success" />
        </div>
        <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('funnel.alreadyCompletedDesc') }}</div>
        <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition mx-auto" @click="runFunnel">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
        </button>
      </div>

      <div v-if="error" class="surface-card p-5 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runFunnel">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
        </button>
      </div>

      <div v-if="!stepData && !loading && !isAlreadyCompleted" class="surface-card p-8 text-center">
        <Layers class="h-8 w-8 text-primary mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('funnel.ready') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('funnel.readyDesc') }}</div>
        <button class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto" @click="runFunnel">
          <Layers class="h-3.5 w-3.5" /> {{ t('funnel.runFunnel') }}
        </button>
      </div>

      <div v-if="stepData && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">{{ t('funnel.stagesFound', { count: stages.length }) }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runFunnel">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
          </button>
        </div>
        <div class="grid sm:grid-cols-3 gap-3">
          <div v-for="(stage, idx) in stages" :key="idx" class="surface-card p-5 space-y-2">
            <div class="flex items-center gap-2">
              <span :class="['text-[11px] px-2 py-0.5 rounded font-semibold', stage.stage === 'TOFU' || stage.name === 'Awareness' ? 'bg-info/15 text-info' : stage.stage === 'MOFU' || stage.name === 'Consideration' ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success']">
                {{ stage.stage || stage.name || `${t('funnel.stage')} ${idx + 1}` }}
              </span>
            </div>
            <p v-if="stage.description || stage.content_strategy" class="text-xs text-muted-foreground leading-relaxed line-clamp-4">{{ stage.description || stage.content_strategy }}</p>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
