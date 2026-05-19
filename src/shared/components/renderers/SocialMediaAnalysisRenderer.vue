<script setup lang="ts">
import { computed } from 'vue'
import { exportCsv } from '@/shared/utils/csv'
import {
  FileText, Users, Lightbulb, Target, Globe,
  Zap, TrendingUp, MessageSquare, Award,
  AlertTriangle, Video, PlayCircle, Film, Radio,
  LayoutGrid, Megaphone, Settings2, BookOpen, Calendar,
  DollarSign, Share2, Clock, Eye, ThumbsUp, Star,
  PenTool, Layers, ListChecks, ChevronRight,
  Download, Clapperboard,
} from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
}>()

interface Section {
  key: string
  label: string
  icon: any
  value: unknown
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/^\w/, c => c.toUpperCase())
}

const SECTION_ICONS: Record<string, any> = {
  video_seo: Target,
  video_ideas: Video,
  growth_strategy: TrendingUp,
  shorts_strategy: Film,
  content_strategy: BookOpen,
  engagement_tactics: ThumbsUp,
  channel_optimization: Settings2,
  ad_strategy: Megaphone,
  page_strategy: LayoutGrid,
  group_strategy: Users,
  community_management: MessageSquare,
  company_page: Globe,
  lead_generation: Target,
  content_types: Layers,
  employee_advocacy: Megaphone,
  thought_leadership: Star,
  monetization: DollarSign,
  cross_promotion: Share2,
  watch_time_optimization: Clock,
  subscriber_growth_tactics: TrendingUp,
  content_pillars: Target,
  upload_frequency: Calendar,
  optimal_video_length: Clock,
  primary_content_types: Layers,
  content_mix: LayoutGrid,
  posting_schedule: Calendar,
  page_optimization: Settings2,
  content_themes: BookOpen,
  posting_frequency: Calendar,
  lead_magnets: Star,
  ad_targeting: Target,
  conversion_path: ChevronRight,
  topics: Lightbulb,
  article_ideas: PenTool,
  speaking_opportunities: Radio,
  guidelines: BookOpen,
  content_to_share: Share2,
  recognition_strategy: Award,
  audience_segments: Users,
  budget_allocation: DollarSign,
  campaign_objectives: Target,
  creative_guidelines: PenTool,
  using_features: Zap,
  call_to_action_button: Zap,
  about_section: FileText,
  channel_name_suggestion: Star,
  channel_keywords: Target,
  featured_channels: Eye,
  playlists: ListChecks,
  shorts: Film,
  long_form: PlayCircle,
  best_posting_times: Clock,
  trending_formats: TrendingUp,
  content_ideas: Lightbulb,
  tags_strategy: Target,
  title_templates: FileText,
  description_structure: FileText,
  keyword_research_tips: Lightbulb,
  thumbnail_best_practices: Eye,
}

function pickSectionIcon(key: string): any {
  const lower = key.toLowerCase()
  for (const [pattern, icon] of Object.entries(SECTION_ICONS)) {
    if (lower.includes(pattern)) return icon
  }
  return FileText
}

function isPrimitive(val: unknown): boolean {
  return val === null || val === undefined || typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean'
}

function isStringArray(val: unknown): boolean {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'string'
}

function isObjectArray(val: unknown): boolean {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null
}

function isObject(val: unknown): boolean {
  return val !== null && typeof val === 'object' && !Array.isArray(val)
}

// Extract only the `analysis` object — skip handler, platform, profile_url
const analysisSections = computed<Section[]>(() => {
  const d = props.data
  if (!d) return []

  let analysis: Record<string, unknown> | null = null

  // data is the full profile object with analysis_data wrapper
  if (d.analysis_data && typeof d.analysis_data === 'object') {
    const ad = d.analysis_data as Record<string, unknown>
    if (ad.analysis && typeof ad.analysis === 'object') {
      analysis = ad.analysis as Record<string, unknown>
    }
  }
  // data IS the analysis_data object (has 'analysis' key directly)
  else if (d.analysis && typeof d.analysis === 'object') {
    analysis = d.analysis as Record<string, unknown>
  }

  if (!analysis) analysis = d

  return Object.entries(analysis)
    .filter(([k, v]) => v !== null && v !== undefined && k !== 'handler' && k !== 'platform' && k !== 'profile_url')
    .map(([key, value]) => ({
      key,
      label: formatLabel(key),
      icon: pickSectionIcon(key),
      value,
    }))
})

