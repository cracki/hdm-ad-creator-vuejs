<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Globe, BarChart3, TrendingUp, TrendingDown, Target, MessageSquare,
  Shield, Users, Award, ExternalLink, ChevronDown, ChevronRight,
  Check, X, Zap, Eye, AlertTriangle, ArrowUpRight,
} from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
}>()

const expandedCompetitors = ref<Set<number>>(new Set())

function toggleCompetitor(idx: number) {
  const s = new Set(expandedCompetitors.value)
  if (s.has(idx)) s.delete(idx)
  else s.add(idx)
  expandedCompetitors.value = s
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

const analyzeResults = computed(() => {
  const raw = props.data.analyze_results
  return Array.isArray(raw) ? raw : []
})

const positioningIdea = computed(() =>
  typeof props.data.positioning_idea === 'string' ? props.data.positioning_idea : ''
)

interface CompetitorAnalysis {
  [key: string]: unknown
  basic_info?: Record<string, unknown>
  messaging?: Record<string, unknown>
  strengths?: string[]
  weaknesses?: string[]
  positioning?: Record<string, unknown>
  target_audience?: Record<string, unknown>
  credibility?: Record<string, unknown>
  trust_score?: Record<string, unknown>
  services?: Record<string, unknown>
  content_strategy?: Record<string, unknown>
  improvement_areas?: Array<Record<string, unknown>>
  growth_opportunities?: Array<Record<string, unknown>>
  differentiation_opportunities?: Array<Record<string, unknown>>
  hybrid_quality_score?: Record<string, unknown>
  website_quality_score?: Record<string, unknown>
  tech_stack?: Record<string, unknown>
  usp_list?: unknown[]
  website_url?: string
  competitor_name?: string
}

const competitorAnalyses = computed<CompetitorAnalysis[]>(() => {
  const raw = props.data.competitor_analyses
  return Array.isArray(raw) ? raw : []
})

function getBasicInfo(c: CompetitorAnalysis) {
  return c.basic_info && typeof c.basic_info === 'object' ? c.basic_info : null
}

function getMessaging(c: CompetitorAnalysis) {
  return c.messaging && typeof c.messaging === 'object' ? c.messaging : null
}

function getPositioning(c: CompetitorAnalysis) {
  return c.positioning && typeof c.positioning === 'object' ? c.positioning : null
}

function getTargetAudience(c: CompetitorAnalysis) {
  return c.target_audience && typeof c.target_audience === 'object' ? c.target_audience : null
}

function getScoreInfo(scoreObj: Record<string, unknown> | null | undefined): { score: number; max: number; grade: string } | null {
  if (!scoreObj || typeof scoreObj !== 'object') return null
  const score = typeof scoreObj.total_score === 'number' ? scoreObj.total_score
    : typeof scoreObj.overall_score === 'number'
      ? typeof scoreObj.overall_score === 'object' ? (scoreObj.overall_score as any).parsedValue ?? scoreObj.overall_score : scoreObj.overall_score
    : typeof scoreObj.score === 'number' ? scoreObj.score
    : typeof scoreObj.credibility_score === 'number' ? scoreObj.credibility_score
    : null
  const max = typeof scoreObj.max_score === 'number' ? scoreObj.max_score
    : typeof scoreObj.max_possible_score === 'number' ? scoreObj.max_possible_score
    : typeof scoreObj.percentage === 'number' ? 100
    : typeof scoreObj.score_out_of === 'number' ? scoreObj.score_out_of
    : typeof scoreObj.score_out_of === 'object' ? (scoreObj.score_out_of as any)?.parsedValue ?? 10
    : 100
  const grade = typeof scoreObj.grade === 'string' ? scoreObj.grade
    : ''
  if (score === null) return null
  return { score, max, grade }
}

function scoreBarWidth(score: number, max: number): string {
  return `${Math.min((score / max) * 100, 100)}%`
}

function gradeColor(grade: string): string {
  const g = String(grade).toUpperCase().charAt(0)
  if (g === 'A') return 'text-success bg-success/15 border-success/20'
  if (g === 'B') return 'text-blue-400 bg-blue-400/15 border-blue-400/20'
  if (g === 'C') return 'text-amber-400 bg-amber-400/15 border-amber-400/20'
  if (g === 'D') return 'text-orange-400 bg-orange-400/15 border-orange-400/20'
  return 'text-destructive bg-destructive/15 border-destructive/20'
}

function barColor(grade: string): string {
  const g = String(grade).toUpperCase().charAt(0)
  if (g === 'A') return 'bg-success'
  if (g === 'B') return 'bg-blue-400'
  if (g === 'C') return 'bg-amber-400'
  if (g === 'D') return 'bg-orange-400'
  return 'bg-destructive/70'
}

function priorityStyle(p: string): string {
  const lower = String(p).toLowerCase()
  if (lower === 'high') return 'text-destructive bg-destructive/10 border-destructive/20'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10 border-amber-400/20'
  return 'text-blue-400 bg-blue-400/10 border-blue-400/20'
}

function effortStyle(e: string): string {
  const lower = String(e).toLowerCase()
  if (lower === 'high') return 'text-destructive bg-destructive/10'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10'
  return 'text-success bg-success/10'
}

function impactStyle(i: string): string {
  const lower = String(i).toLowerCase()
  if (lower === 'high') return 'text-success bg-success/10'
  if (lower === 'medium') return 'text-amber-400 bg-amber-400/10'
  return 'text-blue-400 bg-blue-400/10'
}

function asStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((v): v is string => typeof v === 'string')
  return []
}

