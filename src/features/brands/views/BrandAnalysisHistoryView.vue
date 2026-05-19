<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useBrand, useAnalysisRuns } from '@/features/brands/queries'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { Clock, CheckCircle2, XCircle, Loader2, Eye, ChevronLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const brandUuid = computed(() => route.params.brandUuid as string)
const { data: brand } = useBrand(brandUuid)
const { data: runs, isLoading } = useAnalysisRuns(brandUuid)

const { setActions } = usePageActions()
setActions([
  { label: t('analysis.backToAnalysis'), icon: ChevronLeft, to: `/brands/${brandUuid.value}/analysis` },
])

function statusIcon(status: string) {
  switch (status) {
    case 'completed': return { icon: CheckCircle2, cls: 'text-success bg-success/10' }
    case 'failed': return { icon: XCircle, cls: 'text-destructive bg-destructive/10' }
    case 'running': case 'pending': return { icon: Loader2, cls: 'text-info bg-info/10', spin: true }
    default: return { icon: Clock, cls: 'text-muted-foreground bg-overlay-subtle' }
  }
}
</script>

<template>
  <Topbar
    :title="t('analysis.historyTitle')"
    :subtitle="brand?.company_name ?? ''"
  >
    <template #actions>
      <button
        @click="router.push(`/brands/${brandUuid}/analysis`)"
        data-loc="brands.history.back-btn"
        class="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('analysis.backToAnalysis') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 p-4 sm:p-6 overflow-y-auto">
    <div v-if="isLoading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="surface-card p-5 shimmer h-20" />
    </div>

    <div v-else-if="runs?.length" class="space-y-3">
      <div
        v-for="run in runs"
        :key="run.analysis_run_uuid"
        data-loc="brands.history.item"
        class="surface-card p-5 flex items-center gap-4 hover:border-primary/40 transition cursor-pointer"
        @click="router.push(`/brands/${brandUuid}/analysis/${run.analysis_run_uuid}`)"
      >
        <div :class="['h-10 w-10 rounded-xl grid place-items-center shrink-0', statusIcon(run.status).cls]">
          <component :is="statusIcon(run.status).icon" :class="['h-5 w-5', statusIcon(run.status).spin ? 'animate-spin' : '']" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="font-medium text-sm truncate">
            {{ t(`analysis.status.${run.status}`) }}
          </div>
          <div class="text-xs text-muted-foreground">
            {{ new Date(run.created_at).toLocaleString() }}
          </div>
        </div>

        <div class="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
          <span v-if="run.finished_at">{{ t('analysis.duration') }}: {{ Math.round((new Date(run.finished_at).getTime() - new Date(run.started_at ?? run.created_at).getTime()) / 1000) }}s</span>
          <Eye class="h-4 w-4" />
        </div>
      </div>
    </div>

    <div v-else class="text-center py-16">
      <div class="text-sm text-muted-foreground">{{ t('analysis.noHistory') }}</div>
    </div>
  </main>
</template>
