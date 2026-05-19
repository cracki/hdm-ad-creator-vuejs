<script setup lang="ts">
import { ref, computed } from 'vue'
import { Brain, Loader2, AlertCircle, MapPin, ShoppingBag, RefreshCw, Check, BarChart3, Target, Layers, TrendingUp, Lightbulb } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import ContentOpportunitiesRenderer from '@/shared/components/renderers/ContentOpportunitiesRenderer.vue'
import ContentGapsRenderer from '@/shared/components/renderers/ContentGapsRenderer.vue'
import ContentMatrixRenderer from '@/shared/components/renderers/ContentMatrixRenderer.vue'
import TopPerformingContentRenderer from '@/shared/components/renderers/TopPerformingContentRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import { useRunContentIntelligence } from '../queries'
import type { ContentIntelligenceRun, ContentIntelligenceResult } from '../types'

const { t } = useI18n()
const { data: brands } = useBrands()
const runMutation = useRunContentIntelligence()

const selectedBrandUuid = ref('')
useAutoSelectBrand(selectedBrandUuid)
const industry = ref('')
const location = ref('')
const brandServices = ref('')
const contentGoal = ref<'engagement' | 'leads' | 'awareness' | 'sales' | 'education'>('engagement')

const result = ref<ContentIntelligenceRun | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const contentGoals = [
  { value: 'engagement' as const, label: 'Engagement' },
  { value: 'leads' as const, label: 'Leads' },
  { value: 'awareness' as const, label: 'Awareness' },
  { value: 'sales' as const, label: 'Sales' },
  { value: 'education' as const, label: 'Education' },
]

const payload = computed<ContentIntelligenceResult>(() => (result.value?.result_payload ?? {}) as ContentIntelligenceResult)

const activeTab = ref<'summary' | 'opportunities' | 'gaps' | 'matrix' | 'top'>('summary')

const tabs = computed(() => [
  { key: 'summary' as const, icon: BarChart3, label: t('intel.summary') },
  { key: 'opportunities' as const, icon: TrendingUp, label: t('intel.opportunities'), count: payload.value?.content_opportunities?.total_topics_found },
  { key: 'gaps' as const, icon: Target, label: t('intel.gaps'), count: payload.value?.content_gaps?.total_gaps_found },
  { key: 'matrix' as const, icon: Layers, label: t('intel.matrix'), count: payload.value?.content_matrix?.total_content_ideas },
  { key: 'top' as const, icon: Lightbulb, label: t('intel.topPerformers'), count: payload.value?.top_performers?.top_performers?.length },
])

