<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles, Loader2, AlertCircle, RefreshCw, Shield, Trash2, Copy } from 'lucide-vue-next'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign, CampaignAd, CampaignAdPlatform, FunnelStage } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const localAds = ref<CampaignAd[]>([])

const selectedPlatforms = computed(() => (props.campaign.context_payload as any)?.selected_platforms ?? [])
const isPrereqMet = computed(() => {
  if (!props.campaign) return false
  const c = props.campaign as unknown as Record<string, unknown>
  return selectedPlatforms.value.length > 0 && selectedPlatforms.value.every((p: string) => {
    const flag = `${p}_ads_completed`
    return !!c[flag]
  })
})

const personas = computed(() => {
  const ctx = props.campaign.context_payload as any
  const seg = ctx?.segmentation_data?.segments ?? ctx?.personas ?? []
  if (!Array.isArray(seg)) return []
  return seg.map((s: any) => s.name || s.persona_name).filter(Boolean)
})

const funnelStages: FunnelStage[] = ['TOFU', 'MOFU', 'BOFU']
const selectedPersona = ref('')
const selectedFunnel = ref<FunnelStage>('TOFU')
const selectedPlatform = ref<CampaignAdPlatform>('meta')
const quantity = ref(3)

const genOpKey = computed(() => `${props.campaignUuid}:generate-ads`)
const { loading: genLoading, error: genError, run: genRun } = useAsyncOperation<any>()

const clearOpKey = computed(() => `${props.campaignUuid}:clear-ads`)
const { loading: clearLoading, run: clearRun } = useAsyncOperation<any>()
const showClearConfirm = ref(false)

async function generateAds() {
  if (!operationManager.canStart(genOpKey.value)) return
  operationManager.start(genOpKey.value)
  try {
    await genRun(async () => {
      const persona = selectedPersona.value || personas.value[0] || 'General'
      const res = await campaignsApi.generateAd(props.campaignUuid, {
        persona_name: persona,
        funnel_stage: selectedFunnel.value,
        platform: selectedPlatform.value,
        quantity: quantity.value,
      })
      if (res.data?.ads?.length) {
        localAds.value = [...res.data.ads, ...localAds.value]
      }
      return res.data
    })
    emit('completed')
  } finally {
    operationManager.finish(genOpKey.value)
  }
}

async function clearAllAds() {
  if (!operationManager.canStart(clearOpKey.value)) return
  operationManager.start(clearOpKey.value)
  showClearConfirm.value = false
  try {
    await clearRun(async () => (await campaignsApi.clearAllAds(props.campaignUuid)).data)
    localAds.value = []
  } finally {
    operationManager.finish(clearOpKey.value)
  }
}

function adPlatformLabel(p: string) {
  const map: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' }
  return map[p] ?? p
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text)
}

const adsList = computed(() => localAds.value)

