<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, Eye, ChevronLeft, Filter, Layers, Megaphone } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useFullFunnelHistory } from '../queries'
import { useBrands } from '@/features/brands/queries'

const router = useRouter()
const { t } = useI18n()
const { data: history, isLoading } = useFullFunnelHistory()
const { data: brands } = useBrands()

const selectedBrandFilter = ref('')

const platformList: Record<string, { icon: string }> = {
  meta: { icon: '📘' },
  google: { icon: '🔍' },
  linkedin: { icon: '💼' },
  tiktok: { icon: '🎵' },
}

const filteredHistory = computed(() => {
  if (!history.value) return []
  if (!selectedBrandFilter.value) return history.value
  return history.value.filter(
    (item) => item.brand?.brand_uuid === selectedBrandFilter.value,
  )
})
</script>

<template>
  <Topbar
    :title="t('fullFunnelHistory.title')"
    :subtitle="t('fullFunnelHistory.subtitle')"
  >
    <template #actions>
      <button
        @click="router.push('/campaigns/full-funnel')"
        data-loc="fullfunnel-history.back-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('fullFunnelHistory.backToLauncher') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div class="max-w-4xl mx-auto space-y-4">
      <!-- Brand Filter -->
      <div v-if="(history?.length ?? 0) > 0" class="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div class="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter class="h-3.5 w-3.5" />
          <span>{{ t('fullFunnelHistory.filterByBrand') }}</span>
        </div>
        <select
          v-model="selectedBrandFilter"
          data-loc="fullfunnel-history.brand-filter"
          class="w-full sm:w-auto h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary/50 min-w-0"
        >
          <option value="">{{ t('fullFunnelHistory.allBrands') }}</option>
          <option v-for="b in (brands ?? [])" :key="b.brand_uuid" :value="b.brand_uuid">
            {{ b.company_name }}
          </option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="surface-card p-5 shimmer h-28" />
      </div>

      <!-- History List -->
      <div v-else-if="filteredHistory.length" class="space-y-3">
        <div
          v-for="item in filteredHistory"
          :key="item.full_funnel_compaign_uuid"
          data-loc="fullfunnel-history.item"
          class="surface-card p-5 hover:border-primary/40 transition cursor-pointer"
          @click="router.push(`/campaigns/full-funnel/history/${item.full_funnel_compaign_uuid}`)"
        >
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <!-- Icon -->
            <div class="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
              <Megaphone class="h-5 w-5 text-primary" />
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0 space-y-1.5">
              <div class="font-medium text-sm truncate">
                {{ item.campaign_name || item.brand_name }}
              </div>
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{{ item.brand_name }}</span>
                <span v-if="item.total_budget" class="flex items-center gap-1">
                  {{ item.currency }} {{ item.total_budget.toLocaleString() }}
                </span>
                <span v-if="item.duration_days" class="flex items-center gap-1">
                  {{ item.duration_days }} {{ t('fullFunnelHistory.days') }}
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <!-- Platforms -->
                <span v-for="p in (item.platforms ?? [])" :key="p" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">
                  {{ platformList[p]?.icon }} {{ p }}
                </span>
                <!-- Status -->
                <span class="text-[10px] px-1.5 py-0.5 rounded capitalize"
                  :class="item.status === 'draft' ? 'bg-accent-amber/10 text-accent-amber' : 'bg-success/10 text-success'"
                >
                  {{ item.status }}
                </span>
                <!-- Ad count -->
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1">
                  <Layers class="h-2.5 w-2.5" /> {{ item.total_ads }} {{ t('fullFunnelHistory.ads') }}
                </span>
              </div>
            </div>

            <!-- Date & Arrow -->
            <div class="flex items-center gap-3 text-xs text-muted-foreground shrink-0 self-start sm:self-center">
              <div class="flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5" />
                <span>{{ new Date(item.created_at).toLocaleDateString() }}</span>
              </div>
              <Eye class="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="text-center py-16 space-y-3">
        <div class="text-sm text-muted-foreground">{{ t('fullFunnelHistory.emptyTitle') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('fullFunnelHistory.emptyDesc') }}</div>
        <button
          @click="router.push('/campaigns/full-funnel')"
          data-loc="fullfunnel-history.go-launcher-btn"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium"
        >
          <Megaphone class="h-3.5 w-3.5" /> {{ t('fullFunnelHistory.goLauncher') }}
        </button>
      </div>
    </div>
  </main>
</template>
