<script setup lang="ts">
import { ref } from 'vue'
import { Grid3X3, Loader2, AlertCircle, RefreshCw, MapPin, ShoppingBag, Users, Download, FileText, LayoutGrid, BarChart3 } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import ContentMatrixRenderer from '@/shared/components/renderers/ContentMatrixRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useGetContentMatrix } from '../queries'
import { exportContentMatrixPDF, exportContentMatrixPPTX, exportContentMatrixXLSX } from '@/shared/utils/exportMarket'
import type { ContentMatrixResponse } from '../types'

const { t } = useI18n()
const matrixMutation = useGetContentMatrix()
const confetti = useConfetti()

const industry = ref('')
const location = ref('')
const personas = ref('')

const matrixResult = ref<ContentMatrixResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const showExportMenu = ref(false)
const exporting = ref(false)

async function handleExport(format: 'pdf' | 'pptx' | 'xlsx') {
  showExportMenu.value = false
  if (!matrixResult.value) return
  exporting.value = true
  try {
    if (format === 'pdf') await exportContentMatrixPDF(matrixResult.value)
    else if (format === 'pptx') await exportContentMatrixPPTX(matrixResult.value)
    else await exportContentMatrixXLSX(matrixResult.value)
    confetti.trigger()
  } finally { exporting.value = false }
}

async function runMatrix() {
  if (!industry.value || !location.value) return
  loading.value = true
  error.value = null
  matrixResult.value = null
  try {
    const res = await matrixMutation.mutateAsync({
      industry: industry.value,
      location: location.value,
      target_personas: personas.value ? personas.value.split(',').map(s => s.trim()) : undefined,
    })
    matrixResult.value = res.data as unknown as ContentMatrixResponse
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('market.error')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Topbar :title="t('market.matrixTitle')" :subtitle="t('market.matrixSubtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Grid3X3 class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('market.matrixTitle') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('market.matrixDesc') }}</p>
        </div>
      </header>

      <!-- Input form -->
      <div v-if="!matrixResult && !loading" class="surface-card p-5 space-y-4 mb-6">
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="industry" data-loc="market.matrix.industry-input" :placeholder="t('market.industryHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.location') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="location" data-loc="market.matrix.location-input" :placeholder="t('market.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
            </div>
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.targetPersonas') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
            <Users class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="personas" :placeholder="t('market.personasHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>

        <button
          data-loc="market.matrix.run-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="!industry || !location"
          @click="runMatrix"
        >
          <Grid3X3 class="h-3.5 w-3.5" /> {{ t('market.runMatrix') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <AiLoadingAnimation :message="t('market.analyzingMatrix')" :description="t('market.analyzingMatrixDesc')" />
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm font-medium text-destructive">{{ error }}</div>
        <button data-loc="market.matrix.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runMatrix">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="matrixResult && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">{{ t('market.analysisComplete') }}</div>
          <div class="flex items-center gap-2">
            <div class="relative">
              <button :disabled="exporting" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition disabled:opacity-50" @click="showExportMenu = !showExportMenu">
                <Loader2 v-if="exporting" class="h-3 w-3 animate-spin" />
                <Download v-else class="h-3 w-3" />
                {{ exporting ? t('market.exporting') : t('market.export') }}
              </button>
              <div v-if="showExportMenu" class="absolute end-0 top-full mt-1 z-50 min-w-[180px] rounded-lg border border-border/40 bg-popover shadow-lg py-1">
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('pdf')"><FileText class="h-3.5 w-3.5 text-red-400" /> {{ t('market.exportPDF') }}</button>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('pptx')"><LayoutGrid class="h-3.5 w-3.5 text-orange-400" /> {{ t('market.exportPPTX') }}</button>
                <button class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition" @click="handleExport('xlsx')"><BarChart3 class="h-3.5 w-3.5 text-green-400" /> {{ t('market.exportXLSX') }}</button>
              </div>
              <div v-if="showExportMenu" class="fixed inset-0 z-40" @click="showExportMenu = false" />
            </div>
            <button data-loc="market.matrix.re-run-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="matrixResult = null">
              <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
            </button>
          </div>
        </div>

        <div class="surface-card p-5">
          <ContentMatrixRenderer :data="(matrixResult as any)" />
        </div>
      </div>
    </div>
  </main>
</template>
