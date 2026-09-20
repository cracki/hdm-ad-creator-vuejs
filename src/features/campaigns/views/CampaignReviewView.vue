<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, ArrowLeft, Loader2, Check, AlertCircle, Wallet, Sparkles } from 'lucide-vue-next'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import Topbar from '@/layout/Topbar.vue'
import AdReviewCard from '../components/AdReviewCard.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign, useCampaignAds, useCompleteCampaign } from '../queries'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { useConfetti } from '@/shared/composables/useConfetti'
import { exportReview } from '@/shared/utils/exportStep'
import { formatCampaignBudget, getFunnelBudgetSplit, getAdCopy } from '../types'
import type { CampaignAd } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)
const { data: adsData } = useCampaignAds(campaignUuid)

const ads = computed<CampaignAd[]>(() => adsData.value?.ads ?? [])

function adPlatformLabel(p: string) {
  const map: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' }
  return map[p] ?? p
}

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])
const completeMutation = useCompleteCampaign(campaignUuid)
const confetti = useConfetti()

// Total budget + per-stage split (F16)
const totalBudgetText = computed(() => (campaign.value ? formatCampaignBudget(campaign.value) : null))
const budgetSplit = computed(() =>
  campaign.value
    ? getFunnelBudgetSplit(campaign.value)
    : null,
)
const budgetSplitRows = computed(() => {
  const split = budgetSplit.value
  if (!split) return []
  return [
    { key: 'tofu', label: t('cd.tofu'), entry: split.tofu, bar: 'bg-accent-cyan' },
    { key: 'mofu', label: t('cd.mofu'), entry: split.mofu, bar: 'bg-accent-amber' },
    { key: 'bofu', label: t('cd.bofu'), entry: split.bofu, bar: 'bg-accent-magenta' },
  ]
})

const selectedPlatforms = computed<string[]>(() => {
  const ctx = campaign.value?.context_payload as { selected_platforms?: string[] } | undefined
  return ctx?.selected_platforms ?? []
})

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta Ads',
  google: 'Google Ads',
  linkedin: 'LinkedIn Ads',
}

const completionFlags = computed(() => {
  const base = [
    { key: 'segmentation', label: t('smart.s1'), done: campaign.value?.segmentation_completed ?? false },
    { key: 'ppc_viability', label: t('smart.s3'), done: campaign.value?.ppc_viability_completed ?? false },
    { key: 'funnel', label: t('smart.s4'), done: campaign.value?.funnel_completed ?? false },
    { key: 'content_strategy', label: t('smart.s5'), done: campaign.value?.content_strategy_completed ?? false },
  ]
  // Only list the platforms the user actually selected — a campaign that runs
  // on Meta only should not show Google/LinkedIn as "incomplete" (MOM bug #6).
  const platformFlags = selectedPlatforms.value.map((p) => ({
    key: `${p}_ads`,
    label: PLATFORM_LABELS[p] ?? `${p} Ads`,
    done: Boolean(campaign.value && campaign.value[`${p}_ads_completed` as keyof typeof campaign.value]),
  }))
  return [...base, ...platformFlags]
})

const completedCount = computed(() => completionFlags.value.filter((f) => f.done).length)
const progress = computed(() =>
  completionFlags.value.length ? Math.round((completedCount.value / completionFlags.value.length) * 100) : 0,
)
// Complete = every required step (base + the selected platforms) done AND at
// least one platform chosen. Previously this was gated on all 7 hardcoded
// flags, so a partial-platform campaign could never be completed.
const allDone = computed(
  () => selectedPlatforms.value.length > 0 && completionFlags.value.every((f) => f.done),
)

const completing = ref(false)
const completeError = ref('')

async function completeCampaign() {
  if (!allDone.value) return
  const opKey = `${campaignUuid.value}:complete`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  completing.value = true
  completeError.value = ''
  try {
    await completeMutation.mutateAsync()
    router.push('/campaigns')
  } catch (e: unknown) {
    // Surface the backend's gating error (400 {detail, missing}) — nothing
    // else shows it (no global mutation error handler).
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    completeError.value = err?.response?.data?.detail ?? err?.message ?? t('review.completeFailed')
  } finally {
    completing.value = false
    operationManager.finish(opKey)
  }
}