function asObjectArray(val: unknown): Record<string, unknown>[] {
  if (Array.isArray(val)) return val.filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
  return []
}

function asObject(val: unknown): Record<string, unknown> | null {
  return val && typeof val === 'object' && !Array.isArray(val) ? val as Record<string, unknown> : null
}

const hasData = computed(() => Object.keys(props.data).length > 0)
</script>

<template>
  <div v-if="hasData" class="space-y-5">
    <!-- Positioning Idea -->
    <div v-if="positioningIdea" class="rounded-lg border border-primary/20 bg-primary/[0.04] p-4">
      <div class="flex items-center gap-2 text-xs font-semibold text-primary mb-2">
        <Zap class="h-3.5 w-3.5" />
        Positioning Idea
      </div>
      <p class="text-sm text-foreground/90 leading-relaxed">{{ positioningIdea }}</p>
    </div>

    <!-- Competitors Overview Grid -->
    <div v-if="analyzeResults.length">
      <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
        <Globe class="h-3.5 w-3.5 text-primary" />
        Analyzed Competitors
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(r, i) in analyzeResults"
          :key="i"
          class="rounded-lg border border-border/30 bg-overlay-subtle p-3.5 space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-foreground">{{ r.name }}</span>
            <span
              :class="r.status === 'success' ? 'text-success bg-success/10' : 'text-destructive bg-destructive/10'"
              class="text-[10px] px-1.5 py-0.5 rounded font-medium"
            >
              {{ r.status }}
            </span>
          </div>
          <a
            v-if="r.website_url"
            :href="r.website_url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[11px] text-muted-foreground/60 hover:text-primary flex items-center gap-1 transition truncate"
          >
            <ExternalLink class="h-3 w-3 shrink-0" />
            {{ r.website_url.replace(/^https?:\/\//, '') }}
          </a>
        </div>
      </div>
    </div>

    <!-- Per-Competitor Detail Cards -->
    <div v-if="competitorAnalyses.length" class="space-y-3">
      <div class="text-xs font-semibold text-foreground flex items-center gap-2">
        <BarChart3 class="h-3.5 w-3.5 text-primary" />
        Detailed Analysis
      </div>

      <div v-for="(comp, ci) in competitorAnalyses" :key="ci" class="rounded-lg border border-border/30 overflow-hidden">
        <!-- Competitor Header (always visible, clickable) -->
        <button
          @click="toggleCompetitor(ci)"
          class="w-full flex items-center justify-between p-4 hover:bg-overlay-subtle transition text-start"
        >
          <div class="flex items-center gap-3 min-w-0">
            <component :is="expandedCompetitors.has(ci) ? ChevronDown : ChevronRight" class="h-4 w-4 text-muted-foreground shrink-0" />
            <div class="min-w-0">
              <div class="text-sm font-medium text-foreground truncate">
                {{ comp.competitor_name || comp.basic_info?.name || `Competitor ${ci + 1}` }}
              </div>
              <a
                v-if="comp.website_url"
                :href="comp.website_url"
                target="_blank"
                rel="noopener noreferrer"
                class="text-[11px] text-muted-foreground/60 hover:text-primary flex items-center gap-1 transition"
                @click.stop
              >
                {{ comp.website_url.replace(/^https?:\/\//, '') }}
              </a>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <template v-if="getScoreInfo(comp.hybrid_quality_score ?? comp.website_quality_score)">
              <span
                :class="gradeColor(getScoreInfo(comp.hybrid_quality_score ?? comp.website_quality_score)!.grade)"
                class="text-[10px] font-bold px-1.5 py-0.5 rounded border"
              >
                {{ getScoreInfo(comp.hybrid_quality_score ?? comp.website_quality_score)!.grade || '?' }}
              </span>
            </template>
          </div>
        </button>

        <!-- Expanded Content -->
        <div v-if="expandedCompetitors.has(ci)" class="border-t border-border/20 p-4 space-y-5">
          <!-- Basic Info -->
          <template v-if="getBasicInfo(comp)">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Globe class="h-3 w-3 text-primary" /> Basic Info
              </div>
              <div class="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <template v-for="(val, key) in getBasicInfo(comp)" :key="String(key)">
                  <div v-if="val != null" class="text-xs flex items-start gap-2">
                    <span class="text-muted-foreground/50 shrink-0">{{ formatLabel(String(key)) }}</span>
                    <span class="text-muted-foreground">{{ val }}</span>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- Strengths & Weaknesses -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div v-if="asStringArray(comp.strengths).length">
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp class="h-3 w-3 text-success" /> Strengths
              </div>
              <div class="space-y-1">
                <div
                  v-for="(s, i) in asStringArray(comp.strengths)"
                  :key="i"
                  class="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <Check class="h-3 w-3 text-success shrink-0 mt-0.5" />
                  {{ s }}
                </div>
              </div>
            </div>
            <div v-if="asStringArray(comp.weaknesses).length">
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingDown class="h-3 w-3 text-destructive" /> Weaknesses
              </div>
              <div class="space-y-1">
                <div
                  v-for="(w, i) in asStringArray(comp.weaknesses)"
                  :key="i"
                  class="text-xs text-muted-foreground flex items-start gap-1.5"
                >
                  <X class="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                  {{ w }}
                </div>
              </div>
            </div>
          </div>

          <!-- Messaging -->
          <template v-if="getMessaging(comp)">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <MessageSquare class="h-3 w-3 text-primary" /> Messaging
              </div>
              <div class="space-y-2">
                <div v-if="getMessaging(comp)!.tone" class="flex items-center gap-2 text-xs">
                  <span class="text-muted-foreground/50">Tone</span>
                  <span class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground border border-border/20">{{ getMessaging(comp)!.tone }}</span>
                </div>
                <div v-if="getMessaging(comp)!.primary_message" class="text-xs text-muted-foreground bg-overlay-subtle rounded-lg p-3 border border-border/10 leading-relaxed">
                  {{ getMessaging(comp)!.primary_message }}
                </div>
                <div v-if="asStringArray(getMessaging(comp)!.key_themes).length" class="flex flex-wrap gap-1">
                  <span
                    v-for="(theme, i) in asStringArray(getMessaging(comp)!.key_themes)"
                    :key="i"
                    class="text-[10px] px-1.5 py-0.5 rounded-full border border-border/30 bg-overlay-subtle text-muted-foreground"
                  >
                    {{ theme }}
                  </span>
                </div>
                <div v-if="getMessaging(comp)!.vs_your_messaging" class="text-xs text-muted-foreground bg-primary/[0.03] rounded-lg p-3 border border-primary/10 leading-relaxed">
                  <span class="text-[10px] text-primary font-medium block mb-1">vs Your Brand</span>
                  {{ getMessaging(comp)!.vs_your_messaging }}
                </div>
              </div>
            </div>
          </template>

          <!-- Positioning -->
          <template v-if="getPositioning(comp)">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Target class="h-3 w-3 text-primary" /> Positioning
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
                <template v-for="(val, key) in getPositioning(comp)" :key="String(key)">
                  <div v-if="val != null && String(key) !== 'vs_your_brand' && String(key) !== 'positioning_statement'" class="text-xs flex items-start gap-2">
                    <span class="text-muted-foreground/50 shrink-0">{{ formatLabel(String(key)) }}</span>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">{{ val }}</span>
                  </div>
                </template>
              </div>
              <div v-if="getPositioning(comp)!.positioning_statement" class="text-xs text-muted-foreground bg-overlay-subtle rounded-lg p-3 border border-border/10 leading-relaxed mt-2">
                {{ getPositioning(comp)!.positioning_statement }}
              </div>
              <div v-if="getPositioning(comp)!.vs_your_brand" class="text-xs text-muted-foreground bg-primary/[0.03] rounded-lg p-3 border border-primary/10 leading-relaxed mt-2">
                <span class="text-[10px] text-primary font-medium block mb-1">vs Your Brand</span>
                {{ getPositioning(comp)!.vs_your_brand }}
              </div>
            </div>
          </template>

          <!-- Target Audience -->
          <template v-if="getTargetAudience(comp)">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Users class="h-3 w-3 text-primary" /> Target Audience
              </div>
              <div v-if="typeof getTargetAudience(comp)!.primary === 'string'" class="text-xs text-muted-foreground bg-overlay-subtle rounded-lg p-3 border border-border/10 leading-relaxed mb-2">
                {{ getTargetAudience(comp)!.primary }}
              </div>
              <template v-if="asObject(getTargetAudience(comp)!.demographics)">
                <div class="text-[11px] text-muted-foreground/60 font-medium mb-1">Demographics</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                  <template v-for="(val, key) in asObject(getTargetAudience(comp)!.demographics)" :key="String(key)">
                    <div v-if="val != null" class="text-xs flex items-start gap-2">
                      <span class="text-muted-foreground/50 shrink-0">{{ formatLabel(String(key)) }}</span>
                      <span class="text-muted-foreground">{{ typeof val === 'string' ? val : JSON.stringify(val) }}</span>
                    </div>
                  </template>
                </div>
              </template>
              <div v-if="asStringArray(getTargetAudience(comp)!.secondary).length" class="mt-2">
                <div class="text-[11px] text-muted-foreground/60 font-medium mb-1">Secondary Segments</div>
                <div class="space-y-1">
                  <div
                    v-for="(seg, i) in asStringArray(getTargetAudience(comp)!.secondary)"
                    :key="i"
                    class="text-xs text-muted-foreground ps-3 border-s-2 border-border/20"
                  >
                    {{ seg }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Quality & Trust Scores -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <template v-for="scoreKey in ['hybrid_quality_score', 'website_quality_score', 'trust_score']" :key="scoreKey">
              <template v-if="getScoreInfo(asObject(comp[scoreKey]))">
                <div class="rounded-lg border border-border/20 bg-overlay-subtle p-3">
                  <div class="text-[11px] text-muted-foreground/60 mb-2">{{ formatLabel(scoreKey) }}</div>
                  <div class="flex items-center gap-2 mb-2">
                    <div class="flex-1 h-2 rounded-full bg-overlay-medium overflow-hidden">
                      <div
                        :class="barColor(getScoreInfo(asObject(comp[scoreKey]))!.grade)"
                        class="h-full rounded-full transition-all"
                        :style="{ width: scoreBarWidth(getScoreInfo(asObject(comp[scoreKey]))!.score, getScoreInfo(asObject(comp[scoreKey]))!.max) }"
                      />
                    </div>
                    <span class="text-xs text-muted-foreground tabular-nums">{{ getScoreInfo(asObject(comp[scoreKey]))!.score }}/{{ getScoreInfo(asObject(comp[scoreKey]))!.max }}</span>
                    <span :class="gradeColor(getScoreInfo(asObject(comp[scoreKey]))!.grade)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border">{{ getScoreInfo(asObject(comp[scoreKey]))!.grade }}</span>
                  </div>
                  <template v-if="asObject(comp[scoreKey])?.breakdown && typeof asObject(comp[scoreKey])!.breakdown === 'object'">
                    <div class="space-y-1">
                      <template v-for="(bVal, bKey) in asObject(asObject(comp[scoreKey])!.breakdown)" :key="String(bKey)">
                        <template v-if="bVal && typeof bVal === 'object' && !Array.isArray(bVal)">
                          <div v-if="typeof (bVal as any).score === 'number' && typeof (bVal as any).max === 'number'" class="text-[11px] flex items-center gap-2">
                            <span class="text-muted-foreground/50 shrink-0 truncate max-w-[80px]">{{ formatLabel(String(bKey)) }}</span>
                            <div class="flex-1 h-1 rounded-full bg-overlay-medium overflow-hidden">
                              <div class="h-full rounded-full bg-primary/40" :style="{ width: `${((bVal as any).score / (bVal as any).max) * 100}%` }" />
                            </div>
                            <span class="text-muted-foreground/60 tabular-nums">{{ (bVal as any).score }}/{{ (bVal as any).max }}</span>
                          </div>
                        </template>
                      </template>
                    </div>
                  </template>
                </div>
              </template>
            </template>
          </div>

          <!-- Credibility -->
          <template v-if="asObject(comp.credibility)">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Shield class="h-3 w-3 text-primary" /> Credibility
              </div>
              <template v-if="getScoreInfo(asObject(comp.credibility))">
                <div class="flex items-center gap-2 mb-2">
                  <div class="flex-1 h-2 rounded-full bg-overlay-medium overflow-hidden">
                    <div
                      :class="barColor(getScoreInfo(asObject(comp.credibility))!.grade)"
                      class="h-full rounded-full"
                      :style="{ width: scoreBarWidth(getScoreInfo(asObject(comp.credibility))!.score, getScoreInfo(asObject(comp.credibility))!.max) }"
                    />
                  </div>
                  <span class="text-xs text-muted-foreground tabular-nums">{{ getScoreInfo(asObject(comp.credibility))!.score }}/{{ getScoreInfo(asObject(comp.credibility))!.max }}</span>
                  <span :class="gradeColor(getScoreInfo(asObject(comp.credibility))!.grade)" class="text-[10px] font-bold px-1.5 py-0.5 rounded border">{{ getScoreInfo(asObject(comp.credibility))!.grade }}</span>
                </div>
              </template>
              <template v-if="asObject(comp.credibility)?.trust_summary">
                <div class="text-xs text-muted-foreground bg-overlay-subtle rounded-lg p-3 border border-border/10 leading-relaxed">
                  <template v-if="typeof (asObject(comp.credibility)!.trust_summary as any)?.recommendation === 'string'">
                    {{ (asObject(comp.credibility)!.trust_summary as any).recommendation }}
                  </template>
                </div>
              </template>
            </div>
          </template>

          <!-- Improvement Areas -->
          <template v-if="asObjectArray(comp.improvement_areas).length">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <AlertTriangle class="h-3 w-3 text-amber-400" /> Improvement Areas
              </div>
              <div class="space-y-2">
                <div
                  v-for="(area, i) in asObjectArray(comp.improvement_areas)"
                  :key="i"
                  class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-1.5"
                >
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-medium text-foreground">{{ area.area }}</span>
                    <span
                      v-if="area.priority"
                      :class="priorityStyle(String(area.priority))"
                      class="text-[10px] px-1.5 py-0.5 rounded border font-medium"
                    >
                      {{ area.priority }}
                    </span>
                  </div>
                  <div v-if="area.recommended_action" class="text-xs text-muted-foreground leading-relaxed">
                    {{ area.recommended_action }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Growth Opportunities -->
          <template v-if="asObjectArray(comp.growth_opportunities).length">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <TrendingUp class="h-3 w-3 text-success" /> Growth Opportunities
              </div>
              <div class="space-y-2">
                <div
                  v-for="(opp, i) in asObjectArray(comp.growth_opportunities)"
                  :key="i"
                  class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-1.5"
                >
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-medium text-foreground">{{ opp.opportunity || opp.action }}</span>
                    <span v-if="opp.effort" :class="effortStyle(String(opp.effort))" class="text-[10px] px-1.5 py-0.5 rounded">{{ opp.effort }}</span>
                    <span v-if="opp.impact" :class="impactStyle(String(opp.impact))" class="text-[10px] px-1.5 py-0.5 rounded">{{ opp.impact }}</span>
                  </div>
                  <div v-if="opp.action && opp.opportunity" class="text-xs text-muted-foreground leading-relaxed">
                    {{ opp.action }}
                  </div>
                  <div v-if="opp.rationale" class="text-[11px] text-muted-foreground/60 leading-relaxed">
                    {{ opp.rationale }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Differentiation Opportunities -->
          <template v-if="asObjectArray(comp.differentiation_opportunities).length">
            <div>
              <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <Eye class="h-3 w-3 text-primary" /> Differentiation Opportunities
              </div>
              <div class="space-y-2">
                <div
                  v-for="(diff, i) in asObjectArray(comp.differentiation_opportunities)"
                  :key="i"
                  class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-1.5"
                >
                  <div class="text-xs font-medium text-primary flex items-center gap-1.5">
                    <ArrowUpRight class="h-3 w-3" />
                    {{ diff.angle }}
                  </div>
                  <div v-if="diff.rationale" class="text-xs text-muted-foreground leading-relaxed">
                    {{ diff.rationale }}
                  </div>
                  <div v-if="diff.implementation" class="text-[11px] text-muted-foreground/70 leading-relaxed bg-overlay-subtle rounded p-2 border border-border/10">
                    {{ diff.implementation }}
                  </div>
                  <div v-if="diff.competitor_weakness" class="text-[11px] text-muted-foreground/60">
                    <span class="text-[10px] text-destructive/80 font-medium">Competitor Weakness:</span> {{ diff.competitor_weakness }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Services & Content Strategy (compact) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <template v-if="asObject(comp.services)">
              <div class="rounded-lg border border-border/20 bg-overlay-subtle p-3">
                <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <Award class="h-3 w-3 text-primary" /> Services
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                  <template v-for="(val, key) in asObject(comp.services)" :key="String(key)">
                    <div v-if="val != null && !Array.isArray(val)" class="text-xs flex items-start gap-2">
                      <span class="text-muted-foreground/50 shrink-0">{{ formatLabel(String(key)) }}</span>
                      <span class="text-muted-foreground">{{ val }}</span>
                    </div>
                  </template>
                </div>
                <div v-if="asStringArray(asObject(comp.services)!.services_list).length" class="flex flex-wrap gap-1 mt-2">
                  <span v-for="(s, i) in asStringArray(asObject(comp.services)!.services_list)" :key="i" class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground">
                    {{ s }}
                  </span>
                </div>
              </div>
            </template>
            <template v-if="asObject(comp.content_strategy)">
              <div class="rounded-lg border border-border/20 bg-overlay-subtle p-3">
                <div class="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <MessageSquare class="h-3 w-3 text-primary" /> Content Strategy
                </div>
                <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                  <template v-for="(val, key) in asObject(comp.content_strategy)" :key="String(key)">
                    <div v-if="val != null && !Array.isArray(val) && typeof val !== 'boolean'" class="text-xs flex items-start gap-2">
                      <span class="text-muted-foreground/50 shrink-0">{{ formatLabel(String(key)) }}</span>
                      <span class="text-muted-foreground">{{ val }}</span>
                    </div>
                    <div v-else-if="typeof val === 'boolean'" class="text-xs flex items-center gap-1.5">
                      <component :is="val ? Check : X" class="h-3 w-3" :class="val ? 'text-success' : 'text-muted-foreground/40'" />
                      <span class="text-muted-foreground/50">{{ formatLabel(String(key)) }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