function getObjectTitle(obj: Record<string, unknown>): string | null {
  for (const key of ['name', 'title', 'persona_name', 'action', 'heading', 'label', 'segment_name', 'theme', 'format', 'hook', 'concept', 'group_name', 'rationale']) {
    if (typeof obj[key] === 'string' && (obj[key] as string).length > 0) return obj[key] as string
  }
  return null
}

function renderSubContent(obj: Record<string, unknown>): { label: string; value: unknown; isTags: boolean }[] {
  const result: { label: string; value: unknown; isTags: boolean }[] = []
  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined) continue
    if (k === 'name' || k === 'title' || k === 'segment_name' || k === 'theme' || k === 'hook' || k === 'concept') continue
    if (isPrimitive(v)) {
      result.push({ label: formatLabel(k), value: v, isTags: false })
    } else if (isStringArray(v)) {
      result.push({ label: formatLabel(k), value: v, isTags: true })
    }
  }
  return result
}

// --- CSV export for idea sections ---
function isVideoIdeaSection(key: string): boolean {
  const lower = key.toLowerCase()
  return lower.includes('video_idea') || lower.includes('content_idea') || lower.includes('shorts') && lower.includes('idea')
}

function exportIdeasCsv(sectionKey: string, items: Record<string, unknown>[]) {
  const flatRows = items.map(obj => {
    const row: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (isStringArray(v)) row[formatLabel(k)] = (v as string[]).join('; ')
      else if (isObject(v)) row[formatLabel(k)] = JSON.stringify(v)
      else if (v !== null && v !== undefined) row[formatLabel(k)] = v
    }
    return row
  })

  if (flatRows.length === 0) return
  const cols = Object.keys(flatRows[0]).map(k => ({ key: k as keyof typeof flatRows[number], header: k }))
  exportCsv(flatRows, `${sectionKey}-ideas`, cols)
}
</script>

