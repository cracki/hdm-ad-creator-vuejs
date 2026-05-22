<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import CompetitiveAnalysisRenderer from '@/shared/components/renderers/CompetitiveAnalysisRenderer.vue'
import SocialPresenceRenderer from '@/shared/components/renderers/SocialPresenceRenderer.vue'
import { useBrand, useAnalysisRun, useStartAnalysis } from '@/features/brands/queries'
import { useJobTracker } from '@/shared/composables/useJobTracker'
import { brandsApi } from '@/features/brands/api'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { TERMINAL_STATUSES } from '@/features/brands/schemas'
import {
  Play, Loader2, RefreshCw, Users, BarChart3,
  Globe, Lightbulb, Brain, Heart, Target, ChevronLeft,
  CheckCircle2, XCircle, Clock, Sparkles, Download,
} from 'lucide-vue-next'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { exportBrandAnalysisPDF } from '@/shared/utils/exportBrandAnalysis'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const brandUuid = computed(() => route.params.brandUuid as string)
const runUuid = computed(() => (route.params.runUuid as string) || '')

const { setActions } = usePageActions()

const { data: brand, isLoading: brandLoading } = useBrand(brandUuid)
const { data: existingRun, isLoading: runLoading } = useAnalysisRun(brandUuid, runUuid)

const startMutation = useStartAnalysis(brandUuid)

const opKey = computed(() => `${brandUuid.value}:analysis`)

const tracker = useJobTracker({
  startFn: () => startMutation.mutateAsync({}).then(r => r.data),
  statusFn: (uuid: string) => brandsApi.getAnalysisRun(brandUuid.value, uuid).then(r => r.data),
  getStatus: (data: any) => data.status,
  getUuid: (data: any) => data.analysis_run_uuid,
  isTerminal: (status: string) => TERMINAL_STATUSES.has(status),
  interval: 2000,
})

const runData = computed(() => existingRun.value ?? tracker.data.value)
const isRunning = computed(() =>
  tracker.status.value === 'starting' || tracker.status.value === 'polling'
)
const isCompleted = computed(() =>
  tracker.status.value === 'completed' || runData.value?.status === 'completed'
)
const isFailed = computed(() =>
  tracker.status.value === 'failed' || runData.value?.status === 'failed'
)
const isLoading = computed(() => brandLoading.value || runLoading.value)

function startAnalysis() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  tracker.start()
  const unwatch = watch(() => tracker.status.value, (s) => {
    if (s === 'completed' || s === 'failed') {
      operationManager.finish(opKey.value)
      unwatch()
    }
  })
}

function retryAnalysis() {
  operationManager.finish(opKey.value)
  startAnalysis()
}

onMounted(() => {
  if (runUuid.value && !TERMINAL_STATUSES.has(existingRun.value?.status ?? '')) {
    operationManager.start(opKey.value)
    tracker.resume(runUuid.value)
    const unwatch = watch(() => tracker.status.value, (s) => {
      if (s === 'completed' || s === 'failed') {
        operationManager.finish(opKey.value)
        unwatch()
      }
    })
  }
})

const progressMessages = computed(() => {
  if (!isRunning.value) return []
  return [
    t('analysis.stage.scraping'),
    t('analysis.stage.analyzing'),
    t('analysis.stage.personas'),
    t('analysis.stage.competitors'),
    t('analysis.stage.insights'),
  ]
})

const currentStage = computed(() => {
  const attempts = tracker.attempts.value
  const stages = progressMessages.value
  if (!stages.length) return ''
  const idx = Math.min(Math.floor(attempts / 8), stages.length - 1)
  return stages[idx]
})

const progressDots = computed(() => Math.min(Math.floor(tracker.attempts.value / 8) + 1, 5))

const brandProfile = computed(() => runData.value?.brand_profile ?? null)
const audienceInsights = computed(() => runData.value?.audience_insights ?? null)
const socialPresence = computed(() => runData.value?.social_presence ?? null)
const recommendations = computed(() => runData.value?.recommendations ?? null)
const emotionProfile = computed(() => runData.value?.emotion_profile ?? null)
const competitiveAnalysis = computed(() => runData.value?.competitive_analysis ?? null)

const activeTab = ref<'overview' | 'audience' | 'competitors' | 'insights'>('overview')

