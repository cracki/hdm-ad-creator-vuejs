<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Library, Loader2, ChevronLeft, AlertCircle } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AnalysisPayloadRenderer from '@/shared/components/AnalysisPayloadRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useAdLibraryRun, useAdLibraryRunAds } from '../queries'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const { setActions } = usePageActions()
setActions([{ label: t('adlib.backToLibrary'), icon: ChevronLeft, to: '/ad-library' }])

const runUuid = computed(() => route.params.runUuid as string)
const { data: run, isLoading: runLoading, error: runError } = useAdLibraryRun(runUuid)
const { data: ads, isLoading: adsLoading } = useAdLibraryRunAds(runUuid)

const isLoading = computed(() => runLoading.value || adsLoading.value)

const statusClass = computed(() => {
  const s = run.value?.status
  if (s === 'completed') return 'bg-success/10 text-success'
  if (s === 'failed') return 'bg-destructive/10 text-destructive'
  if (s === 'running') return 'bg-info/10 text-info'
  return 'bg-white/5 text-muted-foreground'
})
</script>

<template>
  <Topbar :title="t('adlib.runDetail')" :subtitle="run?.brand?.company_name ?? t('adlib.standalone')">
    <template #actions>
      <button
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition flex items-center gap-1.5"
        @click="router.push('/ad-library')"
      >
        <ChevronLeft class="h-3.5 w-3.5" /> {{ t('adlib.backToLibrary') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
      <div v-if="isLoading" class="flex justify-center py-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <div v-else-if="runError" class="surface-card p-5 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="text-sm text-destructive">{{ t('adlib.runLoadError') }}</div>
      </div>

      <template v-else-if="run">
        <!-- Run info -->
        <div class="surface-card p-5 mb-6">
          <div class="flex items-center gap-4 mb-4">
            <span :class="['text-[11px] font-medium px-2 py-1 rounded-md', statusClass]">
              {{ run.status }}
            </span>
            <span class="text-xs text-muted-foreground">{{ run.run_type }}</span>
            <span v-if="run.created_at" class="text-xs text-muted-foreground">
              {{ new Date(run.created_at).toLocaleString() }}
            </span>
          </div>

          <div v-if="run.error_message" class="p-3 rounded-lg bg-destructive/10 text-xs text-destructive mb-4">
            {{ run.error_message }}
          </div>

          <div v-if="run.result_summary && Object.keys(run.result_summary).length" class="text-xs text-muted-foreground">
            <AnalysisPayloadRenderer :data="run.result_summary" />
          </div>
        </div>

        <!-- Ads grid -->
        <div v-if="ads?.length">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold">{{ t('adlib.generatedAds') }} ({{ ads.length }})</h3>
          </div>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="ad in ads"
              :key="ad.ad_library_ad_uuid"
              class="surface-card p-4 space-y-3"
            >
              <div class="flex items-center gap-2">
                <span v-if="ad.platform" class="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{{ ad.platform }}</span>
                <span v-if="ad.funnel_stage" class="text-[11px] px-1.5 py-0.5 rounded bg-info/10 text-info">{{ ad.funnel_stage }}</span>
                <span v-if="ad.angle_name" class="text-[11px] px-1.5 py-0.5 rounded bg-white/5 text-muted-foreground">{{ ad.angle_name }}</span>
              </div>

              <div v-if="ad.persona" class="text-[11px] text-muted-foreground">
                {{ t('adgen.persona') }}: {{ ad.persona }}
              </div>

              <!-- Ad data rendered defensively -->
              <AnalysisPayloadRenderer :data="ad.data" />
            </div>
          </div>
        </div>

        <div v-else-if="!adsLoading" class="surface-card p-6 text-center">
          <Library class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <div class="text-sm text-muted-foreground">{{ t('adlib.noAds') }}</div>
        </div>
      </template>
    </div>
  </main>
</template>