<template>
  <!-- Error state -->
  <div v-if="data?.error" class="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center space-y-2">
    <AlertTriangle class="h-5 w-5 text-destructive mx-auto" />
    <div class="text-sm text-destructive/80">{{ data.error }}</div>
  </div>

  <!-- Analysis sections — all stacked vertically -->
  <div v-else-if="analysisSections.length" class="space-y-6">
    <div v-for="sec in analysisSections" :key="sec.key">

      <!-- Section header -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-2 text-sm font-semibold text-foreground">
          <component :is="sec.icon" class="h-4 w-4 text-primary shrink-0" />
          {{ sec.label }}
        </div>
        <!-- CSV export button for idea sections -->
        <button
          v-if="isVideoIdeaSection(sec.key) && isObjectArray(sec.value)"
          @click="exportIdeasCsv(sec.key, sec.value as Record<string, unknown>[])"
          class="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border/40 text-[11px] font-medium text-muted-foreground hover:bg-overlay-subtle transition"
        >
          <Download class="h-3 w-3" /> CSV
        </button>
      </div>

      <!-- CASE 1: String array → cards -->
      <div v-if="isStringArray(sec.value)" class="space-y-2">
        <div
          v-for="(item, i) in (sec.value as string[])"
          :key="i"
          class="rounded-lg border border-border/30 bg-overlay-subtle p-3 text-sm text-muted-foreground leading-relaxed"
        >
          {{ item }}
        </div>
      </div>

      <!-- CASE 2: Video ideas → 2-col video cards on desktop -->
      <div v-else-if="isVideoIdeaSection(sec.key) && isObjectArray(sec.value)" class="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div
          v-for="(obj, i) in (sec.value as Record<string, unknown>[])"
          :key="i"
          class="rounded-xl border border-border/30 bg-overlay-subtle overflow-hidden group"
        >
          <!-- Video-style top bar -->
          <div class="h-1.5 bg-gradient-to-r from-red-500/40 via-red-500/20 to-transparent" />
          <div class="p-4 space-y-3">
            <!-- Number badge + title -->
            <div class="flex items-start gap-2.5">
              <span class="h-7 w-7 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">
                {{ i + 1 }}
              </span>
              <span class="text-sm font-semibold text-foreground leading-snug">{{ getObjectTitle(obj) ?? `Idea ${i + 1}` }}</span>
            </div>

            <!-- Format / length / concept chips -->
            <div class="flex flex-wrap gap-1.5 ms-[38px]">
              <template v-for="[k, v] in Object.entries(obj)" :key="k">
                <span
                  v-if="isPrimitive(v) && k !== 'name' && k !== 'title' && k !== 'segment_name'"
                  class="text-[11px] px-2 py-0.5 rounded-md bg-overlay-subtle border border-border/20 text-muted-foreground"
                >
                  <span class="text-muted-foreground/50">{{ formatLabel(k) }}:</span> {{ String(v) }}
                </span>
              </template>
            </div>

            <!-- Sub-fields -->
            <div class="ms-[38px] space-y-3">
              <template v-for="[k, v] in Object.entries(obj)" :key="k">
                <!-- Key points -->
                <div v-if="isStringArray(v) && k === 'key_points'">
                  <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ formatLabel(k) }}</div>
                  <ol class="space-y-1">
                    <li
                      v-for="(pt, pi) in (v as string[])"
                      :key="pi"
                      class="text-xs text-muted-foreground flex items-start gap-1.5"
                    >
                      <span class="text-primary/50 mt-1 shrink-0">{{ pi + 1 }}.</span>
                      {{ pt }}
                    </li>
                  </ol>
                </div>
                <!-- Target keywords as tags -->
                <div v-else-if="isStringArray(v) && k === 'target_keywords'">
                  <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ formatLabel(k) }}</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(tag, ti) in (v as string[])"
                      :key="ti"
                      class="text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-overlay-subtle text-muted-foreground"
                    >{{ tag }}</span>
                  </div>
                </div>
                <!-- Other string arrays -->
                <div v-else-if="isStringArray(v)">
                  <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ formatLabel(k) }}</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(tag, ti) in (v as string[])"
                      :key="ti"
                      class="text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-overlay-subtle text-muted-foreground"
                    >{{ tag }}</span>
                  </div>
                </div>
                <!-- Thumbnail concept -->
                <div v-else-if="k === 'thumbnail_concept' && typeof v === 'string'" class="rounded-lg border border-border/20 bg-overlay-subtle p-2.5 flex items-start gap-2">
                  <Clapperboard class="h-3.5 w-3.5 text-red-400/60 shrink-0 mt-0.5" />
                  <div>
                    <div class="text-[11px] text-muted-foreground/50 mb-0.5">{{ formatLabel(k) }}</div>
                    <div class="text-xs text-muted-foreground leading-relaxed">{{ v }}</div>
                  </div>
                </div>
                <!-- Nested object -->
                <div v-else-if="isObject(v) && k !== 'demographics'" class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-2">
                  <div v-if="getObjectTitle(v as Record<string, unknown>)" class="text-xs font-medium text-foreground">{{ getObjectTitle(v as Record<string, unknown>) }}</div>
                  <template v-for="sub in renderSubContent(v as Record<string, unknown>)" :key="sub.label">
                    <div v-if="!sub.isTags" class="text-xs text-muted-foreground flex items-start gap-2">
                      <span class="text-muted-foreground/50 min-w-[90px] shrink-0">{{ sub.label }}</span>
                      <span>{{ String(sub.value) }}</span>
                    </div>
                    <div v-else class="text-xs">
                      <div class="text-muted-foreground/50 mb-1">{{ sub.label }}</div>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="(tag, ti) in (sub.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tag }}</span>
                      </div>
                    </div>
                  </template>
                </div>
                <!-- Demographics grid -->
                <div v-else-if="k === 'demographics' && isObject(v)" class="rounded-lg border border-border/20 bg-overlay-subtle p-3">
                  <div class="text-xs font-medium text-foreground mb-2">{{ formatLabel(k) }}</div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <template v-for="[dk, dv] in Object.entries(v as Record<string, unknown>)" :key="dk">
                      <div class="text-[11px]">
                        <div class="text-muted-foreground/50 mb-0.5">{{ formatLabel(dk) }}</div>
                        <div class="text-muted-foreground">{{ String(dv) }}</div>
                      </div>
                    </template>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- CASE 3: Generic object array → numbered cards -->
      <div v-else-if="isObjectArray(sec.value)" class="space-y-3">
        <div
          v-for="(obj, i) in (sec.value as Record<string, unknown>[])"
          :key="i"
          class="rounded-xl border border-border/30 bg-overlay-subtle overflow-hidden"
        >
          <div class="p-4 space-y-3">
            <div v-if="getObjectTitle(obj)" class="flex items-start gap-2">
              <span class="h-6 w-6 rounded-md bg-primary/15 text-primary text-[11px] font-bold grid place-items-center shrink-0 mt-0.5">{{ i + 1 }}</span>
              <span class="text-sm font-semibold text-foreground leading-snug">{{ getObjectTitle(obj) }}</span>
            </div>
            <div class="flex flex-wrap gap-1.5" :class="getObjectTitle(obj) ? 'ms-8' : ''">
              <template v-for="[k, v] in Object.entries(obj)" :key="k">
                <span
                  v-if="isPrimitive(v) && k !== 'name' && k !== 'title' && k !== 'segment_name'"
                  class="text-[11px] px-2 py-0.5 rounded-md bg-overlay-subtle border border-border/20 text-muted-foreground"
                >
                  <span class="text-muted-foreground/50">{{ formatLabel(k) }}:</span> {{ String(v) }}
                </span>
              </template>
            </div>
            <div :class="getObjectTitle(obj) ? 'ms-8' : ''" class="space-y-3">
              <template v-for="[k, v] in Object.entries(obj)" :key="k">
                <div v-if="isStringArray(v)">
                  <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ formatLabel(k) }}</div>
                  <div class="flex flex-wrap gap-1">
                    <span
                      v-for="(tag, ti) in (v as string[])"
                      :key="ti"
                      class="text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-overlay-subtle text-muted-foreground"
                    >{{ tag }}</span>
                  </div>
                </div>
                <div v-else-if="isObject(v) && k !== 'demographics' && k !== 'thumbnail_concept'" class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-2">
                  <div v-if="getObjectTitle(v as Record<string, unknown>)" class="text-xs font-medium text-foreground">{{ getObjectTitle(v as Record<string, unknown>) }}</div>
                  <template v-for="sub in renderSubContent(v as Record<string, unknown>)" :key="sub.label">
                    <div v-if="!sub.isTags" class="text-xs text-muted-foreground flex items-start gap-2">
                      <span class="text-muted-foreground/50 min-w-[90px] shrink-0">{{ sub.label }}</span>
                      <span>{{ String(sub.value) }}</span>
                    </div>
                    <div v-else class="text-xs">
                      <div class="text-muted-foreground/50 mb-1">{{ sub.label }}</div>
                      <div class="flex flex-wrap gap-1">
                        <span v-for="(tag, ti) in (sub.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tag }}</span>
                      </div>
                    </div>
                  </template>
                </div>
                <div v-else-if="k === 'demographics' && isObject(v)" class="rounded-lg border border-border/20 bg-overlay-subtle p-3">
                  <div class="text-xs font-medium text-foreground mb-2">{{ formatLabel(k) }}</div>
                  <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <template v-for="[dk, dv] in Object.entries(v as Record<string, unknown>)" :key="dk">
                      <div class="text-[11px]">
                        <div class="text-muted-foreground/50 mb-0.5">{{ formatLabel(dk) }}</div>
                        <div class="text-muted-foreground">{{ String(dv) }}</div>
                      </div>
                    </template>
                  </div>
                </div>
                <div v-else-if="k === 'thumbnail_concept' && typeof v === 'string'" class="rounded-lg border border-border/20 bg-overlay-subtle p-3 flex items-start gap-2">
                  <Eye class="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div class="text-[11px] text-muted-foreground/50 mb-0.5">{{ formatLabel(k) }}</div>
                    <div class="text-xs text-muted-foreground leading-relaxed">{{ v }}</div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- CASE 4: Nested object → key-value pairs -->
      <div v-else-if="isObject(sec.value)" class="space-y-3">
        <template v-for="[k, v] in Object.entries(sec.value as Record<string, unknown>)" :key="k">
          <div v-if="typeof v === 'string'" class="text-xs text-muted-foreground flex items-start gap-2">
            <span class="text-muted-foreground/50 min-w-[120px] shrink-0">{{ formatLabel(k) }}</span>
            <span class="leading-relaxed">{{ v }}</span>
          </div>
          <div v-else-if="typeof v === 'number'" class="text-xs text-muted-foreground flex items-center gap-2">
            <span class="text-muted-foreground/50 min-w-[120px] shrink-0">{{ formatLabel(k) }}</span>
            <span class="font-medium text-foreground">{{ v }}</span>
          </div>
          <div v-else-if="typeof v === 'boolean'" class="text-xs text-muted-foreground flex items-center gap-2">
            <span class="text-muted-foreground/50 min-w-[120px] shrink-0">{{ formatLabel(k) }}</span>
            <span>{{ v ? 'Yes' : 'No' }}</span>
          </div>
          <div v-else-if="isStringArray(v)">
            <div class="text-[11px] text-muted-foreground/60 font-medium mb-1.5">{{ formatLabel(k) }}</div>
            <div v-if="(v as string[]).some(s => s.length > 60)" class="space-y-1">
              <div
                v-for="(item, i) in (v as string[])"
                :key="i"
                class="text-xs text-muted-foreground flex items-start gap-2 leading-relaxed"
              >
                <span class="h-1 w-1 rounded-full bg-primary/60 mt-2 shrink-0" />
                {{ item }}
              </div>
            </div>
            <div v-else class="flex flex-wrap gap-1.5">
              <span
                v-for="(tag, ti) in (v as string[])"
                :key="ti"
                class="text-[11px] px-2 py-0.5 rounded-full border border-border/40 bg-overlay-subtle text-muted-foreground"
              >{{ tag }}</span>
            </div>
          </div>
          <div v-else-if="isObjectArray(v)" class="space-y-2">
            <div class="text-[11px] text-muted-foreground/60 font-medium mb-1">{{ formatLabel(k) }}</div>
            <div
              v-for="(obj, i) in (v as Record<string, unknown>[])"
              :key="i"
              class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-2"
            >
              <div v-if="getObjectTitle(obj)" class="text-xs font-semibold text-foreground">{{ getObjectTitle(obj) }}</div>
              <template v-for="sub in renderSubContent(obj)" :key="sub.label">
                <div v-if="!sub.isTags" class="text-[11px] text-muted-foreground flex items-start gap-2">
                  <span class="text-muted-foreground/50 min-w-[80px] shrink-0">{{ sub.label }}</span>
                  <span>{{ String(sub.value) }}</span>
                </div>
                <div v-else class="text-[11px]">
                  <div class="text-muted-foreground/50 mb-0.5">{{ sub.label }}</div>
                  <div class="flex flex-wrap gap-1">
                    <span v-for="(tag, ti) in (sub.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tag }}</span>
                  </div>
                </div>
              </template>
            </div>
          </div>
          <div v-else-if="isObject(v)" class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-2">
            <div class="text-[11px] text-muted-foreground/60 font-medium mb-1">{{ formatLabel(k) }}</div>
            <template v-for="sub in renderSubContent(v as Record<string, unknown>)" :key="sub.label">
              <div v-if="!sub.isTags" class="text-[11px] text-muted-foreground flex items-start gap-2">
                <span class="text-muted-foreground/50 min-w-[100px] shrink-0">{{ sub.label }}</span>
                <span>{{ String(sub.value) }}</span>
              </div>
              <div v-else class="text-[11px]">
                <div class="text-muted-foreground/50 mb-0.5">{{ sub.label }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="(tag, ti) in (sub.value as string[])" :key="ti" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ tag }}</span>
                </div>
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- CASE 5: Primitive -->
      <div v-else class="text-sm text-muted-foreground">
        {{ String(sec.value) }}
      </div>
    </div>
  </div>

  <!-- No data -->
  <div v-else class="text-xs text-muted-foreground/50 py-4 text-center">—</div>
</template>
