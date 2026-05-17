<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Download, ArrowLeft, Loader2, Check } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign, useCampaignAds } from '../queries'
import { useCompleteCampaign } from '../queries'
import { operationManager } from '@/infrastructure/operations/operationManager'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])
const { data: ads } = useCampaignAds(campaignUuid)
const completeMutation = useCompleteCampaign(campaignUuid)

const adsList = computed(() => Array.isArray(ads.value) ? ads.value : [])

const completionFlags = computed(() => [
  { key: 'segmentation', label: t('smart.s1'), done: campaign.value?.segmentation_completed ?? false },
  { key: 'ppc_viability', label: t('smart.s3'), done: campaign.value?.ppc_viability_completed ?? false },
  { key: 'funnel', label: t('smart.s4'), done: campaign.value?.funnel_completed ?? false },
  { key: 'content_strategy', label: t('smart.s5'), done: campaign.value?.content_strategy_completed ?? false },
  { key: 'meta_ads', label: 'Meta Ads', done: campaign.value?.meta_ads_completed ?? false },
  { key: 'google_ads', label: 'Google Ads', done: campaign.value?.google_ads_completed ?? false },
  { key: 'linkedin_ads', label: 'LinkedIn Ads', done: campaign.value?.linkedin_ads_completed ?? false },
])

const completedCount = computed(() => completionFlags.value.filter((f) => f.done).length)
const progress = computed(() => Math.round((completedCount.value / completionFlags.value.length) * 100))
const allDone = computed(() => completionFlags.value.every((f) => f.done))

const completing = ref(false)

async function completeCampaign() {
  if (!allDone.value) return
  const opKey = `${campaignUuid.value}:complete`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  completing.value = true
  try {
    await completeMutation.mutateAsync()
    router.push('/campaigns')
  } catch {
    // mutation handles error via toast
  } finally {
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
  <Topbar :title="campaign?.name ?? ''" :subtitle="campaign?.brand?.company_name">
    <template #actions>
      <button
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition"
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
      </header>

      <div v-if="isLoading" class="flex justify-center py-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <template v-else>
        <!-- Progress overview -->
        <div class="surface-card p-5 mb-6">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold">{{ t('review.progress') }}</div>
            <div class="text-xs text-muted-foreground">{{ progress }}%</div>
          </div>
          <div class="h-2 rounded-full bg-white/5 overflow-hidden mb-4">
            <div class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-500" :style="{ width: `${progress}%` }" />
          </div>
          <div class="grid sm:grid-cols-2 gap-2">
            <div
              v-for="flag in completionFlags"
              :key="flag.key"
              class="flex items-center gap-2 text-xs"
            >
              <div :class="['h-4 w-4 rounded grid place-items-center shrink-0', flag.done ? 'bg-success/15 text-success' : 'bg-white/5 text-muted-foreground']">
                <Check v-if="flag.done" class="h-3 w-3" />
              </div>
              <span :class="flag.done ? '' : 'text-muted-foreground'">{{ flag.label }}</span>
            </div>
          </div>
        </div>

        <!-- Ads summary -->
        <div v-if="adsList.length > 0" class="surface-card p-5 mb-6">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold">{{ t('review.adsSummary') }}</div>
            <div class="text-xs text-muted-foreground">{{ t('adgen.adsFound', { count: adsList.length }) }}</div>
          </div>
          <div class="grid sm:grid-cols-3 gap-3">
            <div
              v-for="platform in (['meta', 'google', 'linkedin'] as const)"
              :key="platform"
              class="p-3 rounded-lg bg-white/[0.03] border border-border/40"
            >
              <div class="text-xs font-semibold mb-1">{{ adPlatformLabel(platform) }}</div>
              <div class="text-2xl font-bold">{{ adsList.filter((a: any) => a.platform === platform).length }}</div>
              <div class="text-[11px] text-muted-foreground">{{ t('review.ads') }}</div>
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
          </div>
        </div>

        <div class="flex items-center justify-between">
          <button
            class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition flex items-center gap-1.5"
            @click="router.push(`/campaigns/${campaignUuid}/visuals`)"
          >
            <ArrowLeft class="h-3.5 w-3.5" /> {{ t('smart.previous') }}
          </button>
          <button
            :disabled="!allDone || completing"
            class="h-10 px-6 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
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
