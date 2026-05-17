<script setup lang="ts">
import { ref } from 'vue'
import { Grid3X3, Loader2, AlertCircle, RefreshCw, MapPin, ShoppingBag, Users } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import ContentMatrixRenderer from '@/shared/components/renderers/ContentMatrixRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useGetContentMatrix } from '../queries'
import type { ContentMatrixResponse } from '../types'

const { t } = useI18n()
const matrixMutation = useGetContentMatrix()

const industry = ref('')
const location = ref('')
const personas = ref('')

const matrixResult = ref<ContentMatrixResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

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
    matrixResult.value = res.data
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
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.targetPersonas') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
            <Users class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="personas" :placeholder="t('market.personasHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>

        <button
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="!industry || !location"
          @click="runMatrix"
        >
          <Grid3X3 class="h-3.5 w-3.5" /> {{ t('market.runMatrix') }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('market.analyzingMatrix') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('market.analyzingMatrixDesc') }}</div>
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm font-medium text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runMatrix">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="matrixResult && !loading">
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">{{ t('market.analysisComplete') }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="matrixResult = null">
            <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
          </button>
        </div>

        <div class="surface-card p-5">
          <ContentMatrixRenderer :data="matrixResult" />
        </div>
      </div>
    </div>
  </main>
</template>
