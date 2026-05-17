<script setup lang="ts">
import { computed } from 'vue'
import { Search, AlertTriangle, Lightbulb, ExternalLink, HelpCircle } from 'lucide-vue-next'
import type { ContentGapsResponse, ContentGapItem } from '@/features/market/types'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: ContentGapsResponse | Record<string, unknown>
}>()

const result = computed(() => props.data as ContentGapsResponse)
const gaps = computed(() => result.value?.content_gaps ?? [])
const recommendation = computed(() => result.value?.recommendation)

function scoreColor(score: number): string {
  if (score >= 6) return 'text-success'
  if (score >= 3) return 'text-amber-400'
  return 'text-muted-foreground'
}

function scoreBarWidth(score: number): string {
  return `${Math.min(score * 10, 100)}%`
}

function scoreLabel(score: number): string {
  if (score >= 6) return t('gaps.high')
  if (score >= 3) return t('gaps.medium')
  return t('gaps.low')
}

function contentTypeName(type: string): string {
  const map: Record<string, string> = {
    long_form_guide: 'Long-form Guide',
    comparison_article: 'Comparison Article',
    pricing_breakdown: 'Pricing Breakdown',
    faq_page: 'FAQ Page',
    educational_blog: 'Educational Blog',
  }
  return map[type] ?? type
}
</script>

<template>
  <div v-if="gaps.length || recommendation" class="space-y-4">
    <!-- Recommendation banner -->
    <div v-if="recommendation" class="surface-card p-3.5 flex items-start gap-2.5">
      <Lightbulb class="h-4 w-4 text-primary shrink-0 mt-0.5" />
      <div class="text-xs text-muted-foreground leading-relaxed">{{ recommendation }}</div>
    </div>

    <!-- Gap count -->
    <div class="text-xs text-muted-foreground">
      {{ t('gaps.found') }} <span class="font-semibold text-foreground">{{ gaps.length }}</span> {{ t('gaps.gapsLabel') }}
    </div>

    <!-- Gap cards -->
    <div class="space-y-3">
      <div
        v-for="(gap, idx) in gaps"
        :key="idx"
        class="rounded-lg border border-border/30 bg-white/[0.015] p-4 space-y-3"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-2.5 min-w-0">
            <span class="shrink-0 h-6 w-6 rounded bg-[image:var(--gradient-brand)] text-primary-foreground text-[10px] font-bold grid place-items-center">
              {{ idx + 1 }}
            </span>
            <div class="min-w-0">
              <div class="text-sm font-medium text-foreground leading-snug">{{ gap.topic }}</div>
              <div v-if="gap.suggested_content_type" class="mt-1">
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">
                  {{ contentTypeName(gap.suggested_content_type) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Opportunity score -->
          <div class="shrink-0 text-center space-y-1">
            <div :class="['text-lg font-bold', scoreColor(gap.opportunity_score)]">{{ gap.opportunity_score }}</div>
            <div class="w-14 h-1 rounded-full bg-white/5 overflow-hidden">
              <div class="h-full rounded-full bg-[image:var(--gradient-brand)]" :style="{ width: scoreBarWidth(gap.opportunity_score) }" />
            </div>
            <div class="text-[10px] text-muted-foreground/60">{{ scoreLabel(gap.opportunity_score) }}</div>
          </div>
        </div>

        <!-- Reason -->
        <div class="flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle class="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
          <span>{{ gap.reason }}</span>
        </div>

        <!-- Top current results -->
        <div v-if="gap.top_current_results?.length" class="space-y-1 ps-4">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('gaps.currentResults') }}</div>
          <div
            v-for="(r, rIdx) in gap.top_current_results.slice(0, 3)"
            :key="rIdx"
            class="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <ExternalLink class="h-2.5 w-2.5 shrink-0" />
            <span class="truncate">{{ r.title }}</span>
          </div>
        </div>

        <!-- People also ask -->
        <div v-if="gap.people_also_ask?.length" class="space-y-1 ps-4">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('gaps.peopleAsk') }}</div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(q, qIdx) in gap.people_also_ask"
              :key="qIdx"
              class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.03] text-muted-foreground flex items-center gap-1"
            >
              <HelpCircle class="h-2.5 w-2.5" /> {{ q }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AnalysisPayloadRenderer v-else-if="Object.keys(data).length" :data="data" />
  <div v-else class="text-xs text-muted-foreground/50 py-2">{{ t('analysis.noData') }}</div>
</template>
