<script setup lang="ts">
import { ref } from 'vue'
import { Brain, Loader2, AlertCircle, MapPin, ShoppingBag, RefreshCw, Check } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AnalysisPayloadRenderer from '@/shared/components/AnalysisPayloadRenderer.vue'
import IntelligenceSummaryRenderer from '@/shared/components/renderers/IntelligenceSummaryRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import { useRunContentIntelligence } from '../queries'
import type { ContentIntelligenceRun } from '../types'

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

const resultPayload = ref<Record<string, unknown>>({})

async function runIntelligence() {
  loading.value = true
  error.value = null
  result.value = null
  try {
    const res = await runMutation.mutateAsync({
      brand_uuid: selectedBrandUuid.value,
      industry: industry.value,
      location: location.value,
      brand_services: brandServices.value ? brandServices.value.split(',').map(s => s.trim()) : undefined,
      content_goal: contentGoal.value,
    })
    result.value = res.data
    resultPayload.value = res.data.result_payload ?? {}
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
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
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
        <div v-if="brands && brands.length > 1">
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.selectBrand') }}</label>
          <div class="grid sm:grid-cols-2 gap-2">
            <button
              v-for="brand in brands"
              :key="brand.brand_uuid"
              :class="[
                'flex items-center gap-2 h-10 px-3 rounded-lg border transition text-start text-sm',
                selectedBrandUuid === brand.brand_uuid
                  ? 'border-primary ring-1 ring-primary/40 bg-primary/5'
                  : 'bg-white/[0.03] border-border/60 hover:border-primary/40',
              ]"
              @click="selectedBrandUuid = brand.brand_uuid"
            >
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span class="truncate">{{ brand.company_name }}</span>
            </button>
          </div>
          <p v-if="!brands?.length" class="text-xs text-muted-foreground mt-2">{{ t('market.noBrands') }}</p>
        </div>

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="industry" :placeholder="t('market.industryHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.location') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
              <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="location" :placeholder="t('market.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.brandServices') }}</label>
          <input v-model="brandServices" :placeholder="t('market.brandServicesHint')" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.contentGoal') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="goal in contentGoals"
              :key="goal.value"
              :class="[
                'h-8 px-3 rounded-lg text-xs font-medium border transition',
                contentGoal === goal.value
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground border-transparent'
                  : 'bg-white/[0.03] border-border/60 text-muted-foreground hover:text-foreground',
              ]"
              @click="contentGoal = goal.value"
            >
              {{ goal.label }}
            </button>
          </div>
        </div>

        <button
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
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runIntelligence">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="result && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Check class="h-4 w-4 text-success" />
            <span class="text-xs text-muted-foreground">{{ t('market.completed') }}</span>
          </div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="result = null">
            <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
          </button>
        </div>

        <div class="surface-card p-5 mb-4">
          <div class="text-xs font-semibold mb-3">{{ t('market.summary') }}</div>
          <IntelligenceSummaryRenderer :data="result.summary ?? {}" />
        </div>

        <div class="surface-card p-5">
          <div class="text-xs font-semibold mb-3">{{ t('market.fullResults') }}</div>
          <AnalysisPayloadRenderer :data="resultPayload" />
        </div>
      </div>
    </div>
  </main>
</template>