const reviewExporting = ref(false)
async function handleReviewExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!campaign.value) return
  reviewExporting.value = true
  try {
    await exportReview(format, campaign.value, [], {
      stepName: 'Campaign Review',
      campaignName: campaign.value?.name ?? 'Campaign',
      brandName: campaign.value?.brand?.company_name,
    })
    confetti.trigger()
  } finally {
    reviewExporting.value = false
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
          <Download class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 9 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('review.title') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('review.description') }}</p>
        </div>
        <StepExportButton :disabled="!campaign || reviewExporting" @export="handleReviewExport" />
      </header>

      <div v-if="isLoading" class="py-12">
        <AiLoadingAnimation :message="t('camp.loading')" size="sm" />
      </div>

      <template v-else>
        <!-- Progress overview -->
        <div class="surface-card p-5 mb-6" data-loc="campaigns.review.progress">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold">{{ t('review.progress') }}</div>
            <div class="text-xs text-muted-foreground">{{ progress }}%</div>
          </div>
          <div class="h-2 rounded-full bg-overlay-subtle overflow-hidden mb-4">
            <div class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-500" :style="{ width: `${progress}%` }" />
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <div
              v-for="flag in completionFlags"
              :key="flag.key"
              class="flex items-center gap-2 text-xs"
            >
              <div :class="['h-4 w-4 rounded grid place-items-center shrink-0', flag.done ? 'bg-success/15 text-success' : 'bg-overlay-subtle text-muted-foreground']">
                <Check v-if="flag.done" class="h-3 w-3" />
              </div>
              <span :class="flag.done ? '' : 'text-muted-foreground'">{{ flag.label }}</span>
            </div>
          </div>
        </div>

        <!-- Campaign info -->
        <div v-if="campaign" class="surface-card p-5 mb-6">
          <div class="text-sm font-semibold mb-3">{{ t('review.campaignInfo') }}</div>
          <div class="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <div class="text-muted-foreground mb-0.5">{{ t('camp.campaignName') }}</div>
              <div class="font-medium">{{ campaign.name }}</div>
            </div>
            <div>
              <div class="text-muted-foreground mb-0.5">{{ t('camp.industry') }}</div>
              <div class="font-medium">{{ campaign.brand?.selected_industry?.name ?? '—' }}</div>
            </div>
            <div>
              <div class="text-muted-foreground mb-0.5">{{ t('newbrand.row.company') }}</div>
              <div class="font-medium">{{ campaign.brand?.company_name ?? '—' }}</div>
            </div>
            <div>
              <div class="text-muted-foreground mb-0.5">{{ t('newbrand.row.website') }}</div>
              <div class="font-medium truncate">{{ campaign.brand?.website_url ?? '—' }}</div>
            </div>
            <div v-if="totalBudgetText">
              <div class="text-muted-foreground mb-0.5">{{ t('camp.totalBudget') }}</div>
              <div class="font-medium" data-testid="total-budget-value">{{ totalBudgetText }}</div>
            </div>
          </div>
        </div>

        <!-- Budget split by funnel stage (F16) -->
        <div v-if="budgetSplit" class="surface-card p-5 mb-6" data-testid="funnel-budget-split">
          <div class="flex items-center gap-2 mb-3">
            <Wallet class="h-4 w-4 text-primary" />
            <div class="text-sm font-semibold">{{ t('review.budgetSplit') }}</div>
            <div v-if="totalBudgetText" class="text-xs text-muted-foreground ms-auto">{{ totalBudgetText }}</div>
          </div>
          <div class="space-y-3">
            <div v-for="row in budgetSplitRows" :key="row.key" class="flex items-center gap-3">
              <span class="text-xs w-32 sm:w-40 text-muted-foreground shrink-0">{{ row.label }}</span>
              <div class="flex-1 h-2 rounded-full bg-overlay-subtle overflow-hidden">
                <div class="h-full rounded-full" :class="row.bar" :style="{ width: `${Math.min(row.entry.percent, 100)}%` }" />
              </div>
              <span class="text-xs font-medium w-24 text-end shrink-0" :data-testid="`budget-split-${row.key}`">
                {{ row.entry.percent }}%<template v-if="row.entry.amount != null"> · {{ row.entry.amount.toLocaleString() }}</template>
              </span>
            </div>
          </div>
        </div>

        <!-- Generated ads with review actions (F13) -->
        <div v-if="ads.length > 0" class="mb-6" data-testid="review-ads-section">
          <div class="flex items-start gap-2.5 mb-3">
            <Sparkles class="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <div class="text-sm font-semibold">{{ t('review.adsSection') }}</div>
              <div class="text-xs text-muted-foreground mt-0.5">{{ t('review.adsSectionDesc') }}</div>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-3">
            <AdReviewCard
              v-for="ad in ads"
              :key="ad.campaign_ad_uuid"
              :ad="ad"
              :campaign-uuid="campaignUuid"
            >
              <div>
                <div class="flex flex-wrap items-center gap-1.5 mb-3">
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300">{{ adPlatformLabel(ad.platform) }}</span>
                  <span class="text-[11px] font-semibold px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">{{ ad.funnel_stage }}</span>
                  <span v-if="ad.persona" class="text-[11px] text-muted-foreground truncate">{{ ad.persona }}</span>
                </div>
                <div class="rounded-lg border border-border/50 bg-overlay-subtle p-3 space-y-2 text-start">
                  <div v-if="getAdCopy(ad).headline" class="text-sm font-semibold">{{ getAdCopy(ad).headline }}</div>
                  <div v-if="getAdCopy(ad).body" class="text-xs leading-relaxed">{{ getAdCopy(ad).body }}</div>
                  <div v-if="getAdCopy(ad).cta" class="flex items-center justify-end pt-1">
                    <span class="h-7 px-2.5 rounded-md bg-overlay-medium text-[11px] font-medium">{{ getAdCopy(ad).cta }}</span>
                  </div>
                </div>
              </div>
            </AdReviewCard>
          </div>
        </div>

        <!-- Completion gating error (F17) -->
        <div
          v-if="completeError"
          class="surface-card p-4 mb-6 flex items-start gap-3 border-destructive/40"
          data-testid="complete-error"
        >
          <AlertCircle class="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div class="text-xs text-destructive leading-relaxed">{{ completeError }}</div>
        </div>
        <div class="flex items-center justify-between">
          <button
            class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
            @click="router.push(`/campaigns/${campaignUuid}/visuals`)"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> {{ t('smart.previous') }}
          </button>
          <button
            :disabled="!allDone || completing"
            class="h-10 px-6 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
            data-loc="campaigns.review.complete-btn"
            @click="completeCampaign"
          >
            <Loader2 v-if="completing" class="h-3.5 w-3.5 animate-spin" />
            <Check v-else class="h-3.5 w-3.5" />
            {{ completing ? t('review.completing') : t('review.completeCampaign') }}
          </button>
        </div>
      </template>
    </div>
  </main>
</template>
