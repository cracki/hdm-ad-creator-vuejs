<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Sparkles, AlertCircle, RefreshCw, Plus, Trash2,
  Copy, Check, Filter, LayoutGrid, BarChart3, Lightbulb,
  Hash, MessageCircle, Zap, TrendingUp, Target, Flame, ArrowLeftRight,
  Download, FileText, Loader2,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useGenerateAIHooks } from '../queries'
import { exportHooksPDF, exportHooksPPTX, exportHooksXLSX } from '@/shared/utils/exportMarket'
import type { AIHook, AIHookType, AIHookPlatform, AIHooksResponse } from '../types'

const { t } = useI18n()
const hooksMutation = useGenerateAIHooks()
const confetti = useConfetti()

const titles = ref<string[]>([''])
const industry = ref('')
const brandName = ref('')
const hookCount = ref(10)

const hooksResult = ref<AIHooksResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const activeFilter = ref<AIHookType | 'all'>('all')
const activePlatform = ref<AIHookPlatform | 'all'>('all')
const copiedIdx = ref<number | null>(null)
const copiedAll = ref(false)
const showResults = ref(true)
const showInsights = ref(false)
const showExportMenu = ref(false)
const exporting = ref(false)

async function handleExport(format: 'pdf' | 'pptx' | 'xlsx') {
  showExportMenu.value = false
  if (!hooksResult.value) return
  exporting.value = true
  try {
    if (format === 'pdf') await exportHooksPDF(hooksResult.value)
    else if (format === 'pptx') await exportHooksPPTX(hooksResult.value)
    else await exportHooksXLSX(hooksResult.value)
    confetti.trigger()
  } finally { exporting.value = false }
}

const allHookTypes = computed((): AIHookType[] => {
  const types = new Set<AIHookType>()
  hooksResult.value?.hooks?.forEach(h => types.add(h.type))
  return [...types]
})

const allPlatforms = computed((): AIHookPlatform[] => {
  const platforms = new Set<AIHookPlatform>()
  hooksResult.value?.hooks?.forEach(h => h.platform_fit?.forEach(p => platforms.add(p)))
  return [...platforms]
})

const filteredHooks = computed((): AIHook[] => {
  if (!hooksResult.value?.hooks) return []
  return hooksResult.value.hooks.filter(h => {
    if (activeFilter.value !== 'all' && h.type !== activeFilter.value) return false
    if (activePlatform.value !== 'all' && !h.platform_fit?.includes(activePlatform.value)) return false
    return true
  })
})

const typeCounts = computed(() => {
  const counts: Partial<Record<AIHookType, number>> = {}
  hooksResult.value?.hooks?.forEach(h => { counts[h.type] = (counts[h.type] ?? 0) + 1 })
  return counts
})

const platformCounts = computed(() => {
  const counts: Partial<Record<AIHookPlatform, number>> = {}
  hooksResult.value?.hooks?.forEach(h => h.platform_fit?.forEach(p => { counts[p] = (counts[p] ?? 0) + 1 }))
  return counts
})

function addTitle() { titles.value.push('') }
function removeTitle(idx: number) { if (titles.value.length > 1) titles.value.splice(idx, 1) }

async function generateHooks() {
  const validTitles = titles.value.filter(t => t.trim())
  if (!validTitles.length || !industry.value) return

  loading.value = true
  error.value = null
  hooksResult.value = null
  activeFilter.value = 'all'
  activePlatform.value = 'all'
  try {
    const res = await hooksMutation.mutateAsync({
      titles: validTitles,
      industry: industry.value,
      brand_name: brandName.value || undefined,
      hook_count: hookCount.value,
    })
    hooksResult.value = res.data as AIHooksResponse
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('market.error')
  } finally {
    loading.value = false
  }
}

async function copyHook(text: string, idx: number) {
  await navigator.clipboard.writeText(text)
  copiedIdx.value = idx
  setTimeout(() => { copiedIdx.value = null }, 1500)
}

