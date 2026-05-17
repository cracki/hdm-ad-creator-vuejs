<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/shared/utils/i18n'
import { exportAuditPDF, exportAuditPPTX, exportAuditXLSX } from '@/shared/utils/exportSocialAudit'
import {
  FileText, LayoutGrid, Lightbulb, BarChart3, Users, Wrench,
  Calendar, Target, Check, Clock, DollarSign,
  Briefcase, TrendingUp, Eye, Zap, ArrowUpRight,
  Star, Activity, CircleDot, Download, Loader2,
} from 'lucide-vue-next'

const { t } = useI18n()

const props = defineProps<{
  data: Record<string, unknown>
}>()

interface PlatformRec {
  platform: string
  priority: string
  rationale: string
  required_effort: string
  potential_roi: string
}

interface ContentGap {
  gap: string
  impact: string
  recommendation: string
}

interface TeamMember {
  role: string
  time_commitment: string
  skills_needed: string[]
}

interface Tool {
  tool: string
  purpose: string
  estimated_cost: string
}

interface WeekTask {
  week: number
  tasks: string[]
  deliverables: string[]
}

const executiveSummary = computed(() => typeof props.data.executive_summary === 'string' ? props.data.executive_summary : '')

const platformRecs = computed<PlatformRec[]>(() => {
  const raw = props.data.platform_recommendations
  return Array.isArray(raw) ? raw as PlatformRec[] : []
})

const contentGaps = computed<ContentGap[]>(() => {
  const raw = props.data.content_gaps
  return Array.isArray(raw) ? raw as ContentGap[] : []
})

const benchmarks = computed(() => {
  const raw = props.data.competitive_benchmarks
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
})

const resourcePlan = computed(() => {
  const raw = props.data.resource_plan
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
})

const actionPlan = computed(() => {
  const raw = props.data.action_plan_90_days
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
})

const successMetrics = computed(() => {
  const raw = props.data.success_metrics
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : null
})

const teamMembers = computed<TeamMember[]>(() => {
  const raw = resourcePlan.value?.team
  return Array.isArray(raw) ? raw as TeamMember[] : []
})

const tools = computed<Tool[]>(() => {
  const raw = resourcePlan.value?.tools
  return Array.isArray(raw) ? raw as Tool[] : []
})

const budget = computed(() => {
  const raw = resourcePlan.value?.monthly_budget_estimate
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, string> : null
})

type TabKey = 'overview' | 'platforms' | 'gaps' | 'benchmarks' | 'resources' | 'action' | 'metrics'

const activeTab = ref<TabKey>('overview')

const tabs = computed(() => [
  { key: 'overview' as TabKey, icon: FileText, label: t('socialAudit.tabOverview') },
  { key: 'platforms' as TabKey, icon: LayoutGrid, label: t('socialAudit.tabPlatforms') },
  { key: 'gaps' as TabKey, icon: Lightbulb, label: t('socialAudit.tabGaps') },
  { key: 'benchmarks' as TabKey, icon: BarChart3, label: t('socialAudit.tabBenchmarks') },
  { key: 'resources' as TabKey, icon: Wrench, label: t('socialAudit.tabResources') },
  { key: 'action' as TabKey, icon: Calendar, label: t('socialAudit.tabAction') },
  { key: 'metrics' as TabKey, icon: Target, label: t('socialAudit.tabMetrics') },
])

function priorityStyle(p: string): string {
  const lower = String(p).toLowerCase()
  if (lower === 'high') return 'text-success bg-success/10 border-success/20'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
}

function effortStyle(e: string): string {
  const lower = String(e).toLowerCase()
  if (lower === 'high') return 'text-destructive bg-destructive/10'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10'
  return 'text-success bg-success/10'
}

function roiStyle(r: string): string {
  const lower = String(r).toLowerCase()
  if (lower === 'high') return 'text-success bg-success/10'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10'
  return 'text-blue-400 bg-blue-400/10'
}

function impactStyle(i: string): string {
  const lower = String(i).toLowerCase()
  if (lower === 'high') return 'text-success bg-success/10'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10'
  return 'text-blue-400 bg-blue-400/10'
}

function monthWeeks(month: string): WeekTask[] {
  const raw = actionPlan.value?.[month]
  return Array.isArray(raw) ? raw as WeekTask[] : []
}

const platformIconMap: Record<string, any> = {
  youtube: Activity,
  linkedin: Briefcase,
  facebook: Users,
  instagram: Eye,
  tiktok: Zap,
  x: ArrowUpRight,
  twitter: ArrowUpRight,
}

