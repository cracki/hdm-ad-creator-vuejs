<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft, AlertCircle } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useFullFunnelHistoryDetail } from '../queries'
import FullFunnelCampaignDisplay from '../components/FullFunnelCampaignDisplay.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading, error } = useFullFunnelHistoryDetail(campaignUuid)

const selectedStages = computed(() => {
  const stages = new Set<string>()
  const c = campaign.value
  if (!c) return ['tofu', 'mofu', 'bofu']
  if (c.funnel_strategies) {
    if ((c.funnel_strategies as any).tofu) stages.add('tofu')
    if ((c.funnel_strategies as any).mofu) stages.add('mofu')
    if ((c.funnel_strategies as any).bofu) stages.add('bofu')
  }
  return stages.size > 0 ? [...stages] : ['tofu', 'mofu', 'bofu']
})
</script>

<template>
  <Topbar
    :title="campaign?.campaign_name ?? t('fullFunnelHistory.detailTitle')"
    :subtitle="campaign?.brand_name ?? ''"
  >
    <template #actions>
      <button
        @click="router.push('/campaigns/full-funnel/history')"
        data-loc="fullfunnel-history-detail.back-btn"
        class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('fullFunnelHistory.backToHistory') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <!-- Loading -->
      <div v-if="isLoading" class="surface-card p-8">
        <div class="shimmer h-8 w-48 mb-4" />
        <div class="shimmer h-4 w-full mb-2" />
        <div class="shimmer h-4 w-3/4 mb-2" />
        <div class="shimmer h-4 w-1/2" />
      </div>

      <!-- Error -->
      <div v-else-if="error" class="surface-card p-8 text-center space-y-3">
        <AlertCircle class="h-8 w-8 text-destructive mx-auto" />
        <div class="text-sm text-muted-foreground">{{ t('fullFunnelHistory.loadError') }}</div>
      </div>

      <!-- Campaign Display -->
      <FullFunnelCampaignDisplay
        v-else-if="campaign"
        :campaign-data="(campaign as any)"
        :brand-name="campaign.brand_name ?? ''"
        :selected-platforms="campaign.platforms ?? []"
        :currency="campaign.currency ?? 'USD'"
        :budget="campaign.total_budget ?? 0"
        :duration="campaign.duration_days ?? 30"
        :selected-stages="selectedStages"
        :show-banner="false"
      />
    </div>
  </main>
</template>