async function copyAllHooks() {
  if (!filteredHooks.value.length) return
  const text = filteredHooks.value.map((h, i) => `${i + 1}. ${h.hook}`).join('\n')
  await navigator.clipboard.writeText(text)
  copiedAll.value = true
  setTimeout(() => { copiedAll.value = false }, 1500)
}

function getTypeColor(type: AIHookType): string {
  const map: Record<AIHookType, string> = {
    question: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/20',
    bold_statement: 'bg-accent-magenta/15 text-accent-magenta border-accent-magenta/20',
    curiosity: 'bg-accent-amber/15 text-accent-amber border-accent-amber/20',
    number: 'bg-primary/15 text-primary border-primary/20',
    pain_point: 'bg-destructive/15 text-destructive border-destructive/20',
    transformation: 'bg-success/15 text-success border-success/20',
    urgency: 'bg-warning/15 text-warning border-warning/20',
    contrarian: 'bg-accent/15 text-accent-foreground border-accent/20',
  }
  return map[type] ?? 'bg-muted text-muted-foreground border-border'
}

function getTypeIcon(type: AIHookType) {
  const map: Record<AIHookType, typeof MessageCircle> = {
    question: MessageCircle,
    bold_statement: Zap,
    curiosity: Lightbulb,
    number: Hash,
    pain_point: Target,
    transformation: TrendingUp,
    urgency: Flame,
    contrarian: ArrowLeftRight,
  }
  return map[type] ?? MessageCircle
}

function getPlatformColor(p: AIHookPlatform): string {
  const map: Record<AIHookPlatform, string> = {
    facebook: 'bg-[#1877F2]/15 text-[#1877F2]',
    instagram: 'bg-[#E4405F]/15 text-[#E4405F]',
    linkedin: 'bg-[#0A66C2]/15 text-[#0A66C2]',
    tiktok: 'bg-overlay-strong text-white/70',
  }
  return map[p] ?? 'bg-muted text-muted-foreground'
}

const hookTypeLabels: Record<AIHookType, string> = {
  question: t('market.hookType.question'),
  bold_statement: t('market.hookType.bold_statement'),
  curiosity: t('market.hookType.curiosity'),
  number: t('market.hookType.number'),
  pain_point: t('market.hookType.pain_point'),
  transformation: t('market.hookType.transformation'),
  urgency: t('market.hookType.urgency'),
  contrarian: t('market.hookType.contrarian'),
}

const platformLabels: Record<AIHookPlatform, string> = {
  facebook: t('market.platform.facebook'),
  instagram: t('market.platform.instagram'),
  linkedin: t('market.platform.linkedin'),
  tiktok: t('market.platform.tiktok'),
}
</script>

