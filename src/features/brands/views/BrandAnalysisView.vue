<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQueryClient } from '@tanstack/vue-query'
import Topbar from '@/layout/Topbar.vue'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import CompetitiveAnalysisRenderer from '@/shared/components/renderers/CompetitiveAnalysisRenderer.vue'
import SocialPresenceRenderer from '@/shared/components/renderers/SocialPresenceRenderer.vue'
import ProgressIndicator from '@/shared/components/ProgressIndicator.vue'
import InfoTooltip from '@/shared/components/InfoTooltip.vue'

import { useBrand, useAnalysisRun, useStartAnalysis } from '@/features/brands/queries'
import { useJobTracker } from '@/shared/composables/useJobTracker'
import { brandsApi } from '@/features/brands/api'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { TERMINAL_STATUSES } from '@/features/brands/schemas'
import PersonalityCards from '../components/PersonalityCards.vue'
import BrandRadarChart from '../components/BrandRadarChart.vue'
import BrandWheel from '../components/BrandWheel.vue'
import TakeawayCards from '../components/TakeawayCards.vue'
import {
  extractPersonality,
  extractRadarDimensions,
  extractWheelShares,
  extractTakeaways,
} from '../components/personality'
import {
  ANALYSIS_SECTIONS,
  extractSectionStatus,
  sectionStageStates,
  firstSectionError,
  sectionStuckGuard,
} from '../sectionProgress'
import {
  Play, Loader2, RefreshCw, Users, BarChart3,
  Globe, Lightbulb, Brain, Heart, ChevronLeft,
  CheckCircle2, XCircle, Clock, Sparkles, Download,
} from 'lucide-vue-next'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useTourRegistration } from '@/shared/composables/useTourRegistration'
import { brandAnalysisTour } from '../tours'

useTourRegistration(brandAnalysisTour)
import { useConfetti } from '@/shared/composables/useConfetti'
import { exportBrandAnalysisPDF } from '@/shared/utils/exportBrandAnalysis'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const queryClient = useQueryClient()

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
  messages: {
    failed: t('jobTracker.failed'),
    timeout: t('jobTracker.timeout'),
    startFailed: t('jobTracker.startFailed'),
    resumeFailed: t('jobTracker.resumeFailed'),
    pollError: t('jobTracker.pollError'),
  },
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

function watchTrackerTerminal() {
  const unwatch = watch(() => tracker.status.value, (s) => {
    if (s === 'completed' || s === 'failed') {
      operationManager.finish(opKey.value)
      unwatch()
    }
  })
  // The tracker can already BE terminal at registration (e.g. a retry/resume
  // that settled synchronously) — release the operation lock right away.
  if (tracker.status.value === 'completed' || tracker.status.value === 'failed') {
    operationManager.finish(opKey.value)
    unwatch()
  }
}

function startAnalysis() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  tracker.start()
  watchTrackerTerminal()
}

// QA round 3: when the tracker reaches terminal success, invalidate the run
// queries so the displayed run refetches the FINAL payload — the Overview tab
// used to stay empty until a manual refresh (the stale pre-completion fetch
// outranked the tracker's data).
watch(tracker.status, (s) => {
  if (s === 'completed') {
    queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'analysis-runs'] })
  }
})

// QA4-taza1: a retry starts a NEW run. The route used to stay on the old run
// uuid, so `existingRun` kept serving the old run's stale sections_status and
// the progress bar stayed stuck on the previous state. Start the new run
// first, move the route to it, then track the new run from a cleared state.
async function retryAnalysis() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    const res = await startMutation.mutateAsync({ previousRunUuid: runUuid.value || undefined })
    const newRunUuid = res.data?.analysis_run_uuid ?? ''
    // Clear the old run from the tracker so the bar restarts from zero.
    tracker.reset()
    if (newRunUuid && newRunUuid !== runUuid.value) {
      await router.replace(`/brands/${brandUuid.value}/analysis/${newRunUuid}`)
    }
    tracker.resume(newRunUuid || runUuid.value)
    watchTrackerTerminal()
  } catch {
    // Start failed — surface it through the tracker's failed state (same UX
    // as a failed tracker.start()) and release the operation lock.
    tracker.reset()
    tracker.status.value = 'failed'
    tracker.error.value = t('jobTracker.startFailed')
    operationManager.finish(opKey.value)
  }
}

