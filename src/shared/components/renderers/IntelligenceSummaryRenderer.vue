<script setup lang="ts">
import { computed } from 'vue'
import { BarChart3, TrendingUp, Lightbulb, Layers, Users } from 'lucide-vue-next'
import type { ContentIntelligenceSummary } from '@/features/market/types'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: ContentIntelligenceSummary | Record<string, unknown>
}>()

const summary = computed(() => props.data as ContentIntelligenceSummary)

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { icon: TrendingUp, label: t('intelSummary.opportunities'), value: s.total_opportunities ?? 0, color: 'text-info' },
    { icon: Layers, label: t('intelSummary.gaps'), value: s.gaps_found ?? 0, color: 'text-amber-400' },
    { icon: Lightbulb, label: t('intelSummary.contentIdeas'), value: s.content_ideas ?? 0, color: 'text-primary' },
    { icon: BarChart3, label: t('intelSummary.topAnalyzed'), value: s.top_performers_analyzed ?? 0, color: 'text-success' },
  ]
})
</script>

<template>
  <div v-if="summary" class="space-y-3">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-lg border border-border/30 bg-white/[0.015] p-3 text-center space-y-1"
      >
        <div class="flex justify-center">
          <component :is="stat.icon" :class="['h-4 w-4', stat.color]" />
        </div>
        <div :class="['text-xl font-bold', stat.color]">{{ stat.value }}</div>
        <div class="text-[10px] text-muted-foreground">{{ stat.label }}</div>
      </div>
    </div>
  </div>

  <!-- Fallback: if data is a plain object with unknown keys, show as key-value -->
  <div v-else-if="Object.keys(props.data).length" class="space-y-2">
    <div
      v-for="(val, key) in (props.data as Record<string, unknown>)"
      :key="String(key)"
      class="flex items-center gap-3"
    >
      <span class="text-[11px] text-muted-foreground capitalize min-w-[120px]">
        {{ String(key).replace(/_/g, ' ') }}
      </span>
      <span class="text-sm font-medium text-foreground">{{ val }}</span>
    </div>
  </div>

  <div v-else class="text-xs text-muted-foreground/50 py-2">—</div>
</template>
