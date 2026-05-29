<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Brain, Target, Layers, Grid3x3, MonitorSmartphone, Settings2,
  Sparkles, Image as ImageIcon, Download,
  Check, Lock, ChevronRight, ChevronDown, ChevronUp,
  Globe, Building2, Clock, MapPin, Package, FileText,
  TrendingUp, Users, LayoutGrid, Loader2, Presentation,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import Breadcrumb from '@/shared/components/Breadcrumb.vue'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useCampaign } from '../queries'
import { exportCampaignPDF, exportCampaignPPTX } from '@/shared/utils/exportCampaign'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const confetti = useConfetti()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading } = useCampaign(campaignUuid)

const stepsData = computed(() => {
  const latest = (campaign.value as any)?.latest_steps
  if (!latest) return []
  return Object.values(latest) as any[]
})

const exporting = ref(false)
const showExportMenu = ref(false)

async function handleExport(format: 'pdf' | 'pptx') {
  showExportMenu.value = false
  if (!campaign.value) return
  exporting.value = true
  try {
    const steps = stepsData.value ?? []
    if (format === 'pdf') await exportCampaignPDF(campaign.value, steps)
    else await exportCampaignPPTX(campaign.value, steps)
    confetti.trigger()
  } finally {
    exporting.value = false
  }
}

const breadcrumbs = computed(() => [
  { label: t('breadcrumb.campaigns' as any), to: '/campaigns' },
  { label: campaign.value?.name ?? 'Campaign' },
])

interface StepDef {
  labelKey: string
  icon: any
  routeSuffix: string
  flag: string
  platformFlag?: string
}

const STEPS: StepDef[] = [
  { labelKey: 'smart.s1', icon: Brain, routeSuffix: 'segmentation', flag: 'segmentation_completed' },
  { labelKey: 'smart.s3', icon: Target, routeSuffix: 'ppc-viability', flag: 'ppc_viability_completed' },
  { labelKey: 'smart.s4', icon: Layers, routeSuffix: 'funnel', flag: 'funnel_completed' },
  { labelKey: 'smart.s5', icon: Grid3x3, routeSuffix: 'content', flag: 'content_strategy_completed' },
  { labelKey: 'platform.title', icon: MonitorSmartphone, routeSuffix: 'platform', flag: '_platform_selected' },
  { labelKey: 'strategy.title', icon: Settings2, routeSuffix: 'ads-strategy', flag: '_ads_strategy_done' },
  { labelKey: 'adgen.title', icon: Sparkles, routeSuffix: 'generate-ads', flag: '_ads_generated' },
  { labelKey: 'visual.title', icon: ImageIcon, routeSuffix: 'visuals', flag: '_visuals_generated' },
  { labelKey: 'review.title', icon: Download, routeSuffix: 'review', flag: '_review' },
]


function isStepDone(step: StepDef): boolean {
  const c = campaign.value as any
  if (step.flag === '_platform_selected') {
    return (c?.context_payload?.selected_platforms?.length ?? 0) > 0
  }
  if (step.flag === '_ads_strategy_done') {
    const platforms: string[] = c?.context_payload?.selected_platforms ?? []
    if (platforms.length === 0) return false
    return platforms.every((p: string) => c?.[`${p}_ads_completed`])
  }
  if (step.flag === '_ads_generated' || step.flag === '_visuals_generated') {
    return false
  }
  if (step.flag === '_review') {
    return c?.status === 'completed'
  }
  if (step.flag.startsWith('_')) {
    const idx = STEPS.indexOf(step)
    return idx > 0 ? STEPS.slice(0, idx).every((s) => isStepDone(s)) : false
  }
  return c?.[step.flag] ?? false
}

function canNavigate(step: StepDef): boolean {
  if (!campaign.value) return false
  const idx = STEPS.indexOf(step)
  if (idx === 0) return true
  return isStepDone(STEPS[idx - 1])
}

function navigateToStep(step: StepDef) {
  if (!canNavigate(step)) return
  router.push(`/campaigns/${campaignUuid.value}/${step.routeSuffix}`)
}

function getFirstIncompleteStep(): StepDef | undefined {
  return STEPS.find((s) => !isStepDone(s))
}

