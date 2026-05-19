<script setup lang="ts">
import { computed, ref } from 'vue'
import SocialMediaAnalysisRenderer from './SocialMediaAnalysisRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import {
  Youtube, Instagram, Facebook, Twitter, Linkedin,
  Music2, MessageSquare, ExternalLink, CheckCircle2, AlertCircle,
  Lightbulb, Globe,
} from 'lucide-vue-next'

const props = defineProps<{
  data: Record<string, unknown>
}>()

const { t } = useI18n()

interface PlatformTab {
  key: string
  label: string
  icon: any
  status: string
  url: string | null
  content: Record<string, unknown>
  contentThemes: unknown
}

interface Recommendation {
  text: string
}

const PLATFORM_CONFIG: Record<string, { label: string; icon: any }> = {
  youtube: { label: 'YouTube', icon: Youtube },
  instagram: { label: 'Instagram', icon: Instagram },
  facebook: { label: 'Facebook', icon: Facebook },
  twitter: { label: 'X / Twitter', icon: Twitter },
  linkedin: { label: 'LinkedIn', icon: Linkedin },
  tiktok: { label: 'TikTok', icon: Music2 },
  threads: { label: 'Threads', icon: MessageSquare },
  pinterest: { label: 'Pinterest', icon: Globe },
}

const platforms = computed<PlatformTab[]>(() => {
  const ca = props.data.content_analysis
  if (!ca || typeof ca !== 'object') return []
  const contentAnalysis = ca as Record<string, unknown>

  return Object.entries(contentAnalysis)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([key, val]) => {
      const data = val as Record<string, unknown>
      const cfg = PLATFORM_CONFIG[key] ?? { label: key, icon: Globe }
      return {
        key,
        label: cfg.label,
        icon: cfg.icon,
        status: typeof data.status === 'string' ? data.status : 'unknown',
        url: typeof data.url === 'string' ? data.url : null,
        content: typeof data.analysis === 'object' && data.analysis ? data.analysis as Record<string, unknown> : data,
        contentThemes: data.content_themes ?? null,
      }
    })
})

const recommendations = computed<Recommendation[]>(() => {
  const recs = props.data.recommendations
  if (!Array.isArray(recs)) return []
  return recs.filter((r): r is string => typeof r === 'string').map(text => ({ text }))
})

const platformsActive = computed<string[]>(() => {
  const pa = props.data.platforms_active
  return Array.isArray(pa) ? pa.filter((p): p is string => typeof p === 'string') : []
})

const platformsMissing = computed<string[]>(() => {
  const pm = props.data.platforms_missing
  return Array.isArray(pm) ? pm.filter((p): p is string => typeof p === 'string') : []
})

const activeTab = ref<string>('')

const activePlatform = computed<PlatformTab | null>(() => {
  if (!platforms.value.length) return null
  const tab = activeTab.value || platforms.value[0].key
  return platforms.value.find(p => p.key === tab) ?? platforms.value[0] ?? null
})

function isStringArray(val: unknown): boolean {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'string'
}

function isObjectArray(val: unknown): boolean {
  return Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null
}

function getObjectTitle(obj: Record<string, unknown>): string | null {
  for (const key of ['name', 'title', 'hook', 'theme', 'concept', 'angle']) {
    if (typeof obj[key] === 'string' && (obj[key] as string).length > 0) return obj[key] as string
  }
  return null
}
</script>

