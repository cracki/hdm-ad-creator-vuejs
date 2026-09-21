<script setup lang="ts">
import { computed, ref } from 'vue'
import { Sparkles, ThumbsUp, AlertTriangle, ListChecks, ChevronDown } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { PlatformRecommendation } from '../types'

const props = defineProps<{ rec: PlatformRecommendation }>()
const { t } = useI18n()

// Rationale expands on mobile by default collapsed; always open on larger
// screens via the sm: classes below (line-clamp + toggle only on mobile).
const expanded = ref(false)
const rationaleClasses = computed(() => [
  'text-[11px] text-muted-foreground leading-relaxed mt-1',
  expanded.value ? '' : 'line-clamp-2 sm:line-clamp-none',
])

/** Color-code the 0–100 suitability score. */
const scoreClasses = computed(() => {
  const s = Number(props.rec.suitability_score) || 0
  if (s >= 70) return 'bg-success/15 text-success border-success/40'
  if (s >= 40) return 'bg-accent-amber/15 text-accent-amber border-accent-amber/40'
  return 'bg-destructive/15 text-destructive border-destructive/40'
})
</script>

<template>
  <div class="w-full mt-2 pt-2 border-t border-border/40" data-testid="platform-rec-details">
    <div class="flex flex-wrap items-center gap-1.5">
      <span
        class="text-[11px] font-semibold px-2 py-0.5 rounded-full border"
        :class="scoreClasses"
        :data-testid="`rec-score-${rec.platform}`"
      >
        {{ t('platform.recScore') }}: {{ rec.suitability_score }}/100
      </span>
      <span
        v-if="rec.recommended"
        class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1"
        :data-testid="`rec-recommended-${rec.platform}`"
      >
        <ThumbsUp class="h-3 w-3" /> {{ t('platform.recRecommended') }}
      </span>
    </div>

    <p v-if="rec.rationale" :class="rationaleClasses" :data-testid="`rec-rationale-${rec.platform}`">
      {{ rec.rationale }}
    </p>
    <button
      v-if="rec.rationale"
      type="button"
      class="sm:hidden text-[11px] text-primary flex items-center gap-0.5 mt-1"
      :data-testid="`rec-expand-${rec.platform}`"
      @click.stop="expanded = !expanded"
    >
      {{ expanded ? t('platform.recShowLess') : t('platform.recShowMore') }}
      <ChevronDown class="h-3 w-3 transition-transform" :class="expanded ? 'rotate-180' : ''" />
    </button>

    <div
      v-if="rec.key_strengths?.length || rec.risks?.length || rec.requirements?.length"
      class="mt-2 grid gap-2"
      :data-testid="`rec-lists-${rec.platform}`"
    >
      <div v-if="rec.key_strengths?.length">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-success flex items-center gap-1 mb-0.5">
          <Sparkles class="h-3 w-3" /> {{ t('platform.recStrengths') }}
        </div>
        <ul class="text-[11px] text-muted-foreground space-y-0.5 ps-3 list-disc">
          <li v-for="(s, i) in rec.key_strengths" :key="`s-${i}`">{{ s }}</li>
        </ul>
      </div>
      <div v-if="rec.risks?.length">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-accent-amber flex items-center gap-1 mb-0.5">
          <AlertTriangle class="h-3 w-3" /> {{ t('platform.recRisks') }}
        </div>
        <ul class="text-[11px] text-muted-foreground space-y-0.5 ps-3 list-disc">
          <li v-for="(r, i) in rec.risks" :key="`r-${i}`">{{ r }}</li>
        </ul>
      </div>
      <div v-if="rec.requirements?.length">
        <div class="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-0.5">
          <ListChecks class="h-3 w-3" /> {{ t('platform.recRequirements') }}
        </div>
        <ul class="text-[11px] text-muted-foreground space-y-0.5 ps-3 list-disc">
          <li v-for="(q, i) in rec.requirements" :key="`q-${i}`">{{ q }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>
