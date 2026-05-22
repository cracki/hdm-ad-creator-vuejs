<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ChevronLeft, AlertCircle, Library, Download,
  Globe, Clock, Hash, Users, Copy, Check,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useToast } from '@/shared/composables/useToast'
import { exportCsv } from '@/shared/utils/csv'
import { useAdLibraryRun, useAdLibraryRunAds } from '../queries'
import AdLibraryAdCard from '../components/AdLibraryAdCard.vue'
import AdLibraryDetailModal from '../components/AdLibraryDetailModal.vue'
import type { AdLibraryAd } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const toast = useToast()

const runUuid = computed(() => route.params.runUuid as string)
const { data: run, isLoading: runLoading, error: runError } = useAdLibraryRun(runUuid)
const { data: ads, isLoading: adsLoading } = useAdLibraryRunAds(runUuid)

const isLoading = computed(() => runLoading.value || adsLoading.value)

const viewMode = ref<'cards' | 'table'>('cards')
const selectedAd = ref<AdLibraryAd | null>(null)
const showDetailModal = ref(false)
const copiedTableRow = ref<string | null>(null)

const { setActions } = usePageActions()
setActions([{ label: t('adlib.backToLibrary'), icon: ChevronLeft, to: '/ad-library' }])

const statusClass = computed(() => {
  const s = run.value?.status
  if (s === 'completed') return 'bg-success/10 text-success'
  if (s === 'failed') return 'bg-destructive/10 text-destructive'
  if (s === 'running') return 'bg-info/10 text-info'
  return 'bg-overlay-subtle text-muted-foreground'
})

const duration = computed(() => {
  if (!run.value?.started_at || !run.value?.completed_at) return null
  const ms = new Date(run.value.completed_at).getTime() - new Date(run.value.started_at).getTime()
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  return `${minutes}m ${rem}s`
})

const resultSummary = computed(() => {
  const rs = run.value?.result_summary as Record<string, unknown> | undefined
  if (!rs) return null
  return rs
})

const platforms = computed(() => {
  const p = resultSummary.value?.platforms
  return Array.isArray(p) ? p.map(String) : []
})

const anglesUsed = computed(() => {
  const a = resultSummary.value?.angles_used
  return Array.isArray(a) ? a.map(String) : []
})

const funnelStages = computed(() => {
  const f = resultSummary.value?.funnel_stages
  return Array.isArray(f) ? f.map(String) : []
})

const personasCount = computed(() => {
  const c = resultSummary.value?.personas_count
  return typeof c === 'number' ? c : 0
})

const totalAds = computed(() => {
  const t = resultSummary.value?.total_ads
  return typeof t === 'number' ? t : 0
})

const inputSnapshot = computed(() => {
  const snap = run.value?.input_snapshot as Record<string, unknown> | undefined
  return snap
})

const brandProfile = computed(() => {
  const bp = inputSnapshot.value?.brand_profile
  if (!bp || typeof bp !== 'object') return null
  return bp as Record<string, unknown>
})

const industry = computed(() => {
  const brand = run.value?.brand as Record<string, unknown> | null
  const sel = brand?.selected_industry
  if (sel && typeof sel === 'object' && 'name' in sel) return (sel as { name: string }).name
  return brandProfile.value?.industry ? String(brandProfile.value.industry) : ''
})

const requestPayload = computed(() => {
  return run.value?.request_payload as Record<string, unknown> | undefined
})

const requestPersonas = computed(() => {
  const p = requestPayload.value?.personas
  return Array.isArray(p) ? p : []
})

function openDetail(ad: AdLibraryAd) {
  selectedAd.value = ad
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedAd.value = null
}

