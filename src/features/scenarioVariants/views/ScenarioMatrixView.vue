<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Grid3X3, Loader2, AlertCircle, RefreshCw,
  ArrowLeft, Download, Copy, Eye, Check,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useToast } from '@/shared/composables/useToast'
import { useCampaign } from '@/features/campaigns/queries'
import { useJobTracker } from '@/shared/composables/useJobTracker'
import { scenarioVariantsApi } from '../api'
import { parseScenarioVariants } from '../schemas'
import ScenarioVariantCard from '../components/ScenarioVariantCard.vue'
import VariantDetailModal from '../components/VariantDetailModal.vue'
import type { ScenarioVariantRun } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const runUuidParam = computed(() => (route.params.runUuid as string) ?? '')

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])
const { data: campaign } = useCampaign(campaignUuid)

const viewMode = ref<'cards' | 'table'>('cards')
const variants = ref<any[]>([])
const selectedVariant = ref<any>(null)
const showDetailModal = ref(false)
const copiedTableRow = ref<string | null>(null)

const {
  data: runData,
  status: jobStatus,
  error: jobError,
  start: startJob,
  resume: resumeJob,
} = useJobTracker<ScenarioVariantRun>({
  startFn: async () => {
    const { data } = await scenarioVariantsApi.startCampaignMatrix(campaignUuid.value, {
      scenario: 'promotional',
    })
    return data
  },
  statusFn: async (uuid: string) => {
    const { data } = await scenarioVariantsApi.getMatrixRunState(campaignUuid.value, uuid)
    return data
  },
  getStatus: (d) => d.status,
  getUuid: (d) => d.scenario_variant_run_uuid,
  isTerminal: (s) => s === 'completed' || s === 'failed',
})

async function fetchVariants(uuid: string) {
  const { data } = await scenarioVariantsApi.getMatrixRunVariants(campaignUuid.value, uuid)
  variants.value = parseScenarioVariants(data)
}

const isRunning = computed(() => jobStatus.value === 'starting' || jobStatus.value === 'polling')

onMounted(async () => {
  if (runUuidParam.value) {
    await resumeJob(runUuidParam.value)
    if (runData.value?.status === 'completed') {
      await fetchVariants(runUuidParam.value)
    }
  }
})

async function generate() {
  await startJob()
  if (runData.value?.status === 'completed' && runData.value?.scenario_variant_run_uuid) {
    router.replace(`/campaigns/${campaignUuid.value}/scenario-matrix/${runData.value.scenario_variant_run_uuid}`)
    await fetchVariants(runData.value.scenario_variant_run_uuid)
  }
}

function openDetail(variant: any) {
  selectedVariant.value = variant
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedVariant.value = null
}

