<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import AnalysisPayloadRenderer from '@/shared/components/AnalysisPayloadRenderer.vue'
import { useAnalyzeSocialMedia } from '../queries'
import { brandsApi } from '@/features/brands/api'
import { useQuery } from '@tanstack/vue-query'
import {
  Globe, Loader2, Sparkles, CheckCircle2, ExternalLink,
  ChevronDown,
} from 'lucide-vue-next'

const route = useRoute()
const { t } = useI18n()

const brandUuid = computed(() => route.params.brandUuid as string)
const analyzeMutation = useAnalyzeSocialMedia(brandUuid)

const { data: socialProfiles, isLoading: profilesLoading } = useQuery({
  queryKey: ['brands', brandUuid, 'social-media-profiles'],
  queryFn: async () => (await brandsApi.listSocialMedia(brandUuid.value)).data,
  enabled: computed(() => !!brandUuid.value),
  staleTime: 10_000,
})

const analyzingUuid = ref<string | null>(null)
const analysisResults = ref<Record<string, any>>({})
const expandedUuid = ref<string | null>(null)

async function handleAnalyze(uuid: string) {
  analyzingUuid.value = uuid
  try {
    const result = await analyzeMutation.mutateAsync(uuid)
    analysisResults.value[uuid] = (result as any)?.data ?? result
    expandedUuid.value = uuid
  } finally {
    analyzingUuid.value = null
  }
}

function toggleExpand(uuid: string) {
  expandedUuid.value = expandedUuid.value === uuid ? null : uuid
}

function getAnalysisData(profile: any) {
  return analysisResults.value[profile.social_media_uuid] ?? profile.analysis_data ?? null
}

const platformIcon: Record<string, string> = {
  twitter: '𝕏',
  facebook: 'f',
  linkedin: 'in',
  instagram: 'IG',
  tiktok: 'TT',
  youtube: 'YT',
}
</script>

<template>
  <Topbar
    :title="t('social.title')"
    :subtitle="t('social.subtitle')"
  />

  <main class="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
    <div v-if="profilesLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="surface-card p-5 shimmer h-40" />
    </div>

    <div v-else-if="!socialProfiles?.length" class="surface-card p-8 text-center space-y-4">
      <div class="h-14 w-14 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
        <Globe class="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div class="font-semibold mb-1">{{ t('social.emptyTitle') }}</div>
        <div class="text-sm text-muted-foreground">{{ t('social.emptyDesc') }}</div>
      </div>
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="profile in socialProfiles"
        :key="profile.social_media_uuid"
        class="surface-card overflow-hidden transition"
        :class="{ 'border-primary/40': expandedUuid === profile.social_media_uuid }"
      >
        <!-- Header row -->
        <div
          data-loc="competitors.social.profile-header"
          class="p-5 flex items-center justify-between cursor-pointer hover:bg-white/[0.01] transition"
          @click="toggleExpand(profile.social_media_uuid)"
        >
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 grid place-items-center font-bold text-sm text-blue-300">
              {{ platformIcon[profile.platform] || '?' }}
            </div>
            <div>
              <div class="font-medium text-sm capitalize">{{ profile.platform }}</div>
              <div v-if="(profile as any).profile_url" class="text-xs text-muted-foreground flex items-center gap-1">
                <a :href="(profile as any).profile_url" data-loc="competitors.social.profile-link" target="_blank" @click.stop class="hover:underline">{{ (profile as any).profile_url }}</a>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="profile.analysis_data" class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">
              <CheckCircle2 class="h-2.5 w-2.5" /> {{ t('social.analyzed') }}
            </span>
            <button
              @click.stop="handleAnalyze(profile.social_media_uuid)"
              :disabled="analyzingUuid === profile.social_media_uuid"
              data-loc="competitors.social.analyze-btn"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition"
              :class="profile.analysis_data
                ? 'border border-border/60 hover:bg-white/[0.03]'
                : 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95'"
            >
              <Loader2 v-if="analyzingUuid === profile.social_media_uuid" class="h-3 w-3 animate-spin" />
              <Sparkles v-else class="h-3 w-3" />
              {{ profile.analysis_data ? t('social.reAnalyze') : t('social.analyze') }}
            </button>
            <ChevronDown :class="['h-4 w-4 text-muted-foreground transition', expandedUuid === profile.social_media_uuid ? 'rotate-180' : '']" />
          </div>
        </div>

        <!-- Analysis results (collapsed by default) -->
        <div
          v-if="expandedUuid === profile.social_media_uuid && getAnalysisData(profile)"
          class="border-t border-border/40 p-5 space-y-3"
        >
          <div class="text-xs font-semibold text-foreground mb-2">{{ t('social.analysisResults') }}</div>
          <AnalysisPayloadRenderer :data="getAnalysisData(profile)" />
        </div>
      </div>
    </div>

    <!-- Link to audit -->
    <div v-if="socialProfiles?.length" class="flex justify-center pt-2">
      <RouterLink
        :to="`/brands/${brandUuid}/social/audit`"
        data-loc="competitors.social.full-audit-link"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition"
      >
        <ExternalLink class="h-3.5 w-3.5" /> {{ t('social.fullAudit') }}
      </RouterLink>
    </div>
  </main>
</template>
