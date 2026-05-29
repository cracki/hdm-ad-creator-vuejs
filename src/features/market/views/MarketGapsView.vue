<script setup lang="ts">
import { ref, computed } from 'vue'
import { Search, AlertCircle, RefreshCw, MapPin, ShoppingBag, Tag, Download, FileText, LayoutGrid, BarChart3, Loader2, ArrowLeft } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import ContentGapsRenderer from '@/shared/components/renderers/ContentGapsRenderer.vue'
import MarketHistoryList from '../components/MarketHistoryList.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useGetContentGaps, useContentGapsHistory } from '../queries'
import { exportContentGapsPDF, exportContentGapsPPTX, exportContentGapsXLSX } from '@/shared/utils/exportMarket'
import type { ContentGapsResponse, ContentIntelligenceRun } from '../types'

const { t } = useI18n()
const gapsMutation = useGetContentGaps()
const confetti = useConfetti()

const industry = ref('')
const location = ref('')
const topics = ref('')

const gapsResult = ref<ContentGapsResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const selectedHistoryUuid = ref<string | null>(null)
const selectedHistoryDate = ref<string | null>(null)

const { data: historyRuns, isLoading: historyListLoading } = useContentGapsHistory()

const showForm = computed(() => !gapsResult.value && !loading.value && !selectedHistoryUuid.value)

const showExportMenu = ref(false)
const exporting = ref(false)

async function runGaps() {
  if (!industry.value || !location.value) return
  loading.value = true
  error.value = null
  gapsResult.value = null
  selectedHistoryUuid.value = null
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

function selectHistoryRun(run: ContentIntelligenceRun) {
  selectedHistoryUuid.value = run.content_intelligence_run_uuid
  selectedHistoryDate.value = run.created_at
  gapsResult.value = run.result_payload as unknown as ContentGapsResponse
  error.value = null
}

function backToForm() {
  gapsResult.value = null
  selectedHistoryUuid.value = null
  selectedHistoryDate.value = null
  error.value = null
}

async function handleExport(format: 'pdf' | 'pptx' | 'xlsx') {
  showExportMenu.value = false
  if (!gapsResult.value) return
  exporting.value = true
  try {
    if (format === 'pdf') await exportContentGapsPDF(gapsResult.value)
    else if (format === 'pptx') await exportContentGapsPPTX(gapsResult.value)
    else await exportContentGapsXLSX(gapsResult.value)
    confetti.trigger()
  } finally { exporting.value = false }
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
      <div v-if="showForm" class="surface-card p-5 space-y-4 mb-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="industry" data-loc="market.gaps.industry-input" :placeholder="t('market.industryHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.location') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="location" data-loc="market.gaps.location-input" :placeholder="t('market.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.yourTopics') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
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

      <!-- Past Runs -->
      <section v-if="showForm" class="mt-6">
        <MarketHistoryList
          :runs="historyRuns ?? []"
          :loading="historyListLoading"
          feature-key="market.gaps"
          @select="selectHistoryRun"
        />
      </section>

      <!-- Loading (POST) -->
      <div v-if="loading" class="surface-card p-8">
        <AiLoadingAnimation :message="t('market.analyzingGaps')" :description="t('market.analyzingGapsDesc')" />
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm font-medium text-destructive">{{ error }}</div>
        <button data-loc="market.gaps.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runGaps">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results (POST or history) -->
      <div v-if="gapsResult && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">
            <span v-if="selectedHistoryUuid">{{ t('market.history.runFrom', { date: new Date(selectedHistoryDate ?? '').toLocaleDateString() }) }}</span>
            <span v-else>{{ t('market.analysisComplete') }}</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <button :disabled="exporting" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition disabled:opacity-50" @click="showExportMenu = !showExportMenu">
                <Loader2 v-if="exporting" class="h-3 w-3 animate-spin" />
                <Download v-else class="h-3 w-3" />
                {{ exporting ? t('market.exporting') : t('market.export') }}
              </button>
              <div v-if="showExportMenu" class="absolute end-0 top-full mt-1 z-50 min-w-[180px] max-w-[calc(100vw-2rem)] rounded-lg border border-border/40 bg-popover shadow-lg py-1">
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('pdf')"><FileText class="h-3.5 w-3.5 text-red-400" /> {{ t('market.exportPDF') }}</button>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('pptx')"><LayoutGrid class="h-3.5 w-3.5 text-orange-400" /> {{ t('market.exportPPTX') }}</button>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('xlsx')"><BarChart3 class="h-3.5 w-3.5 text-green-400" /> {{ t('market.exportXLSX') }}</button>
              </div>
              <div v-if="showExportMenu" class="fixed inset-0 z-40" @click="showExportMenu = false" />
            </div>
            <button data-loc="market.gaps.back-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="backToForm">
              <ArrowLeft v-if="selectedHistoryUuid" class="h-3 w-3" />
              <RefreshCw v-else class="h-3 w-3" />
              {{ selectedHistoryUuid ? t('market.history.backToList') : t('market.reRun') }}
            </button>
          </div>
        </div>

        <div class="surface-card p-5">
          <ContentGapsRenderer :data="(gapsResult as any)" />
        </div>
      </div>
    </div>
  </main>
</template>
