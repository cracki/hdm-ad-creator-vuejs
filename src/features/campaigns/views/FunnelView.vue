<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Layers, ArrowLeft, ArrowRight, AlertCircle, RefreshCw, Shield, Check } from 'lucide-vue-next'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useCampaign } from '../queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { exportFunnel } from '@/shared/utils/exportStep'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const confetti = useConfetti()

const isPrereqMet = computed(() =>
  (campaign.value?.segmentation_completed ?? false) &&
  (campaign.value?.ppc_viability_completed ?? false),
)

const opKey = computed(() => `${campaignUuid.value}:funnel`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => {
  if (result.value?.step) return result.value.step
  const latest = (campaign.value as any)?.latest_steps?.funnel
  if (latest?.status === 'completed') return latest
  return undefined
})
const funnelData = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return null
  return payload.data ?? payload
})
const stages = computed(() => {
  if (!funnelData.value) return []
  const d = funnelData.value
  const personas = d.funnel_context?.persona_profiles
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
  const raw = d.stages ?? d.funnel_stages ?? d.funnel ?? []
  return Array.isArray(raw) ? raw : []
})
const tofuItems = computed(() => stages.value.filter((s: any) => (s.stage ?? s.name ?? '').toLowerCase().includes('tofu') || (s.stage ?? s.name ?? '').toLowerCase().includes('awareness')))
const mofuItems = computed(() => stages.value.filter((s: any) => (s.stage ?? s.name ?? '').toLowerCase().includes('mofu') || (s.stage ?? s.name ?? '').toLowerCase().includes('consideration')))
const bofuItems = computed(() => stages.value.filter((s: any) => (s.stage ?? s.name ?? '').toLowerCase().includes('bofu') || (s.stage ?? s.name ?? '').toLowerCase().includes('conversion')))

async function runFunnel() {
  if (!isPrereqMet.value || !operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const { campaignsApi } = await import('../api')
      return (await campaignsApi.runFunnel(campaignUuid.value)).data
    })
  } finally {
    operationManager.finish(opKey.value)
  }
}

function goNext() {
  router.push(`/campaigns/${campaignUuid.value}/content`)
}

const exporting = ref(false)
const hasExportData = computed(() => !!stepData.value?.response_payload)

async function handleExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!stepData.value?.response_payload) return
  exporting.value = true
  try {
    await exportFunnel(format, stepData.value.response_payload as Record<string, unknown>, {
      stepName: t('smart.s4'),
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
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Layers class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 3 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s4') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('funnel.description') }}</p>
        </div>
      </header>

      <!-- Prerequisite -->
      <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('funnel.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('funnel.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/segmentation`)"
        >
          {{ t('ppc.goToSeg') }}
        </button>
      </div>

      <template v-else>
        <!-- Already completed (no data from latest_steps either) -->
        <div v-if="isPrereqMet && (campaign?.funnel_completed) && !stepData && !loading" class="surface-card p-8 text-center mb-6">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('funnel.alreadyCompletedDesc') }}</div>
          <div class="flex items-center justify-center gap-3">
            <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runFunnel">
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

        <!-- Run -->
        <div v-if="!stepData && !loading && !campaign?.funnel_completed" class="surface-card p-8 text-center">
          <Layers class="h-8 w-8 text-primary mx-auto mb-3" />
          <div class="text-sm font-medium mb-1">{{ t('funnel.ready') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('funnel.readyDesc') }}</div>
          <button
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto"
            data-loc="campaigns.funnel.run-btn"
            @click="runFunnel"
          >
            <Layers class="h-3.5 w-3.5" /> {{ t('funnel.runFunnel') }}
          </button>
        </div>

        <div v-if="loading" class="surface-card p-8">
          <AiLoadingAnimation :message="t('funnel.analyzing')" :description="t('funnel.analyzingDesc')" />
        </div>

        <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
          <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
          <div class="flex-1 text-sm text-destructive">{{ error }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runFunnel">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
          </button>
        </div>

        <!-- Funnel results -->
        <div v-if="stepData && !loading">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs text-muted-foreground">{{ t('funnel.stagesFound', { count: stages.length }) }}</div>
            <div class="flex items-center gap-2">
              <StepExportButton :disabled="!hasExportData || exporting" @export="handleExport" />
              <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runFunnel">
                <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
              </button>
            </div>
          </div>

          <!-- Funnel visualization -->
          <div class="grid sm:grid-cols-3 gap-3 mb-6">
            <!-- TOFU -->
            <div class="surface-card p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="h-2 w-2 rounded-full bg-accent-cyan" />
                <span class="text-xs font-semibold text-accent-cyan">TOFU · Awareness</span>
              </div>
              <div class="space-y-2">
                <div v-for="(item, idx) in (tofuItems.length ? tofuItems : stages.slice(0, Math.ceil(stages.length / 3)))" :key="idx" class="text-xs p-2 rounded bg-overlay-subtle">
                  <div class="font-medium">{{ item.name || item.stage || item.title || `${t('funnel.stage')} ${idx + 1}` }}</div>
                  <div v-if="item.description || item.content_ideas" class="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {{ item.description || (Array.isArray(item.content_ideas) ? item.content_ideas.join(', ') : item.content_ideas) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- MOFU -->
            <div class="surface-card p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="h-2 w-2 rounded-full bg-accent-magenta" />
                <span class="text-xs font-semibold text-accent-magenta">MOFU · Consideration</span>
              </div>
              <div class="space-y-2">
                <div v-for="(item, idx) in (mofuItems.length ? mofuItems : stages.slice(Math.ceil(stages.length / 3), Math.ceil(stages.length * 2 / 3)))" :key="idx" class="text-xs p-2 rounded bg-overlay-subtle">
                  <div class="font-medium">{{ item.name || item.stage || item.title || `${t('funnel.stage')} ${idx + 1}` }}</div>
                  <div v-if="item.description || item.content_ideas" class="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {{ item.description || (Array.isArray(item.content_ideas) ? item.content_ideas.join(', ') : item.content_ideas) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- BOFU -->
            <div class="surface-card p-4">
              <div class="flex items-center gap-2 mb-3">
                <span class="h-2 w-2 rounded-full bg-accent-amber" />
                <span class="text-xs font-semibold text-accent-amber">BOFU · Conversion</span>
              </div>
              <div class="space-y-2">
                <div v-for="(item, idx) in (bofuItems.length ? bofuItems : stages.slice(Math.ceil(stages.length * 2 / 3)))" :key="idx" class="text-xs p-2 rounded bg-overlay-subtle">
                  <div class="font-medium">{{ item.name || item.stage || item.title || `${t('funnel.stage')} ${idx + 1}` }}</div>
                  <div v-if="item.description || item.content_ideas" class="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {{ item.description || (Array.isArray(item.content_ideas) ? item.content_ideas.join(', ') : item.content_ideas) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end">
            <button
              class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              data-loc="campaigns.funnel.continue-btn"
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