async function runIntelligence() {
  loading.value = true
  error.value = null
  result.value = null
  activeTab.value = 'summary'
  try {
    const res = await runMutation.mutateAsync({
      brand_uuid: selectedBrandUuid.value,
      industry: industry.value,
      location: location.value,
      brand_services: brandServices.value ? brandServices.value.split(',').map(s => s.trim()) : undefined,
      content_goal: contentGoal.value,
    })
    result.value = res.data
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('market.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Topbar :title="t('market.intelTitle')" :subtitle="t('market.intelSubtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
      <header class="flex items-start gap-3 sm:gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Brain class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('market.intelTitle') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('market.intelDesc') }}</p>
        </div>
      </header>

      <!-- Input form -->
      <div v-if="!result && !loading" class="surface-card p-5 space-y-4 mb-6">
        <!-- Brand selection -->
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.selectBrand') }}</label>
          <select
            v-model="selectedBrandUuid"
            data-loc="market.intel.brand-select"
            class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="" disabled>{{ t('market.chooseBrand') }}</option>
            <option v-for="b in (brands ?? [])" :key="b.brand_uuid" :value="b.brand_uuid">
              {{ b.company_name }}
            </option>
          </select>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="industry" data-loc="market.intel.industry-input" :placeholder="t('market.industryHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.location') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="location" data-loc="market.intel.location-input" :placeholder="t('market.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.brandServices') }}</label>
          <input v-model="brandServices" data-loc="market.intel.brand-services-input" :placeholder="t('market.brandServicesHint')" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.contentGoal') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="goal in contentGoals"
              :key="goal.value"
              data-loc="market.intel.goal-btn"
              :class="[
                'h-8 px-3 rounded-lg text-xs font-medium border transition',
                contentGoal === goal.value
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground border-transparent'
                  : 'bg-overlay-subtle border-border/60 text-muted-foreground hover:text-foreground',
              ]"
              @click="contentGoal = goal.value"
            >
              {{ goal.label }}
            </button>
          </div>
        </div>

        <button
          data-loc="market.intel.run-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="!selectedBrandUuid || !industry || !location"
          @click="runIntelligence"
        >
          <Brain class="h-3.5 w-3.5" /> {{ t('market.runIntelligence') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('market.analyzing') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('market.analyzingDesc') }}</div>
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1">
          <div class="text-sm font-medium text-destructive">{{ error }}</div>
        </div>
        <button data-loc="market.intel.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runIntelligence">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="result && !loading" class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4 text-success" />
            <span class="text-xs text-muted-foreground">{{ t('market.completed') }}</span>
          </div>
          <button data-loc="market.intel.re-run-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="result = null">
            <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1.5 overflow-x-auto pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            :class="[
              'h-8 px-3 rounded-lg text-xs font-medium border transition whitespace-nowrap flex items-center gap-1.5',
              activeTab === tab.key
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-border/40 bg-overlay-subtle text-muted-foreground hover:text-foreground',
            ]"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="h-3 w-3" />
            {{ tab.label }}
            <span v-if="tab.count" class="text-[10px] opacity-60">({{ tab.count }})</span>
          </button>
        </div>

        <!-- Summary Tab -->
        <div v-if="activeTab === 'summary'" class="space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3 text-center space-y-1">
              <div class="flex justify-center"><TrendingUp class="h-4 w-4 text-info" /></div>
              <div class="text-xl font-bold text-info">{{ payload.content_opportunities?.total_topics_found ?? 0 }}</div>
              <div class="text-[10px] text-muted-foreground">{{ t('intelSummary.opportunities') }}</div>
            </div>
            <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3 text-center space-y-1">
              <div class="flex justify-center"><Layers class="h-4 w-4 text-amber-400" /></div>
              <div class="text-xl font-bold text-amber-400">{{ payload.content_gaps?.total_gaps_found ?? 0 }}</div>
              <div class="text-[10px] text-muted-foreground">{{ t('intelSummary.gaps') }}</div>
            </div>
            <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3 text-center space-y-1">
              <div class="flex justify-center"><Lightbulb class="h-4 w-4 text-primary" /></div>
              <div class="text-xl font-bold text-primary">{{ payload.content_matrix?.total_content_ideas ?? 0 }}</div>
              <div class="text-[10px] text-muted-foreground">{{ t('intelSummary.contentIdeas') }}</div>
            </div>
            <div class="rounded-lg border border-border/30 bg-overlay-subtle p-3 text-center space-y-1">
              <div class="flex justify-center"><BarChart3 class="h-4 w-4 text-success" /></div>
              <div class="text-xl font-bold text-success">{{ payload.top_performers?.top_performers?.length ?? 0 }}</div>
              <div class="text-[10px] text-muted-foreground">{{ t('intelSummary.topAnalyzed') }}</div>
            </div>
          </div>

          <!-- Quick overview cards -->
          <div v-if="payload.content_opportunities?.top_competing_domains?.length" class="surface-card p-4 space-y-2.5">
            <div class="text-xs font-semibold">{{ t('intel.quickDomains') }}</div>
            <div class="flex flex-wrap gap-2">
              <div
                v-for="d in payload.content_opportunities.top_competing_domains.slice(0, 6)"
                :key="d.domain"
                class="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-border/30 bg-overlay-subtle"
              >
                <span class="font-medium text-foreground">{{ d.domain }}</span>
                <span class="text-muted-foreground">({{ d.content_count }})</span>
              </div>
            </div>
          </div>

          <div v-if="payload.content_matrix?.priority_recommendation" class="surface-card p-3.5 flex items-start gap-2.5">
            <Lightbulb class="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div class="text-xs text-muted-foreground leading-relaxed">{{ payload.content_matrix.priority_recommendation }}</div>
          </div>

          <div v-if="payload.content_gaps?.recommendation" class="surface-card p-3.5 flex items-start gap-2.5">
            <Target class="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div class="text-xs text-muted-foreground leading-relaxed">{{ payload.content_gaps.recommendation }}</div>
          </div>
        </div>

        <!-- Opportunities Tab -->
        <ContentOpportunitiesRenderer v-if="activeTab === 'opportunities'" :data="(payload.content_opportunities ?? {}) as any" />

        <!-- Content Gaps Tab -->
        <ContentGapsRenderer v-if="activeTab === 'gaps'" :data="(payload.content_gaps ?? {}) as any" />

        <!-- Content Matrix Tab -->
        <ContentMatrixRenderer v-if="activeTab === 'matrix'" :data="(payload.content_matrix ?? {}) as any" />

        <!-- Top Performers Tab -->
        <TopPerformingContentRenderer v-if="activeTab === 'top'" :data="(payload.top_performers ?? {}) as any" />
      </div>
    </div>
  </main>
</template>
