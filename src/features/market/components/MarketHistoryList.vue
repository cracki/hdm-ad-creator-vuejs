<script setup lang="ts">
import { computed } from 'vue'
import { ChevronRight, History } from 'lucide-vue-next'
import SkeletonLoader from '@/shared/components/SkeletonLoader.vue'
import { useI18n } from '@/shared/utils/i18n'
import type { ContentIntelligenceRun } from '../types'

const props = withDefaults(defineProps<{
  runs: ContentIntelligenceRun[]
  loading: boolean
  featureKey: string
}>(), {
  runs: () => [],
})

defineEmits<{
  select: [run: ContentIntelligenceRun]
}>()

const { t } = useI18n()

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'completed': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-success/10 text-success'
    case 'failed': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-destructive/10 text-destructive'
    case 'running': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-info/10 text-info'
    default: return 'text-[11px] font-medium px-2 py-1 rounded-md bg-overlay-subtle text-muted-foreground'
  }
}

function isClickable(run: ContentIntelligenceRun): boolean {
  return run.status === 'completed'
}

function runSummary(run: ContentIntelligenceRun): string {
  const s = run.summary
  if (!s || typeof s !== 'object') return ''
  const parts: string[] = []
  if (s.gaps_found) parts.push(t('market.history.gapsSummary', { count: s.gaps_found }))
  if (s.content_ideas) parts.push(t('market.history.matrixSummary', { count: s.content_ideas }))
  if (s.top_performers_analyzed) parts.push(t('market.history.topSummary', { count: s.top_performers_analyzed }))
  if (s.total_opportunities) parts.push(t('market.history.intelSummary'))
  return parts.join(' · ')
}
</script>

<template>
  <section>
    <h3 :data-loc="`${featureKey}.history-header`" class="text-sm font-semibold mb-3 flex items-center gap-1.5">
      <History class="h-4 w-4 text-muted-foreground" />
      {{ t('market.history.title') }}
    </h3>

    <SkeletonLoader v-if="loading" variant="row" :count="3" />

    <div v-else-if="!runs?.length" class="surface-card p-6 text-center">
      <History class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm text-muted-foreground">{{ t('market.history.empty') }}</div>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="run in runs"
        :key="run.content_intelligence_run_uuid"
        :data-loc="`${featureKey}.history-item`"
        class="surface-card p-4 flex items-center gap-3 sm:gap-4 transition"
        :class="isClickable(run) ? 'cursor-pointer hover:border-primary/40' : 'opacity-50 pointer-events-none'"
        @click="isClickable(run) && $emit('select', run)"
      >
        <span :class="statusBadgeClass(run.status)">{{ run.status }}</span>

        <div class="flex-1 min-w-0">
          <div class="text-sm font-medium truncate">
            {{ run.industry }}
            <span v-if="run.location" class="text-muted-foreground">· {{ run.location }}</span>
          </div>
          <div class="text-[11px] text-muted-foreground mt-0.5">
            {{ formatDate(run.created_at) }}
            <span v-if="runSummary(run)"> · {{ runSummary(run) }}</span>
          </div>
        </div>

        <ChevronRight class="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  </section>
</template>
