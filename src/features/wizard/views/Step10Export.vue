<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Loader2, Check } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useCampaignAds, useCompleteCampaign } from '@/features/campaigns/queries'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()
const router = useRouter()

const { data: ads } = useCampaignAds(computed(() => props.campaignUuid))
const completeMutation = useCompleteCampaign(computed(() => props.campaignUuid))

const adsList = computed(() => Array.isArray(ads.value) ? ads.value : [])

const completionFlags = computed(() => [
  { key: 'segmentation', label: t('smart.s2'), done: props.campaign.segmentation_completed },
  { key: 'ppc_viability', label: t('smart.s3'), done: props.campaign.ppc_viability_completed },
  { key: 'funnel', label: t('smart.s4'), done: props.campaign.funnel_completed },
  { key: 'content_strategy', label: t('smart.s5'), done: props.campaign.content_strategy_completed },
  { key: 'meta_ads', label: 'Meta Ads', done: props.campaign.meta_ads_completed },
  { key: 'google_ads', label: 'Google Ads', done: props.campaign.google_ads_completed },
  { key: 'linkedin_ads', label: 'LinkedIn Ads', done: props.campaign.linkedin_ads_completed },
])

const completedCount = computed(() => completionFlags.value.filter(f => f.done).length)
const progress = computed(() => Math.round((completedCount.value / completionFlags.value.length) * 100))
const allDone = computed(() => completionFlags.value.every(f => f.done))

const completing = ref(false)

async function completeCampaign() {
  if (!allDone.value) return
  const opKey = `${props.campaignUuid}:complete`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  completing.value = true
  try {
    await completeMutation.mutateAsync()
    emit('completed')
    router.push('/campaigns')
  } catch { /* mutation handles error */ } finally {
    completing.value = false
    operationManager.finish(opKey)
  }
}

function adPlatformLabel(p: string) {
  const map: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' }
  return map[p] ?? p
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Download class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 10 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s10') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('review.description') }}</p>
      </div>
    </header>

    <!-- Progress overview -->
    <div class="surface-card p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-semibold">{{ t('review.progress') }}</div>
        <div class="text-xs text-muted-foreground">{{ progress }}%</div>
      </div>
      <div class="h-2 rounded-full bg-overlay-subtle overflow-hidden mb-4">
        <div class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-500" :style="{ width: `${progress}%` }" />
      </div>
      <div class="grid sm:grid-cols-2 gap-2">
        <div v-for="flag in completionFlags" :key="flag.key" class="flex items-center gap-2 text-xs">
          <div :class="['h-4 w-4 rounded grid place-items-center shrink-0', flag.done ? 'bg-success/15 text-success' : 'bg-overlay-subtle text-muted-foreground']">
            <Check v-if="flag.done" class="h-3 w-3" />
          </div>
          <span :class="flag.done ? '' : 'text-muted-foreground'">{{ flag.label }}</span>
        </div>
      </div>
    </div>

    <!-- Ads summary -->
    <div v-if="adsList.length > 0" class="surface-card p-5">
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-semibold">{{ t('review.adsSummary') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('adgen.adsFound', { count: adsList.length }) }}</div>
      </div>
      <div class="grid sm:grid-cols-3 gap-3">
        <div v-for="platform in (['meta', 'google', 'linkedin'] as const)" :key="platform" class="p-3 rounded-lg bg-overlay-subtle border border-border/40">
          <div class="text-xs font-semibold mb-1">{{ adPlatformLabel(platform) }}</div>
          <div class="text-2xl font-bold">{{ adsList.filter((a: any) => a.platform === platform).length }}</div>
          <div class="text-[11px] text-muted-foreground">{{ t('review.ads') }}</div>
        </div>
      </div>
    </div>

    <!-- Campaign info -->
    <div class="surface-card p-5">
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
      </div>
    </div>

    <!-- Complete button -->
    <div class="flex items-center justify-center">
      <button
        :disabled="!allDone || completing"
        class="h-12 px-8 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] flex items-center gap-2 disabled:opacity-50"
        @click="completeCampaign"
      >
        <Loader2 v-if="completing" class="h-4 w-4 animate-spin" />
        <Check v-else class="h-4 w-4" />
        {{ completing ? t('review.completing') : t('review.completeCampaign') }}
      </button>
    </div>
  </div>
</template>