function platformIcon(name: string): any {
  const lower = name.toLowerCase()
  for (const [key, icon] of Object.entries(platformIconMap)) {
    if (lower.includes(key)) return icon
  }
  return LayoutGrid
}

const monthLabels: Record<string, string> = {
  month_1: t('socialAudit.month1'),
  month_2: t('socialAudit.month2'),
  month_3: t('socialAudit.month3'),
}

const showExportMenu = ref(false)
const exporting = ref(false)

async function handleExport(format: 'pdf' | 'pptx' | 'xlsx') {
  showExportMenu.value = false
  exporting.value = true
  const name = 'Social-Audit'
  try {
    if (format === 'pdf') await exportAuditPDF(props.data, name)
    else if (format === 'pptx') await exportAuditPPTX(props.data, name)
    else await exportAuditXLSX(props.data, name)
  } finally {
    exporting.value = false
  }
}

function closeExportMenu(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('[data-export-menu]')) showExportMenu.value = false
}
</script>

<template>
  <div class="space-y-4">
    <!-- Tab bar + Export -->
    <div class="flex items-center justify-between gap-3">
      <div class="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        :class="[
          'flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-medium border whitespace-nowrap transition',
          activeTab === tab.key
            ? 'border-primary/60 bg-primary/10 text-primary'
            : 'border-border/40 bg-white/[0.02] text-muted-foreground hover:text-foreground',
        ]"
        @click="activeTab = tab.key"
      >
        <component :is="tab.icon" class="h-3 w-3" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Export Dropdown -->
    <div class="relative shrink-0" data-export-menu>
      <button
        :disabled="exporting"
        class="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/40 bg-white/[0.02] text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition disabled:opacity-50"
        @click="showExportMenu = !showExportMenu"
      >
        <Loader2 v-if="exporting" class="h-3 w-3 animate-spin" />
        <Download v-else class="h-3 w-3" />
        {{ exporting ? t('socialAudit.exporting') : t('socialAudit.export') }}
      </button>
      <div
        v-if="showExportMenu"
        class="absolute end-0 top-full mt-1.5 z-50 min-w-[180px] rounded-lg border border-border/40 bg-[#1E1B2E] shadow-lg shadow-black/30 py-1"
      >
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
          @click="handleExport('pdf')"
        >
          <FileText class="h-3.5 w-3.5 text-red-400" />
          {{ t('socialAudit.exportPDF') }}
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
          @click="handleExport('pptx')"
        >
          <LayoutGrid class="h-3.5 w-3.5 text-orange-400" />
          {{ t('socialAudit.exportPPTX') }}
        </button>
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition"
          @click="handleExport('xlsx')"
        >
          <BarChart3 class="h-3.5 w-3.5 text-green-400" />
          {{ t('socialAudit.exportXLSX') }}
        </button>
      </div>
      <!-- Click-outside backdrop -->
      <div v-if="showExportMenu" class="fixed inset-0 z-40" @click="closeExportMenu" />
    </div>
  </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview'" class="space-y-4">
      <div class="rounded-xl border border-primary/20 bg-primary/[0.04] p-4">
        <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
          <Zap class="h-3.5 w-3.5" />
          {{ t('socialAudit.executiveSummary') }}
        </div>
        <p class="text-sm text-foreground/90 leading-relaxed">{{ executiveSummary }}</p>
      </div>

      <!-- Quick stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
          <div class="text-xl font-bold text-primary">{{ platformRecs.length }}</div>
          <div class="text-[10px] text-muted-foreground">{{ t('socialAudit.platformsCount') }}</div>
        </div>
        <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
          <div class="text-xl font-bold text-amber-400">{{ contentGaps.length }}</div>
          <div class="text-[10px] text-muted-foreground">{{ t('socialAudit.gapsCount') }}</div>
        </div>
        <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
          <div class="text-xl font-bold text-info">{{ teamMembers.length }}</div>
          <div class="text-[10px] text-muted-foreground">{{ t('socialAudit.teamRoles') }}</div>
        </div>
        <div class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center">
          <div class="text-xl font-bold text-success">90</div>
          <div class="text-[10px] text-muted-foreground">{{ t('socialAudit.dayPlan') }}</div>
        </div>
      </div>

      <!-- Top platforms quick -->
      <div v-if="platformRecs.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(rec, i) in platformRecs.filter(r => r.priority === 'high').slice(0, 3)"
          :key="i"
          class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-2"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <component :is="platformIcon(rec.platform)" class="h-4 w-4 text-primary" />
              <span class="text-sm font-semibold text-foreground">{{ rec.platform }}</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-medium" :class="priorityStyle(rec.priority)">
              {{ rec.priority }}
            </span>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed line-clamp-3">{{ rec.rationale }}</p>
        </div>
      </div>
    </div>

    <!-- Platform Recommendations Tab -->
    <div v-else-if="activeTab === 'platforms'" class="space-y-3">
      <div
        v-for="(rec, i) in platformRecs"
        :key="i"
        class="rounded-xl border border-border/30 bg-white/[0.015] overflow-hidden"
      >
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <div class="h-8 w-8 rounded-lg bg-primary/10 grid place-items-center">
                <component :is="platformIcon(rec.platform)" class="h-4 w-4 text-primary" />
              </div>
              <span class="text-sm font-semibold text-foreground">{{ rec.platform }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] px-1.5 py-0.5 rounded border font-medium" :class="priorityStyle(rec.priority)">
                {{ rec.priority }}
              </span>
            </div>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed">{{ rec.rationale }}</p>
          <div class="flex flex-wrap gap-2">
            <div class="flex items-center gap-1.5 text-[11px]">
              <Clock class="h-3 w-3 text-muted-foreground/50" />
              <span class="text-muted-foreground/50">{{ t('socialAudit.effort') }}:</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded" :class="effortStyle(rec.required_effort)">{{ rec.required_effort }}</span>
            </div>
            <div class="flex items-center gap-1.5 text-[11px]">
              <TrendingUp class="h-3 w-3 text-muted-foreground/50" />
              <span class="text-muted-foreground/50">{{ t('socialAudit.roi') }}:</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded" :class="roiStyle(rec.potential_roi)">{{ rec.potential_roi }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content Gaps Tab -->
    <div v-else-if="activeTab === 'gaps'" class="space-y-3">
      <div
        v-for="(gap, i) in contentGaps"
        :key="i"
        class="rounded-xl border border-border/30 bg-white/[0.015] overflow-hidden"
      >
        <div class="p-4 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-start gap-2.5">
              <span class="h-6 w-6 rounded-md bg-primary/15 text-primary text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">
                {{ i + 1 }}
              </span>
              <span class="text-sm font-semibold text-foreground leading-snug">{{ gap.gap }}</span>
            </div>
            <span class="text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0" :class="impactStyle(gap.impact)">
              {{ gap.impact }}
            </span>
          </div>
          <div class="ms-[34px]">
            <div class="flex items-center gap-1.5 text-[11px] text-primary/80 font-medium mb-1">
              <Lightbulb class="h-3 w-3" />
              {{ t('socialAudit.recommendation') }}
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ gap.recommendation }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Competitive Benchmarks Tab -->
    <div v-else-if="activeTab === 'benchmarks' && benchmarks" class="space-y-4">
      <!-- Posting frequency -->
      <div v-if="benchmarks.average_posting_frequency" class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-2">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Calendar class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.postingFrequency') }}
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">{{ benchmarks.average_posting_frequency }}</p>
      </div>

      <!-- Engagement rate -->
      <div v-if="benchmarks.average_engagement_rate" class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-2">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Activity class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.engagementRate') }}
        </div>
        <p class="text-xs text-muted-foreground leading-relaxed">{{ benchmarks.average_engagement_rate }}</p>
      </div>

      <!-- Common content types -->
      <div v-if="Array.isArray(benchmarks.common_content_types) && (benchmarks.common_content_types as string[]).length" class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-3">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
          <LayoutGrid class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.contentTypes') }}
        </div>
        <div class="space-y-2">
          <div
            v-for="(ct, i) in (benchmarks.common_content_types as string[])"
            :key="i"
            class="flex items-start gap-2 text-xs text-muted-foreground"
          >
            <Check class="h-3 w-3 text-success shrink-0 mt-0.5" />
            <span class="leading-relaxed">{{ ct }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Resource Plan Tab -->
    <div v-else-if="activeTab === 'resources' && resourcePlan" class="space-y-5">
      <!-- Team -->
      <div v-if="teamMembers.length">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
          <Users class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.team') }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(member, i) in teamMembers"
            :key="i"
            class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-3"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-2.5">
                <div class="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center">
                  <Briefcase class="h-3.5 w-3.5 text-primary" />
                </div>
                <span class="text-xs font-semibold text-foreground leading-snug">{{ member.role }}</span>
              </div>
              <span class="text-[10px] px-1.5 py-0.5 rounded border border-border/30 bg-white/[0.02] text-muted-foreground whitespace-nowrap">
                {{ member.time_commitment }}
              </span>
            </div>
            <div v-if="Array.isArray(member.skills_needed) && member.skills_needed.length" class="flex flex-wrap gap-1">
              <span
                v-for="(skill, si) in member.skills_needed"
                :key="si"
                class="text-[10px] px-1.5 py-0.5 rounded-full border border-border/30 bg-white/[0.02] text-muted-foreground"
              >
                {{ skill }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tools -->
      <div v-if="tools.length">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
          <Wrench class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.tools') }}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="(tool, i) in tools"
            :key="i"
            class="rounded-xl border border-border/30 bg-white/[0.015] p-4 space-y-2"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-semibold text-foreground">{{ tool.tool }}</span>
              <span v-if="tool.estimated_cost" class="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium whitespace-nowrap">
                {{ tool.estimated_cost }}
              </span>
            </div>
            <p class="text-xs text-muted-foreground leading-relaxed">{{ tool.purpose }}</p>
          </div>
        </div>
      </div>

      <!-- Budget -->
      <div v-if="budget">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
          <DollarSign class="h-3.5 w-3.5 text-primary" />
          {{ t('socialAudit.monthlyBudget') }}
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div
            v-for="(val, key) in budget"
            :key="key"
            class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center"
          >
            <div class="text-[10px] text-muted-foreground/60 mb-1">{{ key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) }}</div>
            <div class="text-sm font-bold text-primary">{{ val }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Plan Tab -->
    <div v-else-if="activeTab === 'action' && actionPlan" class="space-y-5">
      <div v-for="monthKey in ['month_1', 'month_2', 'month_3']" :key="monthKey">
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
          <div class="h-6 w-6 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground text-[10px] font-bold grid place-items-center">
            {{ monthKey === 'month_1' ? '1' : monthKey === 'month_2' ? '2' : '3' }}
          </div>
          {{ monthLabels[monthKey] ?? monthKey }}
        </div>
        <div class="space-y-3 ms-8">
          <div
            v-for="(week, i) in monthWeeks(monthKey)"
            :key="i"
            class="rounded-xl border border-border/30 bg-white/[0.015] overflow-hidden"
          >
            <!-- Week header -->
            <div class="px-4 py-2.5 bg-white/[0.02] border-b border-border/20 flex items-center gap-2">
              <CircleDot class="h-3 w-3 text-primary" />
              <span class="text-[11px] font-semibold text-foreground">{{ t('socialAudit.week') }} {{ week.week }}</span>
            </div>
            <div class="p-4 space-y-3">
              <!-- Tasks -->
              <div>
                <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5 flex items-center gap-1">
                  <Check class="h-3 w-3" /> {{ t('socialAudit.tasks') }}
                </div>
                <div class="space-y-1">
                  <div
                    v-for="(task, ti) in week.tasks"
                    :key="ti"
                    class="text-xs text-muted-foreground flex items-start gap-1.5"
                  >
                    <span class="h-1 w-1 rounded-full bg-primary/60 mt-2 shrink-0" />
                    <span class="leading-relaxed">{{ task }}</span>
                  </div>
                </div>
              </div>
              <!-- Deliverables -->
              <div>
                <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5 flex items-center gap-1">
                  <Star class="h-3 w-3" /> {{ t('socialAudit.deliverables') }}
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="(del, di) in week.deliverables"
                    :key="di"
                    class="text-[10px] px-2 py-0.5 rounded-full border border-border/30 bg-white/[0.02] text-muted-foreground"
                  >
                    {{ del }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Success Metrics Tab -->
    <div v-else-if="activeTab === 'metrics' && successMetrics" class="space-y-4">
      <div
        v-for="(periodKey, pi) in ['30_days', '60_days', '90_days']"
        :key="periodKey"
      >
        <div class="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
          <div class="h-6 w-6 rounded-md grid place-items-center text-[10px] font-bold"
            :class="pi === 0 ? 'bg-blue-500/15 text-blue-400' : pi === 1 ? 'bg-amber-400/15 text-amber-400' : 'bg-success/15 text-success'"
          >
            {{ String(pi + 1) }}
          </div>
          {{ periodKey === '30_days' ? t('socialAudit.days30') : periodKey === '60_days' ? t('socialAudit.days60') : t('socialAudit.days90') }}
        </div>
        <div class="ms-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <template v-if="successMetrics[periodKey] && typeof successMetrics[periodKey] === 'object'">
            <div
              v-for="(val, metricKey) in (successMetrics[periodKey] as Record<string, string>)"
              :key="metricKey"
              class="rounded-lg border border-border/20 bg-white/[0.01] p-3 space-y-1"
            >
              <div class="text-[10px] text-muted-foreground/50">{{ metricKey.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()) }}</div>
              <div class="text-xs text-foreground font-medium leading-relaxed">{{ val }}</div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
