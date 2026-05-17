<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { usePageActions } from '@/shared/composables/usePageActions'
import AnalysisPayloadRenderer from '@/shared/components/AnalysisPayloadRenderer.vue'
import CompetitiveAnalysisRenderer from '@/shared/components/renderers/CompetitiveAnalysisRenderer.vue'
import {
  useCompetitors,
  useCreateCompetitor,
  useDeleteCompetitor,
  useAnalyzeCompetitor,
  useIdentifyCompetitors,
  useCompetitiveInsights,
} from '../queries'
import {
  Plus, Trash2, Globe, Loader2, Sparkles, ChevronDown,
  CheckCircle2, Crosshair, Lightbulb, Shield, Target, ArrowUpRight,
} from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()
const toast = useToast()

const brandUuid = computed(() => route.params.brandUuid as string)
const { data: competitors, isLoading } = useCompetitors(brandUuid)
const createMutation = useCreateCompetitor(brandUuid)
const deleteMutation = useDeleteCompetitor(brandUuid)
const analyzeMutation = useAnalyzeCompetitor(brandUuid)
const identifyMutation = useIdentifyCompetitors(brandUuid)
const insightsMutation = useCompetitiveInsights(brandUuid)

const showAddForm = ref(false)
const newName = ref('')
const newUrl = ref('')
const newIsDirect = ref(true)
const expandedUuid = ref<string | null>(null)
const showInsights = ref(false)
const analyzingUuid = ref<string | null>(null)

const expandedCompetitor = computed(() =>
  competitors.value?.find((c: any) => c.competitor_uuid === expandedUuid.value) ?? null
)

const lastAnalysis = computed(() => {
  const record = expandedCompetitor.value?.analysis_record
  if (!record?.last_analysis || typeof record.last_analysis !== 'object') return null
  return record.last_analysis
})

async function handleAdd() {
  if (!newName.value.trim() || !newUrl.value.trim()) return
  await createMutation.mutateAsync({
    name: newName.value.trim(),
    website_url: newUrl.value.trim(),
    is_direct: newIsDirect.value,
  })
  newName.value = ''
  newUrl.value = ''
  newIsDirect.value = true
  showAddForm.value = false
}

async function handleDelete(uuid: string) {
  if (!confirm(t('competitors.confirmDelete'))) return
  await deleteMutation.mutateAsync(uuid)
  if (expandedUuid.value === uuid) expandedUuid.value = null
}

async function handleAnalyze(uuid: string) {
  analyzingUuid.value = uuid
  try {
    await analyzeMutation.mutateAsync(uuid)
  } catch (err: any) {
    const msg = err?.code === 'ECONNABORTED' ? t('errors.timeout') : (err?.response?.data?.detail ?? err?.message ?? t('errors.generic'))
    toast.error(msg)
  } finally {
    analyzingUuid.value = null
  }
}

async function handleIdentify() {
  await identifyMutation.mutateAsync()
}

async function handleInsights() {
  showInsights.value = true
  await insightsMutation.mutateAsync()
}

function toggleExpand(uuid: string) {
  expandedUuid.value = expandedUuid.value === uuid ? null : uuid
}

const stats = computed(() => {
  const list = competitors.value ?? []
  const direct = list.filter((c: any) => c.is_direct).length
  const analyzed = list.filter((c: any) => c.analysis_record?.last_analysis).length
  return { total: list.length, direct, indirect: list.length - direct, analyzed }
})

const { setActions } = usePageActions()
setActions([
  { label: t('competitors.autoDiscover'), icon: Crosshair, handler: handleIdentify, disabled: identifyMutation.isPending.value },
  { label: t('competitors.insights'), icon: Lightbulb, handler: handleInsights, disabled: insightsMutation.isPending.value },
  { label: t('competitors.add'), icon: Plus, handler: () => { showAddForm.value = true } },
])
</script>