<template>
  <div class="space-y-5">
    <!-- Recommendations -->
    <div v-if="recommendations.length" class="space-y-2">
      <div class="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Lightbulb class="h-3.5 w-3.5 text-amber-400" />
        {{ t('analysis.socialPresence.recommendations') }}
      </div>
      <div class="space-y-1.5">
        <div
          v-for="(rec, i) in recommendations"
          :key="i"
          class="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/10 rounded-lg px-3 py-2"
        >
          <AlertCircle class="h-3 w-3 text-amber-400/80 shrink-0 mt-0.5" />
          <span class="leading-relaxed">{{ rec.text }}</span>
        </div>
      </div>
    </div>

    <!-- Platform status pills -->
    <div v-if="platformsActive.length || platformsMissing.length" class="flex flex-wrap gap-1.5">
      <span
        v-for="p in platformsActive"
        :key="p"
        class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-success"
      >
        <CheckCircle2 class="h-2.5 w-2.5" />
        {{ p }}
      </span>
      <span
        v-for="p in platformsMissing"
        :key="p"
        class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-overlay-medium border border-border/20 text-muted-foreground/50"
      >
        {{ p }} (missing)
      </span>
    </div>

    <!-- Platform Tabs -->
    <div v-if="platforms.length > 1" class="flex gap-1 p-1 rounded-lg bg-overlay-subtle border border-border/30 overflow-x-auto">
      <button
        v-for="platform in platforms"
        :key="platform.key"
        @click="activeTab = platform.key"
        :class="[
          'h-8 px-3 rounded-md text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap',
          activePlatform?.key === platform.key
            ? 'bg-[image:var(--gradient-brand)] text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-overlay-subtle',
        ]"
      >
        <component :is="platform.icon" class="h-3.5 w-3.5" />
        {{ platform.label }}
      </button>
    </div>

    <!-- Active Platform Content -->
    <div v-if="activePlatform" class="space-y-5">
      <!-- Platform header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <component :is="activePlatform.icon" class="h-4 w-4 text-primary" />
          <span class="text-sm font-semibold text-foreground">{{ activePlatform.label }}</span>
          <span
            :class="[
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              activePlatform.status === 'active'
                ? 'bg-success/15 text-success'
                : 'bg-overlay-medium text-muted-foreground',
            ]"
          >
            {{ activePlatform.status }}
          </span>
        </div>
        <a
          v-if="activePlatform.url"
          :href="activePlatform.url"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition"
        >
          {{ t('analysis.socialPresence.viewProfile') }}
          <ExternalLink class="h-3 w-3" />
        </a>
      </div>

      <!-- Content themes -->
      <div v-if="activePlatform.contentThemes">
        <div v-if="isStringArray(activePlatform.contentThemes)" class="flex flex-wrap gap-1.5">
          <span
            v-for="(theme, i) in (activePlatform.contentThemes as string[])"
            :key="i"
            class="text-[10px] px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary/80"
          >
            {{ theme }}
          </span>
        </div>
        <div v-else-if="isObjectArray(activePlatform.contentThemes)" class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div
            v-for="(theme, i) in (activePlatform.contentThemes as Record<string, unknown>[])"
            :key="i"
            class="rounded-lg border border-border/20 bg-overlay-subtle p-3 space-y-1.5"
          >
            <div v-if="getObjectTitle(theme)" class="text-xs font-semibold text-foreground">
              {{ getObjectTitle(theme) }}
            </div>
            <div v-if="theme.percentage" class="flex items-center gap-2">
              <div class="flex-1 h-1.5 rounded-full bg-overlay-medium overflow-hidden">
                <div class="h-full rounded-full bg-primary/50" :style="{ width: String(theme.percentage).replace('%','') + '%' }" />
              </div>
              <span class="text-[10px] text-muted-foreground tabular-nums">{{ theme.percentage }}</span>
            </div>
            <div v-if="isStringArray(theme.topics)" class="flex flex-wrap gap-1">
              <span
                v-for="(topic, ti) in (theme.topics as string[])"
                :key="ti"
                class="text-[10px] px-1.5 py-0.5 rounded bg-overlay-medium text-muted-foreground"
              >
                {{ topic }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Platform analysis content -->
      <SocialMediaAnalysisRenderer :data="activePlatform.content" />
    </div>

    <!-- No platforms -->
    <div v-else-if="!platforms.length" class="text-xs text-muted-foreground/50 py-4 text-center">
      {{ t('analysis.socialPresence.noPlatforms') }}
    </div>
  </div>
</template>
