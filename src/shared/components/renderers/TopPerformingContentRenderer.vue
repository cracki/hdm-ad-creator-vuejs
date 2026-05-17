<script setup lang="ts">
import { computed } from 'vue'
import { Globe, BarChart3, TrendingUp, Lightbulb, CheckCircle2 } from 'lucide-vue-next'
import type { TopPerformingContentResponse } from '@/features/market/types'
import AnalysisPayloadRenderer from '@/shared/components/renderers/AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: TopPerformingContentResponse | Record<string, unknown>
}>()

const result = computed(() => props.data as TopPerformingContentResponse)
const performers = computed(() => result.value?.top_performers ?? [])
const patterns = computed(() => result.value?.common_patterns)
const actionItems = computed(() => result.value?.action_items ?? [])

const contentTypeColors: Record<string, string> = {
  video: 'bg-destructive/10 text-destructive',
  guide: 'bg-info/10 text-info',
  tips: 'bg-amber-500/10 text-amber-400',
  review: 'bg-success/10 text-success',
  case_study: 'bg-purple-500/10 text-purple-400',
  article: 'bg-white/5 text-muted-foreground',
}

function getTypeClass(type: string): string {
  return contentTypeColors[type] ?? contentTypeColors.article
}
</script>

<template>
  <div v-if="performers.length || patterns || actionItems.length" class="space-y-6">
    <!-- Common Patterns -->
    <div v-if="patterns" class="surface-card p-4 space-y-3">
      <div class="text-xs font-semibold flex items-center gap-1.5">
        <BarChart3 class="h-3.5 w-3.5 text-primary" /> {{ t('topContent.patterns') }}
      </div>
      <div class="grid sm:grid-cols-3 gap-3">
        <div v-if="patterns.most_common_type" class="space-y-1">
          <div class="text-[11px] text-muted-foreground">{{ t('topContent.commonType') }}</div>
          <div class="text-sm font-medium capitalize">{{ patterns.most_common_type[0] }}</div>
          <div class="text-[11px] text-muted-foreground/60">({{ patterns.most_common_type[1] }} {{ t('topContent.occurrences') }})</div>
        </div>
        <div class="space-y-1">
          <div class="text-[11px] text-muted-foreground">{{ t('topContent.avgPosition') }}</div>
          <div class="text-sm font-medium">#{{ patterns.average_position?.toFixed(1) }}</div>
        </div>
        <div v-if="patterns.dominant_domains?.length" class="space-y-1">
          <div class="text-[11px] text-muted-foreground">{{ t('topContent.topDomains') }}</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="d in patterns.dominant_domains.slice(0, 4)" :key="d" class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04] text-muted-foreground">
              {{ d }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top Performers List -->
    <div>
      <div class="text-xs font-semibold mb-3 flex items-center gap-1.5">
        <TrendingUp class="h-3.5 w-3.5 text-primary" />
        {{ t('topContent.topPerformers') }} ({{ performers.length }})
      </div>
      <div class="space-y-2.5">
        <div
          v-for="(item, idx) in performers"
          :key="idx"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-3.5 space-y-2.5"
        >
          <div class="flex items-start gap-3">
            <span class="shrink-0 h-6 w-6 rounded bg-[image:var(--gradient-brand)] text-primary-foreground text-[10px] font-bold grid place-items-center">
              {{ idx + 1 }}
            </span>
            <div class="min-w-0 flex-1 space-y-1.5">
              <div class="flex items-center gap-2 flex-wrap">
                <span :class="['text-[11px] px-1.5 py-0.5 rounded capitalize font-medium', getTypeClass(item.content_type)]">
                  {{ item.content_type }}
                </span>
                <span v-if="item.position" class="text-[10px] text-muted-foreground/60">#{{ item.position }}</span>
                <span v-if="item.domain" class="text-[10px] text-muted-foreground/60 flex items-center gap-0.5">
                  <Globe class="h-2.5 w-2.5" /> {{ item.domain }}
                </span>
              </div>
              <div class="text-sm font-medium text-foreground leading-snug">{{ item.title }}</div>
              <div v-if="item.snippet" class="text-xs text-muted-foreground leading-relaxed line-clamp-2">{{ item.snippet }}</div>
            </div>
          </div>

          <div class="grid sm:grid-cols-2 gap-2 ps-9">
            <div v-if="item.why_it_ranks" class="space-y-0.5">
              <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('topContent.whyRanks') }}</div>
              <div class="text-xs text-muted-foreground">{{ item.why_it_ranks }}</div>
            </div>
            <div v-if="item.your_opportunity" class="space-y-0.5">
              <div class="text-[10px] uppercase tracking-wider text-success/80">{{ t('topContent.yourOpportunity') }}</div>
              <div class="text-xs text-muted-foreground">{{ item.your_opportunity }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Items -->
    <div v-if="actionItems.length" class="surface-card p-4 space-y-2.5">
      <div class="text-xs font-semibold flex items-center gap-1.5">
        <Lightbulb class="h-3.5 w-3.5 text-primary" /> {{ t('topContent.actionItems') }}
      </div>
      <ul class="space-y-1.5">
        <li
          v-for="(item, idx) in actionItems"
          :key="idx"
          class="flex items-start gap-2 text-xs text-muted-foreground"
        >
          <CheckCircle2 class="h-3 w-3 text-success/70 mt-0.5 shrink-0" />
          <span>{{ item }}</span>
        </li>
      </ul>
    </div>
  </div>

  <AnalysisPayloadRenderer v-else-if="Object.keys(data).length" :data="(data as any)" />
  <div v-else class="text-xs text-muted-foreground/50 py-2">{{ t('analysis.noData') }}</div>
</template>
