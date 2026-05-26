<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight, History } from 'lucide-vue-next'
import SkeletonLoader from '@/shared/components/SkeletonLoader.vue'
import { useI18n } from '@/shared/utils/i18n'
import type { MarketRunSummary, MarketRunStatus } from '../types'

const props = withDefaults(defineProps<{
  runs: MarketRunSummary[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  featureKey: string
}>(), {
  runs: () => [],
  total: 0,
  page: 1,
  pageSize: 10,
})

defineEmits<{
  select: [run: MarketRunSummary]
  'update:page': [page: number]
}>()

const { t } = useI18n()

const totalPages = computed(() => Math.ceil(props.total / props.pageSize))

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function statusBadgeClass(status: MarketRunStatus): string {
  switch (status) {
    case 'completed': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-success/10 text-success'
    case 'failed': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-destructive/10 text-destructive'
    case 'running': return 'text-[11px] font-medium px-2 py-1 rounded-md bg-info/10 text-info'
    default: return 'text-[11px] font-medium px-2 py-1 rounded-md bg-overlay-subtle text-muted-foreground'
  }
}

function isClickable(run: MarketRunSummary): boolean {
  return run.status === 'completed'
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
        :key="run.run_uuid"
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
            <span v-if="run.summary_text"> · {{ run.summary_text }}</span>
          </div>
        </div>

        <ChevronRight class="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>

    <div v-if="totalPages > 1" class="flex items-center justify-between mt-4">
      <button
        :data-loc="`${featureKey}.history-prev`"
        :disabled="page <= 1"
        :aria-label="t('market.history.previous')"
        class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 disabled:opacity-40 hover:bg-overlay-subtle transition"
        @click="$emit('update:page', page - 1)"
      >
        <ChevronLeft class="h-3 w-3" /> {{ t('market.history.previous') }}
      </button>
      <span class="text-xs text-muted-foreground tabular-nums">
        {{ t('market.history.pageInfo', { current: page, total: totalPages }) }}
      </span>
      <button
        :data-loc="`${featureKey}.history-next`"
        :disabled="page >= totalPages"
        :aria-label="t('market.history.next')"
        class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 disabled:opacity-40 hover:bg-overlay-subtle transition"
        @click="$emit('update:page', page + 1)"
      >
        {{ t('market.history.next') }} <ChevronRight class="h-3 w-3" />
      </button>
    </div>
  </section>
</template>