const hasAutoRedirected = ref(false)
watch(campaign, (c) => {
  if (!c || hasAutoRedirected.value) return
  const lastSegment = route.path.split('/').pop()
  if (lastSegment === campaignUuid.value) {
    hasAutoRedirected.value = true
    const first = getFirstIncompleteStep()
    if (first) navigateToStep(first)
  }
})

// Summary data helpers
const summary = computed(() => (campaign.value as any)?.summary || {})
const contextPayload = computed(() => (campaign.value as any)?.context_payload || {})

const segmentationSummary = computed(() => summary.value.segmentation)
const ppcSummary = computed(() => summary.value.ppc_viability)
const funnelSummary = computed(() => summary.value.funnel)
const contentSummary = computed(() => summary.value.content_strategy)
const selectedPlatforms = computed<string[]>(() => contextPayload.value.selected_platforms || [])

const completedCount = computed(() => {
  return STEPS.filter((s) => isStepDone(s)).length
})
const totalSteps = STEPS.length
const progressPercent = computed(() => Math.round((completedCount.value / totalSteps) * 100))

// Platform-specific ad completion
const platformAdsStatus = computed(() => {
  const c = campaign.value as any
  return [
    { key: 'meta', label: 'Meta Ads', completed: c?.meta_ads_completed ?? false },
    { key: 'google', label: 'Google Ads', completed: c?.google_ads_completed ?? false },
    { key: 'linkedin', label: 'LinkedIn Ads', completed: c?.linkedin_ads_completed ?? false },
  ]
})


// Expanded sections state
const expandedSections = ref<Record<string, boolean>>({ segmentation: true, ppc: false, funnel: false, content: false })

