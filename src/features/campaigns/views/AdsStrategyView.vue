<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Settings2, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCw, Shield, Check, ChevronDown, ChevronUp } from 'lucide-vue-next'
import AdsStrategyRenderer from '@/shared/components/renderers/AdsStrategyRenderer.vue'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useCampaign } from '../queries'
import { campaignsApi } from '../api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { useNormalizeResponse } from '@/shared/composables/useNormalizeResponse'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { useQueryClient } from '@tanstack/vue-query'
import { exportAdsStrategy } from '@/shared/utils/exportStep'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { normalize } = useNormalizeResponse()
const queryClient = useQueryClient()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const confetti = useConfetti()

const selectedPlatforms = computed(() => {
  const ctx = campaign.value?.context_payload as any
  return (ctx?.selected_platforms ?? []) as string[]
})

const isPrereqMet = computed(() => {
  if (!campaign.value?.content_strategy_completed) return false
  return selectedPlatforms.value.length > 0
})

const platformStepKey = (p: string) => `${p}_ads` as const

const platformResults = computed(() => {
  const map = new Map<string, { completed: boolean; data: any }>()
  for (const platform of selectedPlatforms.value) {
    const completedKey = `${platform}_ads_completed` as keyof typeof campaign.value
    const isCompleted = !!campaign.value?.[completedKey]
    const latest = (campaign.value as any)?.latest_steps?.[platformStepKey(platform)]
    map.set(platform, {
      completed: isCompleted,
      data: latest?.status === 'completed' ? latest : null,
    })
  }
  return map
})

const allDone = computed(() => {
  if (selectedPlatforms.value.length === 0) return false
  return selectedPlatforms.value.every((p) => platformResults.value.get(p)?.completed)
})

const currentPlatform = ref<string | null>(null)
const opKey = computed(() => `${campaignUuid.value}:ads-strategy`)
const { data: stepResult, loading, error, run } = useAsyncOperation<any>()

const expandedPlatform = ref<string | null>(null)

function toggleExpand(p: string) {
  expandedPlatform.value = expandedPlatform.value === p ? null : p
}

function getPlatformPayload(platform: string): Record<string, unknown> | null {
  if (stepResult.value?.step && currentPlatform.value === platform) {
    const raw = stepResult.value.step.response_payload
    if (raw && typeof raw === 'object') return normalize(raw as Record<string, unknown>, 'ads-strategy')
  }
  const saved = platformResults.value.get(platform)?.data?.response_payload
  if (saved && typeof saved === 'object') return normalize(saved as Record<string, unknown>, 'ads-strategy')
  return null
}

async function runStrategy(platform: string) {
  if (!operationManager.canStart(opKey.value)) return
  currentPlatform.value = platform
  expandedPlatform.value = platform
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const res = await campaignsApi.runAdsStrategy(campaignUuid.value, {
        platform: platform as any,
      })
      return res.data
    })
    await queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
    await queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid, 'steps'] })
  } finally {
    operationManager.finish(opKey.value)
  }
}

const platformLabel = (key: string) => {
  const map: Record<string, string> = {
    meta: 'Meta (Facebook & Instagram)',
    google: 'Google Ads',
    linkedin: 'LinkedIn Ads',
  }
  return map[key] ?? key
}

const exporting = ref(false)

async function handleExport(format: 'csv' | 'pdf' | 'pptx', platform: string) {
  const payload = getPlatformPayload(platform)
  if (!payload) return
  exporting.value = true
  try {
    await exportAdsStrategy(format, payload as Record<string, unknown>, {
      stepName: `${t('strategy.title')} — ${platformLabel(platform)}`,
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
          <Settings2 class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 6 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('strategy.title') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('strategy.description') }}</p>
        </div>
      </header>

      <div v-if="isLoading" class="surface-card p-8">
        <AiLoadingAnimation :message="t('strategy.title')" />
      </div>

      <div v-else-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('strategy.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('strategy.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/platform`)"
        >
          {{ t('platform.title') }}
        </button>
      </div>

      <template v-else>
        <!-- Platform cards -->
        <div class="space-y-3 mb-6">
          <div
            v-for="p in selectedPlatforms"
            :key="p"
            class="surface-card overflow-hidden"
          >
            <!-- Card header -->
            <div class="p-5 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-lg bg-overlay-light grid place-items-center">
                  <Settings2 class="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <div class="text-sm font-semibold">{{ platformLabel(p) }}</div>
                  <div class="text-[11px] text-muted-foreground">
                    {{ platformResults.get(p)?.completed ? t('status.completed') : t('strategy.pending') }}
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="!platformResults.get(p)?.completed"
                  :disabled="loading && currentPlatform === p"
                  class="h-8 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-[11px] font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
                  data-loc="campaigns.strategy.run-btn"
                  @click="runStrategy(p)"
                >
                  <Loader2 v-if="loading && currentPlatform === p" class="h-3 w-3 animate-spin" />
                  <Settings2 v-else class="h-3 w-3" />
                  {{ loading && currentPlatform === p ? t('strategy.running') : t('strategy.runStrategy') }}
                </button>
                <button
                  v-if="platformResults.get(p)?.completed"
                  class="h-8 w-8 rounded-lg border border-border/40 grid place-items-center hover:bg-overlay-subtle transition"
                  @click="toggleExpand(p)"
                >
                  <ChevronDown v-if="expandedPlatform !== p" class="h-3.5 w-3.5 text-muted-foreground" />
                  <ChevronUp v-else class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <div v-if="platformResults.get(p)?.completed && expandedPlatform !== p" class="flex items-center gap-1.5 text-success text-xs">
                  <Check class="h-3.5 w-3.5" /> {{ t('status.completed') }}
                </div>
              </div>
            </div>

            <!-- Running state -->
            <div v-if="loading && currentPlatform === p" class="px-5 pb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 class="h-3 w-3 animate-spin" /> {{ t('strategy.runningDesc') }}
            </div>

            <!-- Expanded results -->
            <div v-if="expandedPlatform === p && getPlatformPayload(p)" class="border-t border-border/30 p-5 bg-overlay-subtle/30">
              <div class="flex items-center justify-between mb-3">
                <div class="text-xs font-semibold">{{ t('strategy.result') }}</div>
                <StepExportButton :disabled="exporting" @export="(f: 'csv' | 'pdf' | 'pptx') => handleExport(f, p)" />
              </div>
              <AdsStrategyRenderer :data="getPlatformPayload(p)!" />
            </div>
          </div>
        </div>

        <div v-if="error" class="surface-card p-4 flex items-center gap-3 mb-4">
          <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
          <div class="flex-1 text-sm text-destructive">{{ error }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="currentPlatform && runStrategy(currentPlatform)">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
          </button>
        </div>

        <div class="flex items-center justify-between">
          <button
            class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
            data-loc="campaigns.strategy.prev-btn"
            @click="router.push(`/campaigns/${campaignUuid}/platform`)"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> {{ t('smart.previous') }}
          </button>
          <button
            :disabled="!allDone"
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
            data-loc="campaigns.strategy.continue-btn"
            @click="router.push(`/campaigns/${campaignUuid}/generate-ads`)"
          >
            {{ t('smart.approveContinue') }} {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