function getAdData(ad: any) {
  const d = ad.data ?? {}
  return {
    headline: d.headline ?? d.title ?? '',
    body: d.body ?? d.description ?? d.primary_text ?? '',
    cta: d.cta ?? d.call_to_action ?? '',
    framework: d.framework ?? d.creative_framework ?? '',
    score: d.score ?? d.quality_score ?? 0,
  }
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Sparkles class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 8 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s8') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('adgen.description') }}</p>
      </div>
      <button v-if="adsList.length > 0 && isPrereqMet" class="hidden sm:flex h-10 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] items-center gap-1.5 shrink-0" :disabled="genLoading" @click="generateAds">
        <Loader2 v-if="genLoading" class="h-3.5 w-3.5 animate-spin" />
        <Sparkles v-else class="h-3.5 w-3.5" />
        {{ genLoading ? t('adgen.generating') : t('adgen.generate') }}
      </button>
    </header>

    <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('adgen.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('adgen.prereqDesc') }}</div>
    </div>

    <template v-else>
      <!-- Filters -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.persona') }}</label>
          <select v-model="selectedPersona" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
            <option value="">{{ t('adgen.allPersonas') }}</option>
            <option v-for="p in personas" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.funnelStage') }}</label>
          <select v-model="selectedFunnel" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
            <option v-for="s in funnelStages" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.platform') }}</label>
          <select v-model="selectedPlatform" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
            <option v-for="p in selectedPlatforms" :key="p" :value="p">{{ adPlatformLabel(p) }}</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adgen.quantity') }}</label>
          <select v-model.number="quantity" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
            <option :value="1">1</option><option :value="3">3</option><option :value="5">5</option><option :value="10">10</option>
          </select>
        </div>
      </div>

      <!-- Mobile generate button (visible only on mobile when ads exist) -->
      <button v-if="adsList.length > 0 && isPrereqMet" class="sm:hidden w-full h-10 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center justify-center gap-1.5" :disabled="genLoading" @click="generateAds">
        <Loader2 v-if="genLoading" class="h-3.5 w-3.5 animate-spin" />
        <Sparkles v-else class="h-3.5 w-3.5" />
        {{ genLoading ? t('adgen.generating') : t('adgen.generate') }}
      </button>

      <!-- Empty -->
      <div v-if="adsList.length === 0 && !genLoading" class="surface-card p-8 text-center">
        <Sparkles class="h-8 w-8 text-primary mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('adgen.ready') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('adgen.readyDesc') }}</div>
        <button class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto" @click="generateAds">
          <Sparkles class="h-3.5 w-3.5" /> {{ t('adgen.generate') }}
        </button>
      </div>

      <div v-if="genLoading" class="surface-card p-8">
        <AiLoadingAnimation :message="t('adgen.generating')" :description="t('adgen.generatingDesc')" />
      </div>

      <div v-if="genError" class="surface-card p-4 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ genError }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generateAds"><RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}</button>
      </div>

      <!-- Ad grid -->
      <div v-if="adsList.length > 0" class="space-y-4">
        <div class="flex items-center justify-between">
          <div class="text-xs text-muted-foreground">{{ t('adgen.adsFound', { count: adsList.length }) }}</div>
          <button class="h-8 px-3 rounded-lg border border-destructive/40 text-xs text-destructive flex items-center gap-1.5 hover:bg-destructive/10 transition" @click="showClearConfirm = true">
            <Trash2 class="h-3 w-3" /> {{ t('adgen.clearAll') }}
          </button>
        </div>
        <div class="grid sm:grid-cols-2 gap-3">
          <div v-for="ad in adsList" :key="ad.campaign_ad_uuid" class="surface-card p-5 group">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div class="flex flex-wrap items-center gap-1.5">
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">{{ adPlatformLabel(ad.platform) }}</span>
                <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">{{ ad.funnel_stage }}</span>
                <span v-if="getAdData(ad).framework" class="text-[11px] font-semibold px-2 py-0.5 rounded border border-primary/40 text-primary">{{ getAdData(ad).framework }}</span>
              </div>
              <div v-if="getAdData(ad).score" class="flex items-center gap-1 text-[11px] font-semibold text-success">
                <span class="h-1.5 w-1.5 rounded-full bg-success" /> {{ getAdData(ad).score }}
              </div>
            </div>
            <div class="rounded-lg border border-border/50 bg-overlay-subtle p-3 space-y-2 mb-3">
              <div v-if="ad.persona" class="text-[11px] text-muted-foreground">{{ ad.persona }}</div>
              <div v-if="getAdData(ad).headline" class="text-sm font-semibold">{{ getAdData(ad).headline }}</div>
              <div v-if="getAdData(ad).body" class="text-xs leading-relaxed">{{ getAdData(ad).body }}</div>
              <div v-if="getAdData(ad).cta" class="flex items-center justify-end pt-1">
                <span class="h-7 px-2.5 rounded-md bg-overlay-medium text-[11px] font-medium">{{ getAdData(ad).cta }}</span>
              </div>
            </div>
            <div class="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
              <button class="h-10 w-10 grid place-items-center rounded-md hover:bg-overlay-medium transition" @click="copyToClipboard(JSON.stringify(ad.data, null, 2))">
                <Copy class="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Clear confirm -->
      <div v-if="showClearConfirm" role="dialog" aria-modal="true" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click.self="showClearConfirm = false">
        <div class="surface-card p-6 max-w-sm w-full mx-4">
          <div class="text-sm font-semibold mb-2">{{ t('adgen.clearConfirm') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('adgen.clearConfirmDesc') }}</div>
          <div class="flex items-center justify-end gap-2">
            <button class="h-9 px-3 rounded-lg border border-border/60 text-xs" @click="showClearConfirm = false">{{ t('camp.cancel') }}</button>
            <button :disabled="clearLoading" class="h-9 px-4 rounded-lg bg-destructive text-white text-xs font-medium flex items-center gap-1.5 disabled:opacity-50" @click="clearAllAds">
              <Loader2 v-if="clearLoading" class="h-3 w-3 animate-spin" /> {{ t('adgen.clearAll') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
