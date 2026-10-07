<script setup lang="ts">
import { computed } from 'vue'
import { AlertTriangle, Target, Wallet, Link2, GitBranch } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { PlatformRecommendationsResult } from '../types'

const props = defineProps<{ result: PlatformRecommendationsResult }>()
const { t } = useI18n()

const warnings = computed(() => props.result.warnings ?? [])
const roles = computed(() => props.result.channel_strategy?.platform_roles ?? [])
const relationships = computed(() => props.result.channel_strategy?.cross_platform_relationships ?? [])
const budgetFit = computed(() => props.result.budget_fit ?? null)

// Warnings carry a normalized platform slug (or null); render a human
// label chip instead of raw "[slug]" text.
const PLATFORM_WARNING_LABELS: Record<string, string> = {
  google: 'Google',
  meta: 'Meta',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  bing: 'Bing',
}

function platformWarningLabel(slug: string | null | undefined): string {
  if (!slug) return ''
  return PLATFORM_WARNING_LABELS[slug] ?? slug.charAt(0).toUpperCase() + slug.slice(1)
}
</script>

<template>
  <div class="space-y-3" data-testid="platform-rec-summary">
    <!-- Channel strategy -->
    <div v-if="result.channel_strategy?.summary" class="surface-card p-4">
      <div class="flex items-center gap-2 mb-2">
        <Target class="h-4 w-4 text-primary shrink-0" />
        <div class="text-sm font-semibold">{{ t('platform.recStrategy') }}</div>
      </div>
      <p class="text-xs text-muted-foreground leading-relaxed" data-testid="rec-strategy-summary">
        {{ result.channel_strategy.summary }}
      </p>
      <div v-if="roles.length" class="mt-3 space-y-2">
        <div
          v-for="role in roles"
          :key="role.platform"
          class="flex items-start gap-2 text-xs"
          :data-testid="`rec-role-${role.platform}`"
        >
          <GitBranch class="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
          <div class="min-w-0">
            <span class="font-medium">{{ role.platform }}</span>
            <span v-if="role.funnel_stage" class="text-muted-foreground"> · {{ role.funnel_stage }}</span>
            <div class="text-muted-foreground">{{ role.role }}</div>
          </div>
        </div>
      </div>
      <div v-if="relationships.length" class="mt-3 space-y-1">
        <div
          v-for="(rel, i) in relationships"
          :key="i"
          class="text-[11px] text-muted-foreground flex items-start gap-1.5"
        >
          <Link2 class="h-3 w-3 shrink-0 mt-0.5" />
          <span>{{ rel }}</span>
        </div>
      </div>
    </div>

    <!-- Budget fit -->
    <div v-if="budgetFit?.assessment || budgetFit?.notes" class="surface-card p-4">
      <div class="flex items-center gap-2 mb-2">
        <Wallet class="h-4 w-4 text-primary shrink-0" />
        <div class="text-sm font-semibold">{{ t('platform.recBudgetFit') }}</div>
        <span
          v-if="budgetFit.suggested_channel_count != null"
          class="text-[11px] px-2 py-0.5 rounded-full bg-overlay-light text-muted-foreground ms-auto"
          data-testid="rec-budget-channel-count"
        >
          {{ t('platform.recSuggestedChannels', { count: budgetFit.suggested_channel_count }) }}
        </span>
      </div>
      <p v-if="budgetFit.assessment" class="text-xs font-medium" data-testid="rec-budget-assessment">
        {{ budgetFit.assessment }}
      </p>
      <p v-if="budgetFit.notes" class="text-xs text-muted-foreground leading-relaxed mt-1">
        {{ budgetFit.notes }}
      </p>
    </div>

    <!-- Warnings -->
    <div
      v-if="warnings.length"
      class="surface-card p-4 border-accent-amber/40"
      data-testid="rec-warnings"
    >
      <div class="flex items-center gap-2 mb-2">
        <AlertTriangle class="h-4 w-4 text-accent-amber shrink-0" />
        <div class="text-sm font-semibold">{{ t('platform.recWarnings') }}</div>
      </div>
      <div class="space-y-1.5">
        <div
          v-for="(w, i) in warnings"
          :key="i"
          class="text-xs text-muted-foreground flex items-start gap-1.5"
          :data-testid="`rec-warning-${i}`"
        >
          <span class="text-accent-amber shrink-0">•</span>
          <span>
            <span
              v-if="w.platform"
              class="text-[11px] px-2 py-0.5 rounded-full bg-overlay-light text-muted-foreground font-medium me-1.5"
              data-testid="platform-warning-chip"
            >{{ platformWarningLabel(w.platform) }}</span>{{ w.message }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
