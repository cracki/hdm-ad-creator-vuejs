<script setup lang="ts">
import { ref } from 'vue'
import { Search, Loader2, AlertCircle, RefreshCw, MapPin, ShoppingBag, Tag } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import ContentGapsRenderer from '@/shared/components/renderers/ContentGapsRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useGetContentGaps } from '../queries'
import type { ContentGapsResponse } from '../types'

const { t } = useI18n()
const gapsMutation = useGetContentGaps()

const industry = ref('')
const location = ref('')
const topics = ref('')

const gapsResult = ref<ContentGapsResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

async function runGaps() {
  if (!industry.value || !location.value) return
  loading.value = true
  error.value = null
  gapsResult.value = null
  try {
    const res = await gapsMutation.mutateAsync({
      industry: industry.value,
      location: location.value,
      your_topics: topics.value ? topics.value.split(',').map(s => s.trim()) : undefined,
    })
    gapsResult.value = res.data as unknown as ContentGapsResponse
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('market.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Topbar :title="t('market.gapsTitle')" :subtitle="t('market.gapsSubtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Search class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('market.gapsTitle') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('market.gapsDesc') }}</p>
        </div>
      </header>

      <!-- Input form -->
      <div v-if="!gapsResult && !loading" class="surface-card p-5 space-y-4 mb-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="industry" data-loc="market.gaps.industry-input" :placeholder="t('market.industryHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.location') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
              <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="location" data-loc="market.gaps.location-input" :placeholder="t('market.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.yourTopics') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
            <Tag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="topics" data-loc="market.gaps.topics-input" :placeholder="t('market.topicsHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>

        <button
          data-loc="market.gaps.run-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="!industry || !location"
          @click="runGaps"
        >
          <Search class="h-3.5 w-3.5" /> {{ t('market.runGaps') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('market.analyzingGaps') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('market.analyzingGapsDesc') }}</div>
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm font-medium text-destructive">{{ error }}</div>
        <button data-loc="market.gaps.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runGaps">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="gapsResult && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">{{ t('market.analysisComplete') }}</div>
          <button data-loc="market.gaps.re-run-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="gapsResult = null">
            <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
          </button>
        </div>

        <div class="surface-card p-5">
          <ContentGapsRenderer :data="(gapsResult as any)" />
        </div>
      </div>
    </div>
  </main>
</template>