function exportRunCSV() {
  if (!ads.value?.length) return
  const data = ads.value.map(ad => {
    const d = ad.data as Record<string, unknown>
    const vd = d.visual_direction as Record<string, unknown> | undefined
    const m = d.motivations_targeted
    const p = d.pain_points_addressed
    return {
      platform: ad.platform ?? '',
      funnel_stage: ad.funnel_stage ?? '',
      angle: ad.angle_name ?? '',
      persona: ad.persona ?? '',
      headline: String(d.headline ?? ''),
      primary_text: String(d.primary_text ?? ''),
      description: String(d.description ?? ''),
      cta: String(d.cta ?? ''),
      emotional_appeal: String(d.emotional_appeal ?? ''),
      value_proposition: String(d.value_proposition ?? ''),
      visual_mood: vd ? String(vd.mood ?? '') : '',
      visual_style: vd ? String(vd.style ?? '') : '',
      visual_subject: vd ? String(vd.subject ?? '') : '',
      color_palette: vd ? String(vd.color_palette ?? '') : '',
      motivations: Array.isArray(m) ? m.join('; ') : '',
      pain_points: Array.isArray(p) ? p.join('; ') : '',
    }
  })

  exportCsv(data, `ad-library-run-${Date.now()}`, [
    { key: 'platform', header: 'Platform' },
    { key: 'funnel_stage', header: 'Funnel Stage' },
    { key: 'angle', header: 'Angle' },
    { key: 'persona', header: 'Persona' },
    { key: 'headline', header: 'Headline' },
    { key: 'primary_text', header: 'Primary Text' },
    { key: 'description', header: 'Description' },
    { key: 'cta', header: 'CTA' },
    { key: 'emotional_appeal', header: 'Emotional Appeal' },
    { key: 'value_proposition', header: 'Value Proposition' },
    { key: 'visual_mood', header: 'Visual Mood' },
    { key: 'visual_style', header: 'Visual Style' },
    { key: 'visual_subject', header: 'Visual Subject' },
    { key: 'color_palette', header: 'Color Palette' },
    { key: 'motivations', header: 'Motivations' },
    { key: 'pain_points', header: 'Pain Points' },
  ])
}

async function copyTableField(text: string, id: string) {
  await navigator.clipboard.writeText(text)
  copiedTableRow.value = id
  toast.success(t('common.copied'))
  setTimeout(() => { copiedTableRow.value = null }, 1500)
}

function getAdField(ad: AdLibraryAd, field: string): string {
  const d = ad.data as Record<string, unknown>
  return String(d[field] ?? '')
}
</script>