<template>
  <Topbar :title="t('market.hooksTitle')" :subtitle="t('market.hooksSubtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">

      <!-- Input form -->
      <div v-if="!hooksResult && !loading" class="surface-card p-5 sm:p-7 mb-6">
        <header class="flex items-start gap-4 mb-6">
          <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
            <Sparkles class="h-5 w-5 text-primary-foreground" />
          </div>
          <div class="min-w-0 flex-1">
            <h2 class="text-xl sm:text-2xl font-semibold tracking-tight">{{ t('market.hooksTitle') }}</h2>
            <p class="text-sm text-muted-foreground mt-1">{{ t('market.hooksDesc') }}</p>
          </div>
        </header>

        <div class="space-y-5">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.titles') }}</label>
            <div class="space-y-2">
              <div v-for="(_, idx) in titles" :key="idx" class="flex items-center gap-2">
                <input v-model="titles[idx]" data-loc="market.hooks.title-input" :placeholder="t('market.titleHint')" class="flex-1 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 transition" />
                <button v-if="titles.length > 1" class="h-10 w-10 rounded-lg border border-border/60 grid place-items-center hover:bg-overlay-subtle transition shrink-0" @click="removeTitle(idx)">
                  <Trash2 class="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
            <button data-loc="market.hooks.add-title-btn" class="mt-2 h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="addTitle">
              <Plus class="h-3 w-3" /> {{ t('market.addTitle') }}
            </button>
          </div>
          <div class="grid sm:grid-cols-3 gap-4">
            <div>
              <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.industry') }}</label>
              <input v-model="industry" data-loc="market.hooks.industry-input" :placeholder="t('market.industryHint')" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 transition" />
            </div>
            <div>
              <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.brandName') }}</label>
              <input v-model="brandName" data-loc="market.hooks.brand-name-input" :placeholder="t('market.brandNameHint')" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 transition" />
            </div>
            <div>
              <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('market.hookCount') }}</label>
              <input v-model.number="hookCount" data-loc="market.hooks.hook-count-input" type="number" min="1" max="50" class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary/40 transition" />
            </div>
          </div>
          <button
            data-loc="market.hooks.generate-btn"
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
            :disabled="!titles.some(t => t.trim()) || !industry"
            @click="generateHooks"
          >
            <Sparkles class="h-3.5 w-3.5" /> {{ t('market.generateHooks') }}
          </button>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8 sm:p-12">
        <AiLoadingAnimation :message="t('market.generatingHooks')" :description="t('market.generatingHooksDesc')" />
      </div>

      <!-- Error -->
      <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1"><div class="text-sm font-medium text-destructive">{{ error }}</div></div>
        <button data-loc="market.hooks.retry-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generateHooks">
          <RefreshCw class="h-3 w-3" /> {{ t('market.retry') }}
        </button>
      </div>

      <!-- ===================== RESULTS ===================== -->
      <div v-if="hooksResult && !loading">

        <!-- Header: Brand / Industry / Actions -->
        <div class="surface-card p-4 sm:p-5 mb-4 flex flex-col gap-3">
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
              <span v-if="hooksResult.brand_name" class="text-gradient text-lg sm:text-xl font-bold">{{ hooksResult.brand_name }}</span>
              <span class="text-muted-foreground text-sm">{{ hooksResult.industry }}</span>
            </div>
            <div class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span>{{ t('market.hooksFound', { count: hooksResult.hooks?.length ?? 0 }) }}</span>
              <span class="hidden sm:inline">&middot;</span>
              <span>{{ t('market.sourceTitles') }}: {{ hooksResult.source_titles_count }}</span>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <button
              class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition"
              @click="copyAllHooks"
            >
              <component :is="copiedAll ? Check : Copy" class="h-3 w-3" />
              {{ copiedAll ? t('market.copied') : t('market.copyAllHooks') }}
            </button>
            <!-- Export dropdown -->
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
            <button data-loc="market.hooks.re-run-btn" class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="hooksResult = null">
              <RefreshCw class="h-3 w-3" /> {{ t('market.reRun') }}
            </button>
          </div>
        </div>

        <!-- Tab toggle: Results / Insights -->
        <div class="grid grid-cols-2 gap-1 p-1 rounded-lg bg-overlay-subtle border border-border/40 mb-4">
          <button
            class="h-8 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="showResults ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'"
            @click="showResults = true; showInsights = false"
          >
            <LayoutGrid class="h-3.5 w-3.5" /> {{ t('market.hooksResults') }}
          </button>
          <button
            class="h-8 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition"
            :class="showInsights ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'"
            @click="showInsights = true; showResults = false"
          >
            <BarChart3 class="h-3.5 w-3.5" /> {{ t('market.hooksInsights') }}
          </button>
        </div>

        <!-- ========= RESULTS TAB ========= -->
        <div v-if="showResults">

          <!-- Filters -->
          <div class="flex flex-col gap-3 mb-4">
            <!-- Type filter -->
            <div v-if="allHookTypes.length > 1">
              <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Filter class="h-2.5 w-2.5" /> {{ t('market.filterByType') }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  class="h-7 px-2.5 rounded-md text-[11px] font-medium border transition"
                  :class="activeFilter === 'all' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-overlay-subtle text-muted-foreground border-border/40 hover:bg-overlay-light'"
                  @click="activeFilter = 'all'"
                >{{ t('market.allTypes') }}</button>
                <button
                  v-for="ht in allHookTypes" :key="ht"
                  class="h-7 px-2.5 rounded-md text-[11px] font-medium border transition flex items-center gap-1"
                  :class="activeFilter === ht ? getTypeColor(ht) + ' border' : 'bg-overlay-subtle text-muted-foreground border-border/40 hover:bg-overlay-light'"
                  @click="activeFilter = activeFilter === ht ? 'all' : ht"
                >
                  <component :is="getTypeIcon(ht)" class="h-2.5 w-2.5" />
                  {{ hookTypeLabels[ht] }}
                  <span class="opacity-60">{{ typeCounts[ht] }}</span>
                </button>
              </div>
            </div>
            <!-- Platform filter -->
            <div v-if="allPlatforms.length > 1">
              <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                <Filter class="h-2.5 w-2.5" /> {{ t('market.filterByPlatform') }}
              </div>
              <div class="flex flex-wrap gap-1.5">
                <button
                  class="h-7 px-2.5 rounded-md text-[11px] font-medium border transition"
                  :class="activePlatform === 'all' ? 'bg-primary/15 text-primary border-primary/30' : 'bg-overlay-subtle text-muted-foreground border-border/40 hover:bg-overlay-light'"
                  @click="activePlatform = 'all'"
                >{{ t('market.allPlatforms') }}</button>
                <button
                  v-for="p in allPlatforms" :key="p"
                  class="h-7 px-2.5 rounded-md text-[11px] font-medium border transition flex items-center gap-1"
                  :class="activePlatform === p ? getPlatformColor(p) + ' border border-current/20' : 'bg-overlay-subtle text-muted-foreground border-border/40 hover:bg-overlay-light'"
                  @click="activePlatform = activePlatform === p ? 'all' : p"
                >
                  {{ platformLabels[p] }}
                  <span class="opacity-60">{{ platformCounts[p] }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Hook cards -->
          <div v-if="filteredHooks.length" class="grid gap-3 sm:gap-4">
            <div
              v-for="(hook, idx) in filteredHooks" :key="idx"
              class="surface-card p-4 sm:p-5 group animate-[fade-up_0.4s_ease-out_both]"
              :style="{ animationDelay: `${Math.min(idx * 50, 500)}ms` }"
            >
              <!-- Top row: type badge + platform pills + copy -->
              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider border" :class="getTypeColor(hook.type)">
                  <component :is="getTypeIcon(hook.type)" class="h-2.5 w-2.5" />
                  {{ hookTypeLabels[hook.type] }}
                </span>
                <div class="flex gap-1">
                  <span
                    v-for="p in hook.platform_fit" :key="p"
                    class="px-1.5 py-0.5 rounded text-[10px] font-medium"
                    :class="getPlatformColor(p)"
                  >{{ platformLabels[p] }}</span>
                </div>
                <button
                  class="ms-auto h-7 w-7 rounded-md grid place-items-center sm:opacity-0 sm:group-hover:opacity-100 transition text-muted-foreground hover:text-foreground hover:bg-overlay-light"
                  @click="copyHook(hook.hook, idx)"
                >
                  <component :is="copiedIdx === idx ? Check : Copy" class="h-3 w-3" />
                </button>
              </div>

              <!-- Hook text -->
              <p class="text-[15px] sm:text-base leading-relaxed font-medium mb-3">{{ hook.hook }}</p>

              <!-- Inspired by -->
              <div class="text-[11px] text-muted-foreground/70">
                {{ t('market.inspiredBy') }}: <span class="text-muted-foreground">{{ hook.inspired_by }}</span>
              </div>
            </div>
          </div>

          <!-- Empty filter state -->
          <div v-else class="surface-card p-8 text-center">
            <Filter class="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <div class="text-sm text-muted-foreground">{{ t('market.noHooksMatch') }}</div>
          </div>
        </div>

        <!-- ========= INSIGHTS TAB ========= -->
        <div v-if="showInsights" class="space-y-4 animate-[fade-up_0.4s_ease-out_both]">

          <!-- Recommended Approach -->
          <div v-if="hooksResult.analysis?.recommended_approach" class="surface-card p-4 sm:p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                <Lightbulb class="h-4 w-4 text-primary" />
              </div>
              <h3 class="text-sm font-semibold">{{ t('market.recommendedApproach') }}</h3>
            </div>
            <p class="text-sm leading-relaxed text-muted-foreground">{{ hooksResult.analysis.recommended_approach }}</p>
          </div>

          <!-- Common Patterns -->
          <div v-if="hooksResult.analysis?.common_patterns?.length" class="surface-card p-4 sm:p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="h-8 w-8 rounded-lg bg-accent-cyan/10 grid place-items-center">
                <BarChart3 class="h-4 w-4 text-accent-cyan" />
              </div>
              <h3 class="text-sm font-semibold">{{ t('market.commonPatterns') }}</h3>
            </div>
            <div class="space-y-2">
              <div
                v-for="(pattern, idx) in hooksResult.analysis.common_patterns" :key="idx"
                class="flex items-start gap-2.5 p-2.5 rounded-lg bg-overlay-subtle"
              >
                <div class="h-5 w-5 rounded-full bg-accent-cyan/10 grid place-items-center shrink-0 mt-0.5">
                  <span class="text-[10px] font-bold text-accent-cyan">{{ idx + 1 }}</span>
                </div>
                <span class="text-sm text-muted-foreground leading-relaxed">{{ pattern }}</span>
              </div>
            </div>
          </div>

          <!-- Power Words -->
          <div v-if="hooksResult.analysis?.power_words_used?.length" class="surface-card p-4 sm:p-5">
            <div class="flex items-center gap-2 mb-3">
              <div class="h-8 w-8 rounded-lg bg-accent-amber/10 grid place-items-center">
                <Zap class="h-4 w-4 text-accent-amber" />
              </div>
              <h3 class="text-sm font-semibold">{{ t('market.powerWords') }}</h3>
            </div>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(word, idx) in hooksResult.analysis.power_words_used" :key="idx"
                class="px-2.5 py-1 rounded-md bg-accent-amber/10 text-accent-amber text-xs font-medium border border-accent-amber/20"
              >{{ word }}</span>
            </div>
          </div>

          <!-- Type distribution mini-chart -->
          <div class="surface-card p-4 sm:p-5">
            <div class="flex items-center gap-2 mb-4">
              <div class="h-8 w-8 rounded-lg bg-accent-magenta/10 grid place-items-center">
                <TrendingUp class="h-4 w-4 text-accent-magenta" />
              </div>
              <h3 class="text-sm font-semibold">{{ t('market.analysis') }}</h3>
            </div>
            <div class="space-y-3">
              <div v-for="ht in allHookTypes" :key="ht" class="flex items-center gap-2 sm:gap-3">
                <div class="w-20 sm:w-28 text-[11px] text-muted-foreground truncate flex items-center gap-1 shrink-0">
                  <component :is="getTypeIcon(ht)" class="h-3 w-3 shrink-0" />
                  <span class="truncate">{{ hookTypeLabels[ht] }}</span>
                </div>
                <div class="flex-1 h-2 rounded-full bg-overlay-light overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-700"
                    :class="{
                      'bg-accent-cyan': ht === 'question',
                      'bg-accent-magenta': ht === 'bold_statement',
                      'bg-accent-amber': ht === 'curiosity',
                      'bg-primary': ht === 'number',
                      'bg-destructive': ht === 'pain_point',
                      'bg-success': ht === 'transformation',
                      'bg-warning': ht === 'urgency',
                      'bg-accent': ht === 'contrarian',
                    }"
                    :style="{ width: `${((typeCounts[ht] ?? 0) / (hooksResult?.hooks?.length || 1)) * 100}%` }"
                  />
                </div>
                <span class="text-[11px] text-muted-foreground w-5 text-end tabular-nums">{{ typeCounts[ht] ?? 0 }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
