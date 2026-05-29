<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Library, ChevronRight, Sparkles } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCreativeAngles, useFunnelStages, usePlatformConfigs, useAdLibraryRuns } from '../queries'
import type { FunnelStage, PlatformConfig } from '../types'

const { t } = useI18n()
const router = useRouter()

const { setActions } = usePageActions()
setActions([{ label: t('adlib.newGeneration'), icon: Sparkles, to: '/ad-library/generate' }])

const { data: anglesData, isLoading: anglesLoading } = useCreativeAngles()
const { data: stagesData, isLoading: stagesLoading } = useFunnelStages()
const { data: platformsData, isLoading: platformsLoading } = usePlatformConfigs()
const { data: runs, isLoading: runsLoading } = useAdLibraryRuns()

const angles = computed(() => {
  const d = anglesData.value
  if (!d?.angles) return []
  return Object.values(d.angles) as any[]
})

const stages = computed(() => {
  const d = stagesData.value
  if (!d?.funnel_stages) return [] as Array<FunnelStage & { key: string }>
  return Object.entries(d.funnel_stages).map(([key, val]) => ({ key, ...val }))
})

const platforms = computed(() => {
  const d = platformsData.value
  if (!d?.platforms) return [] as Array<PlatformConfig & { key: string }>
  return Object.entries(d.platforms).map(([key, val]) => ({ key, ...val }))
})

const isLoading = computed(() => anglesLoading.value || stagesLoading.value || platformsLoading.value)
</script>

<template>
  <Topbar :title="t('adlib.title')" :subtitle="t('adlib.subtitle')">
    <template #actions>
      <button
        data-loc="adlib.browser.new-gen-btn"
        class="h-9 px-3.5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
        @click="router.push('/ad-library/generate')"
      >
        <Sparkles class="h-3.5 w-3.5" /> {{ t('adlib.newGeneration') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
      <div v-if="isLoading" class="py-12">
        <AiLoadingAnimation :message="t('adlib.title')" size="sm" />
      </div>

      <template v-else>
        <!-- Creative Angles -->
        <section class="mb-8">
          <h3 data-loc="adlib.browser.header-angles" class="text-sm font-semibold mb-3">{{ t('adlib.creativeAngles') }}</h3>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div
              v-for="angle in angles"
              :key="angle.id"
              class="surface-card p-4 hover:border-primary/40 transition cursor-default"
            >
              <div class="flex items-center gap-2 mb-2">
                <div class="h-7 w-7 rounded-md bg-[image:var(--gradient-brand)] grid place-items-center text-primary-foreground text-[11px] font-bold">
                  {{ angle.name.charAt(0) }}
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate">{{ angle.name }}</div>
                </div>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed line-clamp-2">{{ angle.description }}</p>
              <div v-if="angle.best_for_platforms?.length" class="flex flex-wrap gap-1 mt-2">
                <span v-for="p in angle.best_for_platforms.slice(0, 3)" :key="p" class="text-[11px] px-1.5 py-0.5 rounded bg-overlay-light text-muted-foreground">
                  {{ p }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Funnel Stages -->
        <section class="mb-8">
          <h3 data-loc="adlib.browser.header-stages" class="text-sm font-semibold mb-3">{{ t('adlib.funnelStages') }}</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div
              v-for="stage in stages"
              :key="stage.key"
              class="surface-card p-4"
            >
              <div class="text-sm font-semibold mb-1">{{ stage.name }}</div>
              <div class="text-[11px] uppercase tracking-wider text-primary mb-2">{{ stage.key }}</div>
              <p class="text-xs text-muted-foreground leading-relaxed">{{ stage.goal }}</p>
              <div v-if="stage.cta_types?.length" class="flex flex-wrap gap-1 mt-2">
                <span v-for="cta in stage.cta_types.slice(0, 3)" :key="cta" class="text-[11px] px-1.5 py-0.5 rounded bg-success/10 text-success/80">
                  {{ cta }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Platforms -->
        <section class="mb-8">
          <h3 data-loc="adlib.browser.header-platforms" class="text-sm font-semibold mb-3">{{ t('adlib.platforms') }}</h3>
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div
              v-for="platform in platforms"
              :key="platform.key"
              class="surface-card p-4"
            >
              <div class="text-sm font-semibold mb-2">{{ platform.name }}</div>
              <div class="space-y-1 text-[11px] text-muted-foreground">
                <div>{{ t('adlib.headlineLimit') }}: {{ platform.headline_limit }}</div>
                <div>{{ t('adlib.textLimit') }}: {{ platform.primary_text_limit }}</div>
                <div>{{ t('adlib.descLimit') }}: {{ platform.description_limit }}</div>
              </div>
              <div v-if="platform.cta_options?.length" class="flex flex-wrap gap-1 mt-2">
                <span v-for="cta in platform.cta_options.slice(0, 2)" :key="cta" class="text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary/80">
                  {{ cta }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Past Runs -->
        <section>
          <h3 data-loc="adlib.browser.header-runs" class="text-sm font-semibold mb-3">{{ t('adlib.pastRuns') }}</h3>
          <div v-if="runsLoading" class="py-6">
            <AiLoadingAnimation :message="t('adlib.pastRuns')" size="sm" />
          </div>
          <div v-else-if="!runs?.length" class="surface-card p-6 text-center">
            <Library class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <div class="text-sm text-muted-foreground">{{ t('adlib.noRuns') }}</div>
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="run in runs"
              :key="run.ad_library_run_uuid"
              data-loc="adlib.browser.run-item"
              class="surface-card p-4 flex items-center gap-3 sm:gap-4 cursor-pointer hover:border-primary/40 transition"
              @click="router.push(`/ad-library/runs/${run.ad_library_run_uuid}`)"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">
                  {{ run.brand?.company_name ?? t('adlib.standalone') }}
                  <span class="text-muted-foreground">· {{ run.run_type }}</span>
                </div>
                <div class="text-[11px] text-muted-foreground mt-0.5">
                  {{ run.created_at ? new Date(run.created_at).toLocaleDateString() : '' }}
                  <span v-if="run.ads_count"> · {{ run.ads_count }} {{ t('adlib.ads') }}</span>
                </div>
              </div>
              <span
                :class="[
                  'text-[11px] font-medium px-2 py-1 rounded-md',
                  run.status === 'completed' ? 'bg-success/10 text-success' :
                  run.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                  'bg-overlay-subtle text-muted-foreground',
                ]"
              >
                {{ run.status }}
              </span>
              <ChevronRight class="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        </section>
      </template>
    </div>
  </main>
</template>