onMounted(() => {
  if (runUuid.value && !TERMINAL_STATUSES.has(existingRun.value?.status ?? '')) {
    operationManager.start(opKey.value)
    tracker.resume(runUuid.value)
    watchTrackerTerminal()
  }
})

const progressMessages = computed(() => [
  t('analysis.stage.scraping'),
  t('analysis.stage.analyzing'),
  t('analysis.stage.personas'),
  t('analysis.stage.competitors'),
  t('analysis.stage.insights'),
])

const progressStepIndex = computed(() => {
  const stages = progressMessages.value
  if (!stages.length) return 0
  return Math.min(Math.floor(tracker.attempts.value / 8), stages.length - 1)
})

// --- Live per-section progress (backend `sections_status`) ---
// Older runs lack the field → fall back to the poll-count derivation above.
const sectionStatuses = computed(() => extractSectionStatus(runData.value))
const hasSectionProgress = computed(() => sectionStatuses.value !== null)

function prettifySection(key: string): string {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

const sectionLabels = computed(() => {
  const statuses = sectionStatuses.value ?? {}
  const known = ANALYSIS_SECTIONS.map((s) => t(`analysis.progress.${s}` as any))
  const extras = Object.keys(statuses).filter(
    (s) => !(ANALYSIS_SECTIONS as readonly string[]).includes(s),
  )
  return [...known, ...extras.map(prettifySection)]
})

const sectionStates = computed(() =>
  sectionStatuses.value ? sectionStageStates(sectionStatuses.value) : [],
)

const sectionError = computed(() =>
  sectionStatuses.value ? firstSectionError(sectionStatuses.value) : null,
)

// QA4-taza1: a section stuck in 'running' for many polls gets a muted hint
// while polling continues. Plain inline text — no new translation keys.
const analysisStuck = computed(() =>
  sectionStuckGuard(sectionStatuses.value, tracker.attempts.value).stuck,
)

const progressStages = computed(() =>
  hasSectionProgress.value ? sectionLabels.value : progressMessages.value,
)

const progressStates = computed(() =>
  hasSectionProgress.value ? sectionStates.value : undefined,
)

const currentStage = computed(() => {
  if (hasSectionProgress.value) {
    const idx = sectionStates.value.indexOf('current')
    if (idx >= 0) return sectionLabels.value[idx]
    const failedIdx = sectionStates.value.indexOf('failed')
    if (failedIdx >= 0) return sectionLabels.value[failedIdx]
  }
  return progressMessages.value[progressStepIndex.value] ?? ''
})

const brandProfile = computed(() => runData.value?.brand_profile ?? null)
const audienceInsights = computed(() => runData.value?.audience_insights ?? null)

// --- Brand personality visuals (MOM §4.3); each section hides itself when the payload lacks its data ---
const personality = computed(() => extractPersonality(brandProfile.value))
const radarDimensions = computed(() => extractRadarDimensions(brandProfile.value))
const wheelShares = computed(() => extractWheelShares(brandProfile.value))
const takeaways = computed(() => extractTakeaways(brandProfile.value))

const socialPresence = computed(() => runData.value?.social_presence ?? null)

const recommendations = computed(() => runData.value?.recommendations ?? null)
const emotionProfile = computed(() => runData.value?.emotion_profile ?? null)
const competitiveAnalysis = computed(() => runData.value?.competitive_analysis ?? null)

const activeTab = ref<'overview' | 'social' | 'audience' | 'competitors' | 'insights'>('overview')

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
        data-tour="brands.analysis.start-btn"
        class="inline-flex items-center gap-2 h-11 px-6 rounded-xl bg-[image:var(--gradient-brand)] text-primary-foreground text-sm font-semibold shadow-[var(--shadow-glow)] hover:opacity-95 transition"
      >
        <Play class="h-4 w-4" /> {{ t('analysis.startBtn') }}
      </button>
    </div>

    <!-- Running state -->
    <div v-else-if="isRunning" class="max-w-2xl mx-auto text-center py-16 space-y-4">
      <AiLoadingAnimation :message="t('analysis.runningTitle')" :description="currentStage" />
      <ProgressIndicator
        :stages="progressStages"
        :current-index="progressStepIndex"
        :states="progressStates"
        status="running"
        class="justify-center"
      />
      <p class="text-xs text-muted-foreground">{{ t('analysis.runningHint') }}</p>
      <p v-if="analysisStuck" data-testid="analysis-stuck-hint" class="text-xs text-muted-foreground/70">
        Still processing — this is taking longer than usual.
      </p>
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
      <div v-if="sectionError" class="surface-card p-3 text-xs text-destructive text-start max-w-md mx-auto w-full">
        <span class="font-medium">{{ t('analysis.progress.sectionError') }}:</span> {{ sectionError }}
      </div>
      <ProgressIndicator
        :stages="progressStages"
        :current-index="progressStepIndex"
        :states="progressStates"
        status="failed"
        class="justify-center"
      />
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
      <div class="flex gap-1 p-1 rounded-lg bg-overlay-subtle border border-border/40 w-full sm:w-fit overflow-x-auto" data-tour="brands.analysis.type-selector">
        <button
          v-for="tab in (['overview', 'social', 'audience', 'competitors', 'insights'] as const)"
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
      <div v-if="activeTab === 'overview'" class="grid md:grid-cols-2 gap-4" data-tour="brands.analysis.results">
        <!-- Brand Profile -->
        <div v-if="brandProfile" class="surface-card p-5 space-y-4 md:col-span-2">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Globe class="h-4 w-4 text-primary" /> {{ t('analysis.section.brandProfile') }} <InfoTooltip :text="t('analysis.hint.brandProfile')" />
          </div>
          <AnalysisPayloadRenderer :data="brandProfile" />
        </div>

        <!-- Emotion Profile -->
        <div v-if="emotionProfile" class="surface-card p-5 space-y-4 md:col-span-2">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Heart class="h-4 w-4 text-primary" /> {{ t('analysis.section.emotionProfile') }}
          </div>
          <AnalysisPayloadRenderer :data="emotionProfile" />
        </div>

        <!-- Brand Personality visuals (MOM §4.3) -->
        <div v-if="personality" class="surface-card p-5 space-y-4 md:col-span-2" data-testid="personality-section">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Sparkles class="h-4 w-4 text-primary" /> {{ t('analysis.personality.title') }}
            <InfoTooltip :text="t('analysis.personality.hint')" />
          </div>
          <PersonalityCards :data="personality" />
          <div v-if="radarDimensions || wheelShares" class="grid sm:grid-cols-2 gap-4">
            <div v-if="radarDimensions" class="space-y-2">
              <div class="text-xs font-medium text-muted-foreground">{{ t('analysis.personality.radarTitle') }}</div>
              <BrandRadarChart :dimensions="radarDimensions" />
            </div>
            <div v-if="wheelShares" class="space-y-2">
              <div class="text-xs font-medium text-muted-foreground">{{ t('analysis.personality.wheelTitle') }}</div>
              <BrandWheel :shares="wheelShares" />
              <p class="text-[11px] text-muted-foreground/70 text-center">{{ t('analysis.personality.wheelHint') }}</p>
            </div>
          </div>
          <!-- QA fix 2: charts stay hidden without real numeric data — say so instead of faking shares -->
          <div
            v-else
            data-testid="personality-charts-missing"
            class="rounded-lg border border-dashed border-border/50 bg-overlay-subtle px-4 py-3 text-xs text-muted-foreground text-center"
          >
            {{ t('analysis.personality.notEnoughData') }}
          </div>
        </div>

        <!-- Key takeaways -->
        <div v-if="takeaways.length" class="surface-card p-5 space-y-4 md:col-span-2" data-testid="takeaways-section">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb class="h-4 w-4 text-primary" /> {{ t('analysis.personality.takeawaysTitle') }}
          </div>
          <TakeawayCards :items="takeaways" />
        </div>
      </div>

      <!-- Social Presence Tab -->
      <div v-if="activeTab === 'social'">
        <div v-if="socialPresence" class="surface-card p-5 space-y-4">
          <div class="flex items-center gap-2 text-sm font-semibold">
            <Brain class="h-4 w-4 text-primary" /> {{ t('analysis.section.socialPresence') }}
          </div>
          <SocialPresenceRenderer :data="socialPresence" />
        </div>
        <div v-else class="surface-card p-5 text-center text-muted-foreground text-sm py-8">
          {{ t('analysis.noData') }}
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