function toggleSection(key: string) {
  expandedSections.value[key] = !expandedSections.value[key]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const platformIconMap: Record<string, string> = {
  meta: 'Meta',
  google: 'Google',
  linkedin: 'LinkedIn',
}

function getStepStatusLabel(step: StepDef, idx: number): string {
  if (isStepDone(step)) return t('status.completed' as any)
  if (idx === STEPS.findIndex(s => !isStepDone(s))) return t('smart.inProgress' as any)
  return t('smart.locked' as any)
}
</script>

<template>
  <Topbar
    :title="campaign?.name ?? t('camp.loading' as any)"
    :subtitle="campaign?.brand?.company_name"
  />
  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <Breadcrumb :items="breadcrumbs" :show-back="true" back-to="/campaigns" data-loc="campaigns.detail.back-btn" />

    <!-- Loading -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>

    <template v-else-if="campaign">
      <!-- Campaign Header -->
      <section class="mt-4 surface-card p-5 sm:p-6" data-loc="campaigns.detail.header">
        <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div class="flex-1 min-w-0">
            <h1 class="text-xl sm:text-2xl font-bold text-foreground truncate">{{ campaign.name }}</h1>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-muted-foreground">
              <span class="flex items-center gap-1.5" v-if="campaign.brand?.company_name">
                <Building2 class="h-3.5 w-3.5" />
                {{ campaign.brand.company_name }}
              </span>
              <span class="flex items-center gap-1.5" v-if="campaign.brand?.selected_industry">
                <LayoutGrid class="h-3.5 w-3.5" />
                {{ campaign.brand.selected_industry.name }}
              </span>
              <span class="flex items-center gap-1.5" v-if="campaign.brand?.website_url">
                <Globe class="h-3.5 w-3.5" />
                <a :href="campaign.brand.website_url" target="_blank" rel="noopener" class="text-primary hover:underline">{{ campaign.brand.website_url.replace(/^https?:\/\//, '') }}</a>
              </span>
            </div>
          </div>
          <!-- Status Badge -->
          <div class="flex items-center gap-2 shrink-0">
            <span :class="[
              'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border',
              campaign.status === 'completed' ? 'bg-success/15 border-success/30 text-success' :
              campaign.status === 'in_progress' ? 'bg-accent-cyan/15 border-accent-cyan/30 text-accent-cyan' :
              'bg-muted/20 border-border/40 text-muted-foreground'
            ]">
              <span class="h-1.5 w-1.5 rounded-full" :class="campaign.status === 'in_progress' ? 'bg-accent-cyan animate-pulse' : campaign.status === 'completed' ? 'bg-success' : 'bg-muted-foreground'" />
              {{ campaign.status === 'in_progress' ? t('smart.inProgress' as any) : campaign.status === 'completed' ? t('status.completed' as any) : campaign.status }}
            </span>

            <!-- Export Dropdown -->
            <div class="relative shrink-0">
              <button
                :disabled="exporting"
                class="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/40 bg-overlay-subtle text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-overlay-light transition disabled:opacity-50"
                @click="showExportMenu = !showExportMenu"
              >
                <Loader2 v-if="exporting" class="h-3 w-3 animate-spin" />
                <Download v-else class="h-3 w-3" />
                {{ exporting ? t('cd.exporting' as any) : t('cd.export' as any) }}
              </button>
              <div
                v-if="showExportMenu"
                class="absolute end-0 top-full mt-1.5 z-50 min-w-[180px] max-w-[calc(100vw-2rem)] rounded-lg border border-border/40 bg-popover shadow-lg py-1"
              >
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition"
                  @click="handleExport('pdf')"
                >
                  <FileText class="h-3.5 w-3.5 text-red-400" />
                  {{ t('cd.exportPDF' as any) }}
                </button>
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-overlay-light transition"
                  @click="handleExport('pptx')"
                >
                  <Presentation class="h-3.5 w-3.5 text-orange-400" />
                  {{ t('cd.exportPPTX' as any) }}
                </button>
              </div>
              <div v-if="showExportMenu" class="fixed inset-0 z-40" @click="showExportMenu = false" />
            </div>
          </div>
        </div>

        <!-- Progress Bar -->
        <div class="mt-5">
          <div class="flex items-center justify-between text-sm mb-2">
            <span class="text-muted-foreground">{{ t('cd.progress' as any) }}</span>
            <span class="font-medium text-foreground">{{ progressPercent }}%</span>
          </div>
          <div class="h-2 rounded-full bg-muted/20 overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="progressPercent === 100 ? 'bg-success' : 'bg-[image:var(--gradient-brand)]'"
              :style="{ width: progressPercent + '%' }"
            />
          </div>
          <div class="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
            <span>{{ t('cd.progressLabel' as any).replace('{done}', String(completedCount)).replace('{total}', String(totalSteps)) }}</span>
            <span class="flex items-center gap-1">
              <Clock class="h-3 w-3" />
              {{ formatDate(campaign.updated_at) }}
            </span>
          </div>
        </div>

        <!-- Selected Platforms -->
        <div v-if="selectedPlatforms.length > 0" class="mt-4 flex items-center gap-2 flex-wrap">
          <span class="text-xs text-muted-foreground">{{ t('cd.selectedPlatforms' as any) }}:</span>
          <span
            v-for="p in selectedPlatforms"
            :key="p"
            class="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/20"
          >
            {{ platformIconMap[p] || p }}
          </span>
        </div>

        <!-- Platform Ad Status -->
        <div v-if="selectedPlatforms.length > 0" class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div
            v-for="p in platformAdsStatus.filter(ps => selectedPlatforms.includes(ps.key))"
            :key="p.key"
            class="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1.5"
            :class="p.completed ? 'bg-success/10 text-success' : 'bg-muted/15 text-muted-foreground'"
          >
            <Check v-if="p.completed" class="h-3 w-3" />
            <span v-else class="h-3 w-3 rounded-full border border-current" />
            <span>{{ platformIconMap[p.key] || p.key }}</span>
          </div>
        </div>
      </section>

      <!-- Summary Cards Grid -->
      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3" data-loc="campaigns.detail.summary">

        <!-- Segmentation Summary -->
        <div class="surface-card p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-lg grid place-items-center bg-accent-magenta/15 text-accent-magenta border border-accent-magenta/20">
              <Brain class="h-4 w-4" />
            </div>
            <div>
              <div class="text-sm font-medium">{{ t('smart.s1' as any) }}</div>
              <div class="text-[10px] text-success" v-if="campaign.segmentation_completed">{{ t('status.completed' as any) }}</div>
            </div>
          </div>
          <div class="space-y-2" v-if="segmentationSummary">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1"><MapPin class="h-3 w-3" /> {{ t('cd.location' as any) }}</span>
              <span class="font-medium">{{ segmentationSummary.location }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1"><Package class="h-3 w-3" /> {{ t('cd.segments' as any) }}</span>
              <span class="font-medium">{{ segmentationSummary.segments_count }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ t('cd.deepResearch' as any) }}</span>
              <span :class="segmentationSummary.has_deep_research ? 'text-success' : 'text-muted-foreground'" class="font-medium">
                {{ segmentationSummary.has_deep_research ? t('cd.enabled' as any) : t('cd.disabled' as any) }}
              </span>
            </div>
          </div>
        </div>

        <!-- PPC Viability Summary -->
        <div class="surface-card p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-lg grid place-items-center bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/20">
              <Target class="h-4 w-4" />
            </div>
            <div>
              <div class="text-sm font-medium">{{ t('smart.s3' as any) }}</div>
              <div class="text-[10px] text-success" v-if="campaign.ppc_viability_completed">{{ t('status.completed' as any) }}</div>
            </div>
          </div>
          <div class="space-y-2" v-if="ppcSummary">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ t('cd.services' as any) }}</span>
              <span class="font-medium">{{ ppcSummary.services_count }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ t('cd.ppcReady' as any) }}</span>
              <span class="font-medium text-success">{{ ppcSummary.ppc_ready_services }} {{ t('cd.of' as any) }} {{ ppcSummary.services_count }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">Brand-first</span>
              <span class="font-medium">{{ ppcSummary.brand_first_services }}</span>
            </div>
          </div>
        </div>

        <!-- Funnel Summary -->
        <div class="surface-card p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-lg grid place-items-center bg-accent-amber/15 text-accent-amber border border-accent-amber/20">
              <Layers class="h-4 w-4" />
            </div>
            <div>
              <div class="text-sm font-medium">{{ t('smart.s4' as any) }}</div>
              <div class="text-[10px] text-success" v-if="campaign.funnel_completed">{{ t('status.completed' as any) }}</div>
            </div>
          </div>
          <div class="space-y-2" v-if="funnelSummary">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1"><Users class="h-3 w-3" /> {{ t('cd.personas' as any) }}</span>
              <span class="font-medium">{{ funnelSummary.persona_profiles_count }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground">{{ t('cd.dominantStage' as any) }}</span>
              <span class="font-medium text-primary">{{ funnelSummary.dominant_stage_overall?.toUpperCase() }}</span>
            </div>
            <!-- Budget Split Mini Bar -->
            <div class="space-y-1" v-if="funnelSummary.tofu_budget_percentage != null">
              <div class="flex text-[10px] text-muted-foreground justify-between"><span>TOFU</span><span>{{ funnelSummary.tofu_budget_percentage }}%</span></div>
              <div class="h-1 rounded-full bg-muted/20 overflow-hidden flex">
                <div class="bg-accent-cyan rounded-l-full" :style="{ width: funnelSummary.tofu_budget_percentage + '%' }" />
                <div class="bg-accent-amber" :style="{ width: funnelSummary.mofu_budget_percentage + '%' }" />
                <div class="bg-accent-magenta rounded-r-full" :style="{ width: funnelSummary.bofu_budget_percentage + '%' }" />
              </div>
              <div class="flex text-[10px] text-muted-foreground justify-between"><span>MOFU {{ funnelSummary.mofu_budget_percentage }}%</span><span>BOFU {{ funnelSummary.bofu_budget_percentage }}%</span></div>
            </div>
          </div>
        </div>

        <!-- Content Strategy Summary -->
        <div class="surface-card p-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-lg grid place-items-center bg-primary/15 text-primary border border-primary/20">
              <Grid3x3 class="h-4 w-4" />
            </div>
            <div>
              <div class="text-sm font-medium">{{ t('smart.s5' as any) }}</div>
              <div class="text-[10px] text-success" v-if="campaign.content_strategy_completed">{{ t('status.completed' as any) }}</div>
            </div>
          </div>
          <div class="space-y-2" v-if="contentSummary">
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1"><FileText class="h-3 w-3" /> {{ t('cd.pieces' as any) }}</span>
              <span class="font-medium">{{ contentSummary.content_pieces_count }}</span>
            </div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-muted-foreground flex items-center gap-1"><TrendingUp class="h-3 w-3" /> {{ t('cd.keyThemes' as any) }}</span>
              <span class="font-medium">{{ contentSummary.key_themes?.length ?? 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Detailed Expandable Sections -->
      <div class="mt-4 space-y-2" data-loc="campaigns.detail.details">

        <!-- PPC Budget Allocation -->
        <div v-if="ppcSummary?.recommended_initial_budget_allocation" class="surface-card overflow-hidden">
          <button
            class="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition"
            @click="toggleSection('ppc')"
          >
            <div class="flex items-center gap-2">
              <Target class="h-4 w-4 text-accent-cyan" />
              <span class="text-sm font-medium">{{ t('cd.budgetAllocation' as any) }}</span>
            </div>
            <component :is="expandedSections.ppc ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
          </button>
          <div v-if="expandedSections.ppc" class="px-4 pb-4 space-y-3 border-t border-border/30">
            <p class="text-sm text-muted-foreground mt-3 leading-relaxed">{{ ppcSummary.recommended_initial_budget_allocation }}</p>
            <div v-if="ppcSummary.top_ranked_services?.length" class="mt-2">
              <div class="text-xs text-muted-foreground mb-1.5">{{ t('cd.topServices' as any) }}</div>
              <div class="space-y-1">
                <div
                  v-for="(svc, i) in ppcSummary.top_ranked_services"
                  :key="i"
                  class="text-xs text-foreground/80 flex items-start gap-2 py-1 px-2 rounded bg-muted/10"
                >
                  <span class="text-primary font-medium shrink-0">#{{ Number(i) + 1 }}</span>
                  <span>{{ svc }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Content Strategy Themes -->
        <div v-if="contentSummary?.key_themes?.length" class="surface-card overflow-hidden">
          <button
            class="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition"
            @click="toggleSection('content')"
          >
            <div class="flex items-center gap-2">
              <Grid3x3 class="h-4 w-4 text-primary" />
              <span class="text-sm font-medium">{{ t('cd.keyThemes' as any) }}</span>
              <span class="text-xs text-muted-foreground">({{ contentSummary.key_themes.length }})</span>
            </div>
            <component :is="expandedSections.content ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
          </button>
          <div v-if="expandedSections.content" class="px-4 pb-4 space-y-3 border-t border-border/30">
            <div v-if="contentSummary.primary_objective" class="mt-3">
              <div class="text-xs text-muted-foreground mb-1">{{ t('cd.primaryObjective' as any) }}</div>
              <p class="text-sm text-foreground/90 leading-relaxed">{{ contentSummary.primary_objective }}</p>
            </div>
            <div class="flex flex-wrap gap-1.5 mt-2">
              <span
                v-for="(theme, i) in contentSummary.key_themes"
                :key="i"
                class="inline-flex items-center px-2.5 py-1 rounded-lg text-xs bg-primary/10 text-primary/90 border border-primary/15"
              >
                {{ theme }}
              </span>
            </div>
          </div>
        </div>

        <!-- Funnel Budget Details -->
        <div v-if="funnelSummary?.tofu_budget_percentage != null" class="surface-card overflow-hidden">
          <button
            class="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition"
            @click="toggleSection('funnel')"
          >
            <div class="flex items-center gap-2">
              <Layers class="h-4 w-4 text-accent-amber" />
              <span class="text-sm font-medium">{{ t('cd.budgetSplit' as any) }}</span>
            </div>
            <component :is="expandedSections.funnel ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
          </button>
          <div v-if="expandedSections.funnel" class="px-4 pb-4 border-t border-border/30">
            <div class="mt-3 space-y-2">
              <div class="flex items-center gap-3">
                <span class="text-xs w-24 text-muted-foreground">{{ t('cd.tofu' as any) }}</span>
                <div class="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div class="h-full bg-accent-cyan rounded-full" :style="{ width: funnelSummary.tofu_budget_percentage + '%' }" />
                </div>
                <span class="text-xs font-medium w-10 text-end">{{ funnelSummary.tofu_budget_percentage }}%</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs w-24 text-muted-foreground">{{ t('cd.mofu' as any) }}</span>
                <div class="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div class="h-full bg-accent-amber rounded-full" :style="{ width: funnelSummary.mofu_budget_percentage + '%' }" />
                </div>
                <span class="text-xs font-medium w-10 text-end">{{ funnelSummary.mofu_budget_percentage }}%</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs w-24 text-muted-foreground">{{ t('cd.bofu' as any) }}</span>
                <div class="flex-1 h-2 rounded-full bg-muted/20 overflow-hidden">
                  <div class="h-full bg-accent-magenta rounded-full" :style="{ width: funnelSummary.bofu_budget_percentage + '%' }" />
                </div>
                <span class="text-xs font-medium w-10 text-end">{{ funnelSummary.bofu_budget_percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Segmentation Details -->
        <div v-if="segmentationSummary" class="surface-card overflow-hidden">
          <button
            class="w-full p-4 flex items-center justify-between hover:bg-muted/5 transition"
            @click="toggleSection('segmentation')"
          >
            <div class="flex items-center gap-2">
              <Brain class="h-4 w-4 text-accent-magenta" />
              <span class="text-sm font-medium">{{ t('smart.s1' as any) }}</span>
            </div>
            <component :is="expandedSections.segmentation ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
          </button>
          <div v-if="expandedSections.segmentation" class="px-4 pb-4 border-t border-border/30">
            <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <div class="text-muted-foreground mb-0.5">{{ t('cd.location' as any) }}</div>
                <div class="font-medium">{{ segmentationSummary.location }}</div>
              </div>
              <div>
                <div class="text-muted-foreground mb-0.5">{{ t('cd.businessType' as any) }}</div>
                <div class="font-medium">{{ segmentationSummary.business_type }}</div>
              </div>
              <div>
                <div class="text-muted-foreground mb-0.5">{{ t('cd.segments' as any) }}</div>
                <div class="font-medium">{{ segmentationSummary.segments_count }}</div>
              </div>
              <div>
                <div class="text-muted-foreground mb-0.5">{{ t('cd.deepResearch' as any) }}</div>
                <div :class="segmentationSummary.has_deep_research ? 'text-success' : ''" class="font-medium">
                  {{ segmentationSummary.has_deep_research ? t('cd.enabled' as any) : t('cd.disabled' as any) }}
                </div>
              </div>
            </div>
            <div v-if="contextPayload.segmentation?.product_description" class="mt-3 text-xs">
              <div class="text-muted-foreground mb-0.5">{{ t('cd.product' as any) }}</div>
              <div class="font-medium">{{ contextPayload.segmentation.product_description }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Steps Navigation -->
      <div class="mt-4" data-loc="campaigns.detail.steps">
        <h2 class="text-sm font-medium text-muted-foreground mb-2">{{ t('camp.steps' as any) }}</h2>
        <div class="space-y-1.5">
          <div
            v-for="(step, idx) in STEPS"
            :key="step.routeSuffix"
            :class="[
              'surface-card p-3 sm:p-4 flex items-center gap-3 transition',
              canNavigate(step) ? 'hover:border-primary/40 cursor-pointer' : 'opacity-50 cursor-not-allowed',
            ]"
            @click="navigateToStep(step)"
          >
            <!-- Step Number + Icon -->
            <div class="flex items-center gap-2 sm:gap-3">
              <div
                :class="[
                  'h-9 w-9 rounded-lg grid place-items-center shrink-0 border text-xs font-bold',
                  isStepDone(step) ? 'bg-success/15 border-success/40 text-success' :
                  idx === STEPS.findIndex(s => !isStepDone(s)) ? 'bg-[image:var(--gradient-brand)] border-transparent text-primary-foreground' :
                  'border-border/60 text-muted-foreground',
                ]"
              >
                <Check v-if="isStepDone(step)" class="h-4 w-4" />
                <component :is="step.icon" v-else class="h-4 w-4" />
              </div>
            </div>

            <!-- Label + Status -->
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium truncate">{{ t(step.labelKey as any) }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">{{ getStepStatusLabel(step, idx) }}</div>
            </div>

            <!-- Arrow -->
            <component :is="canNavigate(step) ? ChevronRight : Lock" class="h-4 w-4 text-muted-foreground/50 shrink-0" />
          </div>
        </div>
      </div>

      <!-- Campaign Meta Footer -->
      <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground pb-6">
        <span v-if="campaign.created_at">Created {{ formatDate(campaign.created_at) }}</span>
        <span v-if="campaign.updated_at">Updated {{ formatDate(campaign.updated_at) }}</span>
        <span>UUID: {{ campaign.campaign_uuid.slice(0, 8) }}...</span>
      </div>
    </template>
  </main>
</template>