function exportCSV() {
  if (variants.value.length === 0) return
  const headers = ['Type', 'Audience', 'Style', 'Format', 'Platform', 'Framework', 'Headline', 'Primary Text', 'CTA', 'Visual Prompt']
  const rows = variants.value.map((v) => {
    const d = v.data as any
    const adCopy = d?.ad_copy ?? {}
    return [
      v.variant_type,
      v.audience ?? d?.audience ?? '',
      v.style ?? d?.style ?? d?.creative_style ?? '',
      v.ad_format ?? d?.format ?? d?.ad_format ?? '',
      v.platform ?? '',
      v.framework_name ?? '',
      adCopy.headline ?? d?.headline ?? '',
      adCopy.body ?? adCopy.primary_text ?? d?.primary_text ?? d?.body ?? '',
      adCopy.cta ?? d?.cta ?? '',
      d?.image_prompt ?? d?.visual_prompt ?? '',
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
  })
  const csvContent = headers.join(',') + '\n' + rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `scenario-matrix-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function copyTableField(text: string, id: string) {
  await navigator.clipboard.writeText(text)
  copiedTableRow.value = id
  toast.success(t('variant.copySuccess'))
  setTimeout(() => { copiedTableRow.value = null }, 1500)
}

function getAdCopy(v: any) {
  const d = v?.data ?? {}
  if (d.ad_copy && typeof d.ad_copy === 'object') return d.ad_copy
  return { headline: d.headline, body: d.body ?? d.primary_text, cta: d.cta }
}
</script>

<template>
  <Topbar :title="campaign?.name ?? ''" :subtitle="t('variant.matrixTitle')">
    <template #actions>
      <button
        data-loc="variant.matrix.back-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="router.push(`/campaigns/${campaignUuid}`)"
      >
        <ArrowLeft class="h-3.5 w-3.5" /> {{ t('camp.backToCampaign') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">

      <!-- Header -->
      <header class="flex items-start gap-4">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Grid3X3 class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('variant.matrixTitle') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('variant.matrixDesc') }}</p>
        </div>
      </header>

      <!-- Start Button -->
      <div v-if="jobStatus === 'idle' && !runData" class="surface-card p-8 text-center">
        <Grid3X3 class="h-8 w-8 text-primary mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('variant.matrixReady') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('variant.matrixReadyDesc') }}</div>
        <button
          data-loc="variant.matrix.start-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto"
          @click="generate"
        >
          <Grid3X3 class="h-3.5 w-3.5" /> {{ t('variant.startMatrix') }}
        </button>
      </div>

      <!-- Loading / Polling -->
      <div v-if="isRunning" class="surface-card p-8 text-center">
        <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <div class="text-sm font-medium mb-1">{{ t('variant.matrixRunning') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('variant.matrixRunningDesc') }}</div>
      </div>

      <!-- Error -->
      <div v-if="jobError || (jobStatus === 'idle' && runData?.status === 'failed')" class="surface-card p-5 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ jobError ?? runData?.error_message ?? t('variant.matrixFailed') }}</div>
        <button data-loc="variant.matrix.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generate">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="variants.length > 0">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold">{{ variants.length }} {{ t('variant.totalVariants') }}</h3>
          <div class="flex items-center gap-2">
            <button
              data-loc="variant.matrix.export-btn"
              class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
              @click="exportCSV"
            >
              <Download class="h-3 w-3" /> {{ t('variant.exportCSV') }}
            </button>
            <button
              data-loc="variant.matrix.re-run-btn"
              class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
              @click="generate"
            >
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
            <div class="flex gap-1 bg-overlay-subtle rounded-lg p-0.5">
              <button
                data-loc="variant.matrix.view-cards"
                @click="viewMode = 'cards'"
                :class="['min-h-[44px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'cards' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
              >{{ t('variant.cards') }}</button>
              <button
                data-loc="variant.matrix.view-table"
                @click="viewMode = 'table'"
                :class="['min-h-[44px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'table' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
              >{{ t('variant.table') }}</button>
            </div>
          </div>
        </div>

        <!-- Cards View -->
        <div v-if="viewMode === 'cards'" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <ScenarioVariantCard
            v-for="(v, idx) in variants"
            :key="idx"
            data-loc="variant.matrix.variant-card"
            :variant="v"
            @view-details="openDetail"
          />
        </div>

        <!-- Table View -->
        <div v-else class="surface-card overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-xs">
              <thead class="border-b border-border/60 bg-overlay-subtle">
                <tr>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.type') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.audience') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.style') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.format') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.headline') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.adCopy') }}</th>
                  <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('variant.cta') }}</th>
                  <th class="px-3 py-2 text-center font-semibold text-muted-foreground w-28">{{ t('variant.viewDetails') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border/40">
                <tr v-for="(v, idx) in variants" :key="idx" class="hover:bg-overlay-subtle group">
                  <td class="px-3 py-2">
                    <span v-if="v.variant_type === 'meta_creative'" class="text-accent-cyan">{{ t('variant.meta') }}</span>
                    <span v-else>{{ t('variant.regular') }}</span>
                  </td>
                  <td class="px-3 py-2">{{ v.audience }}</td>
                  <td class="px-3 py-2">{{ v.style }}</td>
                  <td class="px-3 py-2">{{ v.ad_format }}</td>
                  <td class="px-3 py-2 max-w-[200px]">
                    <div class="flex items-center gap-1">
                      <span class="truncate">{{ getAdCopy(v).headline ?? '' }}</span>
                      <button
                        v-if="getAdCopy(v).headline"
                        data-loc="variant.matrix.copy-headline-btn"
                        class="shrink-0 h-5 w-5 grid place-items-center rounded hover:bg-overlay-medium opacity-0 group-hover:opacity-100 transition"
                        @click="copyTableField(getAdCopy(v).headline, `h-${idx}`)"
                      >
                        <Check v-if="copiedTableRow === `h-${idx}`" class="h-2.5 w-2.5 text-success" />
                        <Copy v-else class="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                  <td class="px-3 py-2 max-w-[200px]">
                    <div class="flex items-center gap-1">
                      <span class="truncate text-muted-foreground">{{ getAdCopy(v).body ?? '' }}</span>
                      <button
                        v-if="getAdCopy(v).body"
                        data-loc="variant.matrix.copy-body-btn"
                        class="shrink-0 h-5 w-5 grid place-items-center rounded hover:bg-overlay-medium opacity-0 group-hover:opacity-100 transition"
                        @click="copyTableField(getAdCopy(v).body, `b-${idx}`)"
                      >
                        <Check v-if="copiedTableRow === `b-${idx}`" class="h-2.5 w-2.5 text-success" />
                        <Copy v-else class="h-2.5 w-2.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <span class="text-primary font-medium">{{ getAdCopy(v).cta ?? '' }}</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <button
                      data-loc="variant.matrix.view-details-btn"
                      class="h-6 px-2 rounded text-[11px] inline-flex items-center gap-1 hover:bg-overlay-medium transition text-muted-foreground hover:text-primary"
                      @click="openDetail(v)"
                    >
                      <Eye class="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- Detail Modal -->
  <VariantDetailModal
    v-if="showDetailModal && selectedVariant"
    data-loc="variant.matrix.detail-modal"
    :variant="selectedVariant"
    @close="closeDetail"
  />
</template>