<template>
  <Topbar
    :title="t('competitors.title')"
    :subtitle="t('competitors.subtitle')"
  >
    <template #actions>
      <button
        data-loc="competitors.manage.auto-discover-btn"
        @click="handleIdentify"
        :disabled="identifyMutation.isPending.value"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition disabled:opacity-50"
      >
        <Crosshair v-if="!identifyMutation.isPending.value" class="h-3.5 w-3.5" />
        <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
        {{ t('competitors.autoDiscover') }}
      </button>
      <button
        data-loc="competitors.manage.insights-btn"
        @click="handleInsights"
        :disabled="insightsMutation.isPending.value"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition disabled:opacity-50"
      >
        <Lightbulb v-if="!insightsMutation.isPending.value" class="h-3.5 w-3.5" />
        <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
        {{ t('competitors.insights') }}
      </button>
      <button
        data-loc="competitors.manage.add-btn"
        @click="showAddForm = !showAddForm"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition"
      >
        <Plus class="h-3.5 w-3.5" /> {{ t('competitors.add') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
    <!-- Add form -->
    <div v-if="showAddForm" class="surface-card p-5 space-y-4">
      <div class="font-semibold text-sm">{{ t('competitors.addTitle') }}</div>
      <div class="grid sm:grid-cols-2 gap-3">
        <input
          v-model="newName"
          data-loc="competitors.manage.name-input"
          :placeholder="t('competitors.namePlaceholder')"
          class="h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none focus:border-primary/60 transition"
        />
        <input
          v-model="newUrl"
          data-loc="competitors.manage.url-input"
          :placeholder="t('competitors.urlPlaceholder')"
          class="h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none focus:border-primary/60 transition"
        />
      </div>
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input v-model="newIsDirect" data-loc="competitors.manage.direct-checkbox" type="checkbox" class="rounded border-border/60" />
          {{ t('competitors.directCompetitor') }}
        </label>
      </div>
      <div class="flex gap-2">
        <button
          data-loc="competitors.manage.create-btn"
          @click="handleAdd"
          :disabled="createMutation.isPending.value || !newName.trim() || !newUrl.trim()"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-50"
        >
          <Loader2 v-if="createMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          {{ t('competitors.create') }}
        </button>
        <button
          data-loc="competitors.manage.cancel-btn"
          @click="showAddForm = false"
          class="inline-flex items-center h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition"
        >
          {{ t('competitors.cancel') }}
        </button>
      </div>
    </div>

    <!-- Insights panel -->
    <div v-if="showInsights && insightsMutation.data.value" data-loc="competitors.manage.insights-panel" class="surface-card p-5 space-y-3">
      <div class="flex items-center justify-between">
        <div class="font-semibold text-sm flex items-center gap-2">
          <Lightbulb class="h-4 w-4 text-amber-400" />
          {{ t('competitors.insightsTitle') }}
        </div>
        <button @click="showInsights = false" class="text-xs text-muted-foreground hover:text-foreground">&times;</button>
      </div>
      <AnalysisPayloadRenderer :data="(insightsMutation.data.value as any)" />
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="surface-card p-5 shimmer h-24" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!competitors?.length" class="surface-card p-8 text-center space-y-4">
      <div class="h-14 w-14 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
        <Crosshair class="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div class="font-semibold mb-1">{{ t('competitors.emptyTitle') }}</div>
        <div class="text-sm text-muted-foreground">{{ t('competitors.emptyDesc') }}</div>
      </div>
      <div class="flex justify-center gap-2">
        <button
          @click="handleIdentify"
          :disabled="identifyMutation.isPending.value"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-50"
        >
          <Crosshair v-if="!identifyMutation.isPending.value" class="h-3.5 w-3.5" />
          <Loader2 v-else class="h-3.5 w-3.5 animate-spin" />
          {{ t('competitors.autoDiscover') }}
        </button>
        <button
          @click="showAddForm = true"
          class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition"
        >
          <Plus class="h-3.5 w-3.5" /> {{ t('competitors.addManual') }}
        </button>
      </div>
    </div>

    <!-- Competitor list -->
    <div v-else>
      <!-- Stats bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div class="surface-card p-3 flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center shrink-0">
            <Globe class="h-4 w-4 text-primary" />
          </div>
          <div>
            <div class="text-lg font-bold leading-none">{{ stats.total }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">Total</div>
          </div>
        </div>
        <div class="surface-card p-3 flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-orange-500/10 grid place-items-center shrink-0">
            <Target class="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <div class="text-lg font-bold leading-none">{{ stats.direct }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">{{ t('competitors.direct') }}</div>
          </div>
        </div>
        <div class="surface-card p-3 flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-blue-500/10 grid place-items-center shrink-0">
            <Shield class="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <div class="text-lg font-bold leading-none">{{ stats.indirect }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">{{ t('competitors.indirect') }}</div>
          </div>
        </div>
        <div class="surface-card p-3 flex items-center gap-3">
          <div class="h-8 w-8 rounded-lg bg-success/10 grid place-items-center shrink-0">
            <CheckCircle2 class="h-4 w-4 text-success" />
          </div>
          <div>
            <div class="text-lg font-bold leading-none">{{ stats.analyzed }}</div>
            <div class="text-[10px] text-muted-foreground mt-0.5">{{ t('competitors.analyzed') }}</div>
          </div>
        </div>
      </div>

      <!-- Competitor cards -->
      <div class="space-y-2">
        <div
          v-for="comp in competitors"
          :key="comp.competitor_uuid"
          data-loc="competitors.manage.list-item"
          class="group surface-card overflow-hidden transition-all duration-200"
          :class="[
            expandedUuid === comp.competitor_uuid ? 'ring-1 ring-primary/30' : '',
          ]"
        >
          <!-- Card header -->
          <div
            class="px-4 py-3.5 flex items-center gap-3 cursor-pointer transition-colors hover:bg-white/[0.015]"
            @click="toggleExpand(comp.competitor_uuid)"
          >
            <!-- Color accent bar -->
            <div :class="['w-1 h-10 rounded-full shrink-0 transition-colors', comp.is_direct ? 'bg-orange-400/60' : 'bg-blue-400/60']" />

            <!-- Icon -->
            <div :class="['h-9 w-9 rounded-lg grid place-items-center shrink-0 transition-colors', comp.is_direct ? 'bg-orange-500/10' : 'bg-blue-500/10']">
              <Globe :class="['h-4 w-4', comp.is_direct ? 'text-orange-300' : 'text-blue-300']" />
            </div>

            <!-- Name + URL -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-sm truncate group-hover:text-foreground transition-colors">{{ comp.name }}</div>
              <div class="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                <a :href="comp.website_url" target="_blank" @click.stop class="hover:text-foreground hover:underline transition-colors inline-flex items-center gap-0.5">
                  {{ comp.website_url.replace(/^https?:\/\//, '') }}
                  <ArrowUpRight class="h-2.5 w-2.5 shrink-0 opacity-40" />
                </a>
              </div>
            </div>

            <!-- Status badges -->
            <div class="hidden sm:flex items-center gap-1.5 shrink-0">
              <span :class="['text-[10px] font-medium px-2 py-0.5 rounded-full', comp.is_direct ? 'bg-orange-500/10 text-orange-300 border border-orange-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20']">
                {{ comp.is_direct ? t('competitors.direct') : t('competitors.indirect') }}
              </span>
              <span v-if="comp.analysis_record?.last_analysis" class="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                <CheckCircle2 class="h-2.5 w-2.5" /> {{ t('competitors.analyzed') }}
              </span>
              <span v-else class="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] text-muted-foreground border border-border/30">
                {{ t('competitors.pending') }}
              </span>
            </div>

            <!-- Expand chevron -->
            <ChevronDown :class="['h-4 w-4 text-muted-foreground/50 transition-transform duration-200 shrink-0', expandedUuid === comp.competitor_uuid ? 'rotate-180 text-primary' : '']" />
          </div>

          <!-- Expanded analysis -->
          <div v-if="expandedUuid === comp.competitor_uuid" class="border-t border-border/30">
            <!-- Mobile-only badges -->
            <div class="sm:hidden flex items-center gap-1.5 px-4 pt-3">
              <span :class="['text-[10px] font-medium px-2 py-0.5 rounded-full', comp.is_direct ? 'bg-orange-500/10 text-orange-300' : 'bg-blue-500/10 text-blue-300']">
                {{ comp.is_direct ? t('competitors.direct') : t('competitors.indirect') }}
              </span>
              <span v-if="comp.analysis_record?.last_analysis" class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success">
                <CheckCircle2 class="h-2.5 w-2.5" /> {{ t('competitors.analyzed') }}
              </span>
            </div>

            <div class="p-4 space-y-4">
              <div v-if="lastAnalysis" class="space-y-3">
                <CompetitiveAnalysisRenderer :data="{ competitor_analyses: [lastAnalysis], analyze_results: [{ name: comp.name, status: 'success', website_url: comp.website_url }] }" />
              </div>
              <div v-else class="text-sm text-muted-foreground text-center py-6">
                {{ t('competitors.noAnalysis') }}
              </div>
              <div class="flex gap-2 pt-1">
                <button
                  data-loc="competitors.manage.analyze-btn"
                  @click="handleAnalyze(comp.competitor_uuid)"
                  :disabled="analyzingUuid !== null"
                  class="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] hover:opacity-95 transition disabled:opacity-50"
                >
                  <Loader2 v-if="analyzingUuid === comp.competitor_uuid" class="h-3 w-3 animate-spin" />
                  <Sparkles v-else class="h-3 w-3" />
                  {{ analyzingUuid === comp.competitor_uuid ? t('competitors.analyzing') : (lastAnalysis ? t('competitors.reAnalyze') : t('competitors.analyze')) }}
                </button>
                <button
                  data-loc="competitors.manage.delete-btn"
                  @click="handleDelete(comp.competitor_uuid)"
                  :disabled="deleteMutation.isPending.value"
                  class="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition disabled:opacity-50"
                >
                  <Trash2 class="h-3 w-3" /> {{ t('competitors.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