<template>
  <Topbar :title="t('adlib.runDetail')" :subtitle="run?.brand?.company_name ?? t('adlib.standalone')">
    <template #actions>
      <button
        v-if="ads?.length"
        data-loc="adlib.detail.export-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium flex items-center gap-1.5 hover:bg-overlay-subtle transition"
        @click="exportRunCSV"
      >
        <Download class="h-3.5 w-3.5" /> {{ t('adlib.exportCSV') }}
      </button>
      <button
        data-loc="adlib.detail.back-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
        @click="router.push('/ad-library')"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('adlib.backToLibrary') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      <div v-if="isLoading" class="py-12">
        <AiLoadingAnimation :message="t('adlib.runDetail')" size="sm" />
      </div>

      <div v-else-if="runError" class="surface-card p-5 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="text-sm text-destructive">{{ t('adlib.runLoadError') }}</div>
      </div>

      <template v-else-if="run">
        <!-- Run Info -->
        <div class="surface-card p-5">
          <div class="flex items-start gap-4 mb-5">
            <div class="h-11 w-11 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
              <Library class="h-5 w-5 text-primary-foreground" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="text-lg font-semibold tracking-tight">{{ run.brand?.company_name ?? t('adlib.standalone') }}</h2>
                <span :class="['text-[11px] font-medium px-2 py-0.5 rounded-md', statusClass]">{{ run.status }}</span>
                <span class="text-[11px] px-2 py-0.5 rounded-md bg-overlay-subtle text-muted-foreground">{{ run.run_type }}</span>
              </div>
              <div v-if="industry" class="text-xs text-muted-foreground mt-1">{{ industry }}</div>
            </div>
          </div>

          <!-- Error message -->
          <div v-if="run.error_message" class="p-3 rounded-lg bg-destructive/10 text-xs text-destructive mb-4">
            {{ run.error_message }}
          </div>

          <!-- Info grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div v-if="run.brand?.website_url" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <div class="flex items-center gap-1.5 mb-1">
                <Globe class="h-3 w-3 text-muted-foreground" />
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ t('adlib.website') }}</span>
              </div>
              <a :href="run.brand.website_url" target="_blank" rel="noopener" class="text-xs text-primary hover:underline truncate block">{{ run.brand.website_url }}</a>
            </div>

            <div v-if="run.run_type" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.runType') }}</span>
              <span class="text-xs font-medium">{{ run.run_type }}</span>
            </div>

            <div v-if="run.created_at" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <div class="flex items-center gap-1.5 mb-1">
                <Clock class="h-3 w-3 text-muted-foreground" />
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ t('adlib.startedAt') }}</span>
              </div>
              <span class="text-xs">{{ new Date(run.started_at ?? run.created_at).toLocaleString() }}</span>
            </div>

            <div v-if="run.completed_at" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.completedAt') }}</span>
              <span class="text-xs">{{ new Date(run.completed_at).toLocaleString() }}</span>
            </div>

            <div v-if="duration" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1">{{ t('adlib.duration') }}</span>
              <span class="text-xs font-medium text-primary">{{ duration }}</span>
            </div>

            <div class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <div class="flex items-center gap-1.5 mb-1">
                <Hash class="h-3 w-3 text-muted-foreground" />
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ t('adlib.totalAds') }}</span>
              </div>
              <span class="text-sm font-bold">{{ totalAds }}</span>
            </div>

            <div v-if="personasCount" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <div class="flex items-center gap-1.5 mb-1">
                <Users class="h-3 w-3 text-muted-foreground" />
                <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{{ t('adlib.personasCount') }}</span>
              </div>
              <span class="text-xs font-medium">{{ personasCount }}</span>
            </div>

            <div v-if="platforms.length" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{{ t('adlib.platforms') }}</span>
              <div class="flex flex-wrap gap-1">
                <span v-for="p in platforms" :key="p" class="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">{{ p }}</span>
              </div>
            </div>

            <div v-if="anglesUsed.length" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{{ t('adlib.anglesUsed') }}</span>
              <div class="flex flex-wrap gap-1">
                <span v-for="a in anglesUsed" :key="a" class="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-magenta/10 text-accent-magenta">{{ a }}</span>
              </div>
            </div>

            <div v-if="funnelStages.length" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
              <span class="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">{{ t('adlib.funnelUsed') }}</span>
              <div class="flex flex-wrap gap-1">
                <span v-for="f in funnelStages" :key="f" class="text-[10px] px-1.5 py-0.5 rounded-full bg-info/10 text-info">{{ f }}</span>
              </div>
            </div>
          </div>

          <!-- Request payload summary -->
          <details v-if="requestPersonas.length || requestPayload" class="mt-4">
            <summary class="text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition">
              {{ t('adlib.requestConfig') }}
            </summary>
            <div class="mt-3 pt-3 border-t border-border/30 space-y-2">
              <div v-if="requestPersonas.length" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div v-for="(p, idx) in requestPersonas" :key="idx" class="p-2.5 rounded-lg bg-overlay-subtle border border-border/30">
                  <div class="text-xs font-medium">{{ (p as Record<string, unknown>).name }}</div>
                  <div v-if="(p as Record<string, unknown>).demographics" class="text-[11px] text-muted-foreground mt-0.5">{{ (p as Record<string, unknown>).demographics }}</div>
                </div>
              </div>
              <div class="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                <span v-if="requestPayload?.ads_per_combination">{{ t('adlib.adsPerCombo') }}: {{ requestPayload.ads_per_combination }}</span>
              </div>
            </div>
          </details>
        </div>

        <!-- Ads section -->
        <div v-if="ads?.length">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold">{{ t('adlib.generatedAds') }} ({{ ads.length }})</h3>
            <div class="flex items-center gap-2">
              <button
                class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
                @click="exportRunCSV"
              >
                <Download class="h-3 w-3" /> {{ t('adlib.exportCSV') }}
              </button>
              <div class="flex gap-1 bg-overlay-subtle rounded-lg p-0.5">
                <button
                  data-loc="adlib.detail.view-cards"
                  @click="viewMode = 'cards'"
                  :class="['min-h-[36px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'cards' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
                >{{ t('adlib.cards') }}</button>
                <button
                  data-loc="adlib.detail.view-table"
                  @click="viewMode = 'table'"
                  :class="['min-h-[36px] px-2.5 py-1 rounded text-xs font-medium transition', viewMode === 'table' ? 'bg-overlay-medium text-foreground' : 'text-muted-foreground']"
                >{{ t('adlib.table') }}</button>
              </div>
            </div>
          </div>

          <!-- Cards view -->
          <div v-if="viewMode === 'cards'" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AdLibraryAdCard
              v-for="ad in ads"
              :key="ad.ad_library_ad_uuid"
              data-loc="adlib.detail.ad-card"
              :ad="ad"
              @view-details="openDetail"
            />
          </div>

          <!-- Table view -->
          <div v-else class="surface-card overflow-hidden">
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead class="border-b border-border/60 bg-overlay-subtle">
                  <tr>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.platforms') }}</th>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.funnelStages') }}</th>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.creativeAngles') }}</th>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.personasCount') }}</th>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.headline') }}</th>
                    <th class="px-3 py-2 text-start font-semibold text-muted-foreground">{{ t('adlib.cta') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-border/40">
                  <tr v-for="ad in ads" :key="ad.ad_library_ad_uuid" class="hover:bg-overlay-subtle group cursor-pointer" @click="openDetail(ad)">
                    <td class="px-3 py-2">
                      <span v-if="ad.platform" class="text-[11px] px-2 py-0.5 rounded-full bg-primary/15 text-primary">{{ ad.platform }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <span v-if="ad.funnel_stage" class="text-[11px] px-2 py-0.5 rounded-full bg-info/10 text-info">{{ ad.funnel_stage }}</span>
                    </td>
                    <td class="px-3 py-2">
                      <span v-if="ad.angle_name" class="text-[11px] px-2 py-0.5 rounded-full bg-accent-magenta/15 text-accent-magenta">{{ ad.angle_name }}</span>
                    </td>
                    <td class="px-3 py-2 text-muted-foreground">{{ ad.persona ?? '' }}</td>
                    <td class="px-3 py-2 max-w-[200px]">
                      <div class="flex items-center gap-1">
                        <span class="truncate">{{ getAdField(ad, 'headline') }}</span>
                        <button
                          v-if="getAdField(ad, 'headline')"
                          class="shrink-0 h-5 w-5 grid place-items-center rounded hover:bg-overlay-medium opacity-0 group-hover:opacity-100 transition"
                          @click.stop="copyTableField(getAdField(ad, 'headline'), `h-${ad.ad_library_ad_uuid}`)"
                        >
                          <Check v-if="copiedTableRow === `h-${ad.ad_library_ad_uuid}`" class="h-2.5 w-2.5 text-success" />
                          <Copy v-else class="h-2.5 w-2.5 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                    <td class="px-3 py-2">
                      <span class="text-primary font-medium">{{ getAdField(ad, 'cta') }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div v-else-if="!adsLoading" class="surface-card p-6 text-center">
          <Library class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div class="text-sm text-muted-foreground">{{ t('adlib.noAds') }}</div>
        </div>
      </template>
    </div>
  </main>

  <!-- Detail Modal -->
  <AdLibraryDetailModal
    v-if="showDetailModal && selectedAd"
    data-loc="adlib.detail.modal"
    :ad="selectedAd"
    @close="closeDetail"
  />
</template>
