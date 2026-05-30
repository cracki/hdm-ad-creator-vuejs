<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Sparkles, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCw, Shield, Trash2, Copy } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useConfetti } from '@/shared/composables/useConfetti'
import { exportCsv } from '@/shared/utils/csv'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import { useCampaign } from '../queries'
import { campaignsApi } from '../api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { exportAds } from '@/shared/utils/exportStep'
import type { CampaignAd, CampaignAdPlatform, FunnelStage } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const confetti = useConfetti()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignUuid)

const localAds = ref<CampaignAd[]>([])

const adsStorageKey = computed(() => `campaign-ads:${campaignUuid.value}`)

function saveAdsToStorage() {
  const meta = localAds.value.map(a => ({
    uuid: a.campaign_ad_uuid,
    platform: a.platform,
    funnel_stage: a.funnel_stage,
    persona: a.persona,
  }))
  try { sessionStorage.setItem(adsStorageKey.value, JSON.stringify(meta)) } catch {}
}

function loadAdsFromStorage() {
  try {
    const raw = sessionStorage.getItem(adsStorageKey.value)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

// Restore ads from sessionStorage on mount
const stored = loadAdsFromStorage()
if (stored.length) localAds.value = stored as any

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const selectedPlatforms = computed(() => {
  const ctx = campaign.value?.context_payload as any
  return (ctx?.selected_platforms ?? []) as CampaignAdPlatform[]
})

const isPrereqMet = computed(() => {
  if (!campaign.value) return false
  return selectedPlatforms.value.length > 0 && selectedPlatforms.value.every((p) => {
    const flag = `${p}_ads_completed` as keyof typeof campaign.value
    return campaign.value?.[flag]
  })
})

const personaObjects = computed(() => {
  const ctx = campaign.value?.context_payload as any
  const fromCtx = ctx?.segmentation_data?.segments ?? ctx?.personas
  if (Array.isArray(fromCtx) && fromCtx.length) return fromCtx
  const segStep = (campaign.value as any)?.latest_steps?.segmentation
  if (segStep?.response_payload) {
    const payload = segStep.response_payload
    const fromStep = payload.segments ?? payload.personas ?? payload.data?.segments
    if (Array.isArray(fromStep) && fromStep.length) return fromStep
  }
  return []
})

const adsList = computed(() => localAds.value)

const personaLabels = computed(() => {
  const names = personaObjects.value.map((s: any) => s.persona_name || s.name).filter(Boolean)
  if (names.length) return names
  if (!adsList.value.length) return []
  return [...new Set(adsList.value.map((ad: any) => ad.persona).filter(Boolean))]
})

const funnelStages: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU']

const selectedPersona = ref('')
const selectedFunnel = ref<FunnelStage>('TOFU')
const selectedPlatform = ref<CampaignAdPlatform>('meta')
const quantity = ref(3)

watch(personaLabels, (labels) => {
  if (labels.length && !selectedPersona.value) {
    selectedPersona.value = labels[0]
  }
}, { immediate: true })

const opKey = computed(() => `${campaignUuid.value}:generate-ads`)
const { loading: genLoading, error: genError, run: genRun } = useAsyncOperation<any>()

const clearOpKey = computed(() => `${campaignUuid.value}:clear-ads`)
const { loading: clearLoading, run: clearRun } = useAsyncOperation<any>()

const showClearConfirm = ref(false)

async function generateAds() {
  const persona = selectedPersona.value || personaLabels.value[0] || ''
  if (!persona) {
    toast.error(t('adgen.noPersona'))
    return
  }
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await genRun(async () => {
      const res = await campaignsApi.generateAd(campaignUuid.value, {
        persona_name: persona,
        funnel_stage: selectedFunnel.value,
        platform: selectedPlatform.value,
        quantity: quantity.value,
      })
      if (res.data?.ads?.length) {
        localAds.value = [...res.data.ads, ...localAds.value]
        saveAdsToStorage()
      }
      return res.data
    })
  } finally {
    operationManager.finish(opKey.value)
  }
}

async function clearAllAds() {
  if (!operationManager.canStart(clearOpKey.value)) return
  operationManager.start(clearOpKey.value)
  showClearConfirm.value = false
  try {
    await clearRun(async () => {
      return (await campaignsApi.clearAllAds(campaignUuid.value)).data
    })
    localAds.value = []
    try { sessionStorage.removeItem(adsStorageKey.value) } catch {}
  } finally {
    operationManager.finish(clearOpKey.value)
  }
}

function adPlatformLabel(p: string) {
  const map: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' }
  return map[p] ?? p
}

function copyAdData(ad: any) {
  navigator.clipboard.writeText(JSON.stringify(ad.data, null, 2))
  toast.success(t('common.copied'))
}

function exportAdsCsv() {
  const data = adsList.value.map((ad: any) => {
    const d = getAdData(ad)
    return {
      platform: ad.platform,
      funnel_stage: ad.funnel_stage,
      persona: ad.persona ?? '',
      headline: d.headline,
      body: d.body,
      cta: d.cta,
      framework: d.framework,
      score: d.score,
    }
  })
  exportCsv(data, `campaign-${campaignUuid.value}-ads`, [
    { key: 'platform', header: 'Platform' },
    { key: 'funnel_stage', header: 'Funnel Stage' },
    { key: 'persona', header: 'Persona' },
    { key: 'headline', header: 'Headline' },
    { key: 'body', header: 'Body' },
    { key: 'cta', header: 'CTA' },
    { key: 'framework', header: 'Framework' },
    { key: 'score', header: 'Score' },
  ])
  toast.success(t('common.exportCsv'))
  confetti.trigger()
}

function getAdData(ad: any): { headline: string; body: string; cta: string; framework: string; score: number } {
  const d = ad.data ?? {}
  return {
    headline: d.headline ?? d.title ?? '',
    body: d.body ?? d.description ?? d.primary_text ?? '',
    cta: d.cta ?? d.call_to_action ?? '',
    framework: d.framework ?? d.creative_framework ?? '',
    score: d.score ?? d.quality_score ?? 0,
  }
}

const adExporting = ref(false)
async function handleAdExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!adsList.value.length) return
  if (format === 'csv') { exportAdsCsv(); return }
  adExporting.value = true
  try {
    await exportAds(format, adsList.value, {
      stepName: t('adgen.title'),
      campaignName: campaign.value?.name ?? 'Campaign',
      brandName: campaign.value?.brand?.company_name,
    })
    confetti.trigger()
  } finally {
    adExporting.value = false
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
      <header class="flex items-start gap-3 sm:gap-4 mb-6">
        <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Sparkles class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 7 / 9</div>
          <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-0.5">{{ t('adgen.title') }}</h2>
          <p class="text-xs sm:text-sm text-muted-foreground mt-0.5">{{ t('adgen.description') }}</p>
        </div>
        <button
          v-if="adsList.length > 0"
          class="hidden sm:flex h-10 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
          data-loc="campaigns.adgen.generate-btn"
          @click="generateAds"
          :disabled="genLoading || !isPrereqMet"
        >
          <Loader2 v-if="genLoading" class="h-3.5 w-3.5 animate-spin" />
          <Sparkles v-else class="h-3.5 w-3.5" />
          {{ genLoading ? t('adgen.generating') : t('adgen.generate') }}
        </button>
      </header>

      <div v-if="campaignLoading" class="py-12">
        <AiLoadingAnimation :message="t('adgen.title')" size="sm" />
      </div>

      <div v-else-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('adgen.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('adgen.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/ads-strategy`)"
        >
          {{ t('strategy.title') }}
        </button>
      </div>

      <template v-else>
        <!-- Filters -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
          <div class="col-span-2 sm:col-span-1">
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.persona') }}</label>
            <select v-model="selectedPersona" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none text-start" data-loc="campaigns.adgen.filter-persona">
              <option v-for="p in personaLabels" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.funnelStage') }}</label>
            <select v-model="selectedFunnel" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none text-start" data-loc="campaigns.adgen.filter-funnel-stage">
              <option v-for="s in funnelStages" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.platform') }}</label>
            <select v-model="selectedPlatform" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none text-start" data-loc="campaigns.adgen.filter-platform">
              <option v-for="p in selectedPlatforms" :key="p" :value="p">{{ adPlatformLabel(p) }}</option>
            </select>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.quantity') }}</label>
            <select v-model.number="quantity" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none text-start" data-loc="campaigns.adgen.filter-quantity">
              <option :value="1">1</option>
              <option :value="3">3</option>
              <option :value="5">5</option>
              <option :value="10">10</option>
            </select>
          </div>
        </div>

        <!-- Generate button (when no ads yet) -->
        <div v-if="personaLabels.length === 0 && !genLoading" class="surface-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <AlertCircle class="h-5 w-5 text-amber-400 shrink-0" />
            <div class="text-sm text-amber-400">{{ t('adgen.noPersona') }}</div>
          </div>
          <button
            class="h-8 px-3 rounded-lg bg-amber-500/15 border border-amber-400/40 text-xs text-amber-300 font-medium flex items-center gap-1.5 shrink-0 hover:bg-amber-500/25 transition"
            @click="router.push(`/campaigns/${campaignUuid}/segmentation`)"
          >
            <ArrowRight class="h-3 w-3" />
            {{ t('seg.runSegmentation') }}
          </button>
        </div>
        <div v-if="adsList.length === 0 && !genLoading" class="surface-card p-6 sm:p-8 text-center mb-6">
          <Sparkles class="h-8 w-8 text-primary mx-auto mb-3" />
          <div class="text-sm font-medium mb-1">{{ t('adgen.ready') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('adgen.readyDesc') }}</div>
          <button
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto disabled:opacity-40 disabled:cursor-not-allowed"
            data-loc="campaigns.adgen.generate-btn"
            @click="generateAds"
            :disabled="!isPrereqMet || personaLabels.length === 0"
          >
            <Sparkles class="h-3.5 w-3.5" /> {{ t('adgen.generate') }}
          </button>
          <div v-if="!isPrereqMet" class="text-xs text-amber-400 mt-3">{{ t('adgen.prereqRequired') }}</div>
        </div>

        <div v-if="genLoading" class="surface-card p-8 mb-6">
          <AiLoadingAnimation :message="t('adgen.generating')" :description="t('adgen.generatingDesc')" />
        </div>

        <div v-if="genError" class="surface-card p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div class="flex items-start gap-3 flex-1 min-w-0">
            <AlertCircle class="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div class="text-sm text-destructive break-words">{{ genError }}</div>
          </div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 shrink-0" @click="generateAds">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
          </button>
        </div>

        <!-- Ad grid -->
        <div v-if="adsList.length > 0" class="space-y-4 mb-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div class="text-xs text-muted-foreground">{{ t('adgen.adsFound', { count: adsList.length }) }}</div>
            <div class="flex items-center gap-2">
              <StepExportButton :disabled="!adsList.length || adExporting" @export="handleAdExport" />
              <button
                class="h-8 px-3 rounded-lg border border-destructive/40 text-xs text-destructive flex items-center gap-1.5 hover:bg-destructive/10 transition"
                data-loc="campaigns.adgen.clear-all-btn"
                @click="showClearConfirm = true"
              >
                <Trash2 class="h-3 w-3" /> {{ t('adgen.clearAll') }}
              </button>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3">
            <div v-for="ad in adsList" :key="ad.campaign_ad_uuid" class="surface-card p-4 sm:p-5 group">
              <div class="flex items-start sm:items-center justify-between mb-3 gap-2">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">{{ adPlatformLabel(ad.platform) }}</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">{{ ad.funnel_stage }}</span>
                  <span v-if="getAdData(ad).framework" class="text-[11px] font-semibold px-2 py-0.5 rounded border border-primary/40 text-primary">{{ getAdData(ad).framework }}</span>
                </div>
                <div v-if="getAdData(ad).score" class="flex items-center gap-1 text-[11px] font-semibold text-success shrink-0">
                  <span class="h-1.5 w-1.5 rounded-full bg-success" /> {{ getAdData(ad).score }}
                </div>
              </div>

              <!-- Ad preview card -->
              <div class="rounded-lg border border-border/50 bg-overlay-subtle p-3 space-y-2 mb-3 text-start">
                <div v-if="ad.persona" class="text-[11px] text-muted-foreground">{{ ad.persona }}</div>
                <div v-if="getAdData(ad).headline" class="text-sm font-semibold">{{ getAdData(ad).headline }}</div>
                <div v-if="getAdData(ad).body" class="text-xs leading-relaxed">{{ getAdData(ad).body }}</div>
                <div v-if="getAdData(ad).cta" class="flex items-center justify-end pt-1">
                  <span class="h-7 px-2.5 rounded-md bg-overlay-medium text-[11px] font-medium">{{ getAdData(ad).cta }}</span>
                </div>
              </div>

              <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                <button class="h-8 w-8 sm:h-7 sm:w-7 grid place-items-center rounded-md hover:bg-overlay-medium transition active:bg-overlay-medium" data-loc="campaigns.adgen.copy-btn" @click="copyAdData(ad)">
                  <Copy class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Clear confirmation -->
        <div v-if="showClearConfirm" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="showClearConfirm = false">
          <div class="surface-card p-5 sm:p-6 max-w-sm w-full">
            <div class="text-sm font-semibold mb-2">{{ t('adgen.clearConfirm') }}</div>
            <div class="text-xs text-muted-foreground mb-4">{{ t('adgen.clearConfirmDesc') }}</div>
            <div class="flex items-center justify-end gap-2">
              <button class="h-9 px-3 rounded-lg border border-border/60 text-xs" @click="showClearConfirm = false">{{ t('camp.cancel') }}</button>
              <button
                :disabled="clearLoading"
                class="h-9 px-4 rounded-lg bg-destructive text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50"
                @click="clearAllAds"
              >
                <Loader2 v-if="clearLoading" class="h-3 w-3 animate-spin" />
                {{ t('adgen.clearAll') }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <button
            class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center justify-center gap-1.5"
            @click="router.push(`/campaigns/${campaignUuid}/ads-strategy`)"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> {{ t('smart.previous') }}
          </button>
          <button
            :disabled="adsList.length === 0"
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center justify-center gap-1.5 disabled:opacity-50"
            @click="router.push({ path: `/campaigns/${campaignUuid}/visuals`, state: { adUuids: adsList.map(a => a.campaign_ad_uuid), adMeta: adsList.map(a => ({ uuid: a.campaign_ad_uuid, platform: a.platform, funnel_stage: a.funnel_stage, persona: a.persona })) } })"
          >
            {{ t('smart.approveContinue') }} {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