const isExporting = ref(false)
const confetti = useConfetti()

async function handleExport() {
  if (!runData.value || isExporting.value) return
  isExporting.value = true
  try {
    await exportBrandAnalysisPDF(runData.value, brand.value?.company_name ?? 'Brand')
    confetti.trigger()
  } finally {
    isExporting.value = false
  }
}

setActions([
  { label: t('analysis.backToBrand'), icon: ChevronLeft, to: `/brands/${brandUuid.value}` },
])
</script>

<template>
  <Topbar
    :title="brand?.company_name ?? t('analysis.title')"
    :subtitle="t('analysis.subtitle')"
  >
    <template #actions>
      <button
        @click="router.push(`/brands/${brandUuid}`)"
        data-loc="brands.analysis.back-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('analysis.backToBrand') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-4">
      <div class="surface-card p-6 shimmer h-64" />
      <div class="surface-card p-6 shimmer h-48" />
    </div>

    <!-- No analysis yet — start prompt -->
    <div v-else-if="!runData && !isRunning" class="max-w-2xl mx-auto text-center py-16 space-y-6">
      <div class="h-20 w-20 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
        <Sparkles class="h-8 w-8 text-primary-foreground" />
      </div>
      <div>
        <h2 class="text-xl font-semibold mb-2">{{ t('analysis.startTitle') }}</h2>
        <p class="text-sm text-muted-foreground max-w-md mx-auto">{{ t('analysis.startDesc') }}</p>
      </div>

      <div class="surface-card p-5 text-start max-w-md mx-auto space-y-3">
        <div class="flex items-center gap-3 text-sm">
          <Globe class="h-4 w-4 text-primary shrink-0" />
          <span>{{ t('analysis.feature.scrape') }}</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <Users class="h-4 w-4 text-primary shrink-0" />
          <span>{{ t('analysis.feature.audience') }}</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <BarChart3 class="h-4 w-4 text-primary shrink-0" />
          <span>{{ t('analysis.feature.competitors') }}</span>
        </div>
        <div class="flex items-center gap-3 text-sm">
          <Brain class="h-4 w-4 text-primary shrink-0" />
          <span>{{ t('analysis.feature.social') }}</span>
        </div>
      </div>

      <button
        @click="startAnalysis"
        data-loc="brands.analysis.start-btn"
        class="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)] hover:opacity-95 transition"
      >
        <Play class="h-4 w-4" /> {{ t('analysis.startBtn') }}
      </button>
    </div>

    <!-- Running state -->
    <div v-else-if="isRunning" class="max-w-2xl mx-auto text-center py-16 space-y-4">
      <AiLoadingAnimation :message="t('analysis.runningTitle')" :description="currentStage" />
      <div class="flex justify-center gap-1">
        <div v-for="i in 5" :key="i" class="h-1.5 w-1.5 rounded-full animate-pulse" :class="i <= progressDots ? 'bg-primary' : 'bg-overlay-strong'" :style="{ animationDelay: `${i * 150}ms` }" />
      </div>
      <p class="text-xs text-muted-foreground">{{ t('analysis.runningHint') }}</p>
    </div>

    <!-- Failed state -->
    <div v-else-if="isFailed" class="max-w-2xl mx-auto text-center py-16 space-y-6">
      <div class="h-20 w-20 rounded-2xl bg-destructive/20 grid place-items-center mx-auto">
        <XCircle class="h-8 w-8 text-destructive" />
      </div>
      <div>
        <h2 class="text-xl font-semibold mb-2">{{ t('analysis.failedTitle') }}</h2>
        <p class="text-sm text-muted-foreground">{{ runData?.error_message ?? tracker.error.value ?? t('analysis.failedDesc') }}</p>
      </div>
      <button
        @click="retryAnalysis"
        data-loc="brands.analysis.retry-btn"
        class="inline-flex items-center gap-2 h-10 px-5 rounded-xl border border-border/60 text-sm font-medium hover:bg-overlay-subtle transition"
      >
        <RefreshCw class="h-4 w-4" /> {{ t('analysis.retry') }}
      </button>
    </div>

    <!-- Completed — results -->
    <div v-else-if="isCompleted && runData" class="space-y-4">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-success/10 grid place-items-center">
            <CheckCircle2 class="h-5 w-5 text-success" />
          </div>
          <div>
            <div class="font-semibold">{{ t('analysis.completedTitle') }}</div>
            <div class="text-xs text-muted-foreground flex items-center gap-1">
              <Clock class="h-3 w-3" />
              {{ new Date(runData.finished_at ?? runData.updated_at).toLocaleString() }}
            </div>
          </div>
        </div>
        <button
          @click="retryAnalysis"
          data-loc="brands.analysis.re-analyze-btn"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
        >
          <RefreshCw class="h-3.5 w-3.5" /> {{ t('analysis.reAnalyze') }}
        </button>
        <button
          @click="handleExport"
          :disabled="isExporting"
          data-loc="brands.analysis.export-pdf-btn"
          class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-semibold shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-60"
        >
          <Download v-if="!isExporting" class="h-3.5 w-3.5" />
          <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
          {{ isExporting ? t('analysis.exporting') : t('analysis.exportPdf') }}
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 p-1 rounded-lg bg-overlay-subtle border border-border/40 w-full sm:w-fit overflow-x-auto">
        <button
          v-for="tab in (['overview', 'audience', 'competitors', 'insights'] as const)"
          :key="tab"
          @click="activeTab = tab"
          :data-loc="`brands.analysis.tab-${tab}`"
          :class="[
            'h-8 px-3 rounded-md text-xs font-medium transition',
            activeTab === tab
              ? 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-overlay-subtle',
          ]"
        >
          {{ t(`analysis.tab.${tab}`) }}
        </button>
      </div>

      <!-- Overview Tab -->
      <div v-if="activeTab === 'overview'" class="grid md:grid-cols-2 gap-4">
        <!-- Brand Profile -->
        <div v-if="brandProfile" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Globe class="h-4 w-4 text-primary" /> {{ t('analysis.section.brandProfile') }}
          </div>
          <AnalysisPayloadRenderer :data="brandProfile" />
        </div>

        <!-- Social Presence -->
        <div v-if="socialPresence" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Brain class="h-4 w-4 text-primary" /> {{ t('analysis.section.socialPresence') }}
          </div>
          <SocialPresenceRenderer :data="socialPresence" />
        </div>

        <!-- Emotion Profile -->
        <div v-if="emotionProfile" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Heart class="h-4 w-4 text-primary" /> {{ t('analysis.section.emotionProfile') }}
          </div>
          <AnalysisPayloadRenderer :data="emotionProfile" />
        </div>

        <!-- Quality Report -->
        <div v-if="runData.quality_report" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Target class="h-4 w-4 text-primary" /> {{ t('analysis.section.quality') }}
          </div>
          <AnalysisPayloadRenderer :data="runData.quality_report" />
        </div>
      </div>

      <!-- Audience Tab -->
      <div v-if="activeTab === 'audience'" class="grid md:grid-cols-2 gap-4">
        <div v-if="audienceInsights" class="surface-card p-5 space-y-4 md:col-span-2">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Users class="h-4 w-4 text-primary" /> {{ t('analysis.section.audience') }}
          </div>
          <AnalysisPayloadRenderer :data="audienceInsights" />
        </div>
        <div v-else class="surface-card p-5 md:col-span-2 text-center text-muted-foreground text-sm py-8">
          {{ t('analysis.noData') }}
        </div>
      </div>

      <!-- Competitors Tab -->
      <div v-if="activeTab === 'competitors'">
        <div v-if="competitiveAnalysis" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <BarChart3 class="h-4 w-4 text-primary" /> {{ t('analysis.section.competitive') }}
          </div>
          <CompetitiveAnalysisRenderer :data="competitiveAnalysis" />
        </div>
        <div v-else class="surface-card p-5 text-center text-muted-foreground text-sm py-8">
          {{ t('analysis.noData') }}
        </div>
      </div>

      <!-- Insights Tab -->
      <div v-if="activeTab === 'insights'" class="grid md:grid-cols-2 gap-4">
        <div v-if="recommendations" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb class="h-4 w-4 text-primary" /> {{ t('analysis.section.recommendations') }}
          </div>
          <AnalysisPayloadRenderer :data="recommendations" />
        </div>
        <div v-if="!recommendations" class="surface-card p-5 md:col-span-2 text-center text-muted-foreground text-sm py-8">
          {{ t('analysis.noData') }}
        </div>
      </div>
    </div>
  </main>
</template>
