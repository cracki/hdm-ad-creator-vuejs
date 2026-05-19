<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import SocialMediaAnalysisRenderer from '@/shared/components/renderers/SocialMediaAnalysisRenderer.vue'
import { useAnalyzeSocialMedia } from '../queries'
import { brandsApi } from '@/features/brands/api'
import { useQuery } from '@tanstack/vue-query'
import {
  Globe, Loader2, Sparkles, CheckCircle2, ExternalLink,
  ChevronDown, ChevronUp,
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

const PLATFORM_META: Record<string, { icon: string; color: string; gradient: string; label: string }> = {
  youtube: { icon: 'YT', color: 'text-red-300', gradient: 'from-red-500/20 to-red-600/10', label: 'YouTube' },
  facebook: { icon: 'f', color: 'text-blue-300', gradient: 'from-blue-500/20 to-blue-600/10', label: 'Facebook' },
  linkedin: { icon: 'in', color: 'text-sky-300', gradient: 'from-sky-500/20 to-sky-600/10', label: 'LinkedIn' },
  instagram: { icon: 'IG', color: 'text-pink-300', gradient: 'from-pink-500/20 to-purple-500/10', label: 'Instagram' },
  tiktok: { icon: 'TT', color: 'text-cyan-300', gradient: 'from-cyan-500/20 to-pink-500/10', label: 'TikTok' },
  twitter: { icon: 'X', color: 'text-slate-300', gradient: 'from-slate-500/20 to-slate-600/10', label: 'X (Twitter)' },
}

function getPlatformMeta(platform: string) {
  return PLATFORM_META[platform] ?? { icon: '?', color: 'text-muted-foreground', gradient: 'from-muted/20 to-muted/10', label: platform }
}
</script>

<template>
  <Topbar
    :title="t('social.title')"
    :subtitle="t('social.subtitle')"
  />

  <main class="flex-1 p-4 sm:p-6 space-y-4 overflow-y-auto">
    <!-- Loading state -->
    <div v-if="profilesLoading" class="space-y-3">
      <div v-for="i in 2" :key="i" class="surface-card p-5 shimmer h-40" />
    </div>

    <!-- Empty state -->
    <div v-else-if="!socialProfiles?.length" class="surface-card p-8 text-center space-y-4">
      <div class="h-14 w-14 rounded-2xl bg-[image:var(--gradient-brand)] grid place-items-center mx-auto shadow-[var(--shadow-glow)]">
        <Globe class="h-6 w-6 text-primary-foreground" />
      </div>
      <div>
        <div class="font-semibold mb-1">{{ t('social.emptyTitle') }}</div>
        <div class="text-sm text-muted-foreground">{{ t('social.emptyDesc') }}</div>
      </div>
    </div>

    <!-- Profiles list -->
    <div v-else class="space-y-4">
      <div
        v-for="profile in socialProfiles"
        :key="profile.social_media_uuid"
        class="surface-card overflow-hidden transition-all"
        :class="{ 'border-primary/30 ring-1 ring-primary/10': expandedUuid === profile.social_media_uuid }"
      >
        <!-- Header row -->
        <div
          data-loc="competitors.social.profile-header"
          class="p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:bg-overlay-subtle transition"
          @click="toggleExpand(profile.social_media_uuid)"
        >
          <div class="flex items-center gap-3">
            <div
              class="h-11 w-11 rounded-xl bg-gradient-to-br grid place-items-center font-bold text-sm"
              :class="getPlatformMeta(profile.platform).gradient + ' ' + getPlatformMeta(profile.platform).color"
            >
              {{ getPlatformMeta(profile.platform).icon }}
            </div>
            <div>
              <div class="font-semibold text-sm">{{ getPlatformMeta(profile.platform).label }}</div>
              <div v-if="(profile as any).profile_url" class="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <a :href="(profile as any).profile_url" data-loc="competitors.social.profile-link" target="_blank" @click.stop class="hover:underline">{{ (profile as any).profile_url }}</a>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span v-if="profile.analysis_data" class="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">
              <CheckCircle2 class="h-2.5 w-2.5" /> {{ t('social.analyzed') }}
            </span>
            <button
              @click.stop="handleAnalyze(profile.social_media_uuid)"
              :disabled="analyzingUuid === profile.social_media_uuid"
              data-loc="competitors.social.analyze-btn"
              class="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition"
              :class="profile.analysis_data
                ? 'border border-border/60 hover:bg-overlay-subtle'
                : 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95'"
            >
              <Loader2 v-if="analyzingUuid === profile.social_media_uuid" class="h-3 w-3 animate-spin" />
              <Sparkles v-else class="h-3 w-3" />
              {{ profile.analysis_data ? t('social.reAnalyze') : t('social.analyze') }}
            </button>
            <component
              :is="expandedUuid === profile.social_media_uuid ? ChevronUp : ChevronDown"
              class="h-4 w-4 text-muted-foreground transition"
            />
          </div>
        </div>

        <!-- Analysis results -->
        <div
          v-if="expandedUuid === profile.social_media_uuid && getAnalysisData(profile)"
          class="border-t border-border/40 p-4 sm:p-5"
        >
          <SocialMediaAnalysisRenderer :data="getAnalysisData(profile)" />
        </div>
      </div>
    </div>

    <!-- Link to audit -->
    <div v-if="socialProfiles?.length" class="flex justify-center pt-2">
      <RouterLink
        :to="`/brands/${brandUuid}/social/audit`"
        data-loc="competitors.social.full-audit-link"
        class="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <ExternalLink class="h-3.5 w-3.5" /> {{ t('social.fullAudit') }}
      </RouterLink>
    </div>
  </main>
</template>
