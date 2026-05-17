<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/shared/utils/i18n'
import type { BrandScoreResult } from '@/shared/composables/useBrandScore'

const props = defineProps<{ score: BrandScoreResult }>()
const { t } = useI18n()

const circumference = 2 * Math.PI * 42
const dashOffset = computed(() => circumference - (props.score.percentage / 100) * circumference)

const gradeColor = computed(() => {
  switch (props.score.grade) {
    case 'excellent': return 'text-success'
    case 'good': return 'text-primary'
    case 'needsWork': return 'text-warning'
    default: return 'text-muted-foreground'
  }
})

const ringColor = computed(() => {
  switch (props.score.grade) {
    case 'excellent': return 'stroke-success'
    case 'good': return 'stroke-primary'
    case 'needsWork': return 'stroke-warning'
    default: return 'stroke-muted'
  }
})
</script>

<template>
  <div class="surface-card p-5">
    <div class="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
      {{ t('score.title') }}
    </div>

    <div v-if="score.grade === 'noData'" class="text-center py-6">
      <div class="text-sm text-muted-foreground">{{ t('score.noAnalysis') }}</div>
    </div>

    <template v-else>
      <!-- Gauge -->
      <div class="flex justify-center mb-4">
        <div class="relative h-28 w-28">
          <svg class="h-28 w-28 -rotate-90" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r="42" fill="none" stroke="currentColor" class="text-white/5" stroke-width="6" />
            <circle
              cx="48" cy="48" r="42" fill="none"
              :class="ringColor"
              stroke-width="6"
              stroke-linecap="round"
              :stroke-dasharray="circumference"
              :stroke-dashoffset="dashOffset"
              class="transition-all duration-700"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span class="text-2xl font-bold" :class="gradeColor">{{ score.percentage }}</span>
            <span class="text-[11px] text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      <!-- Grade -->
      <div class="text-center mb-4">
        <span :class="['text-xs font-semibold', gradeColor]">{{ t(score.gradeKey as any) }}</span>
      </div>

      <!-- Factor Breakdown -->
      <div class="space-y-2.5">
        <div v-for="factor in score.factors" :key="factor.key" class="space-y-1">
          <div class="flex items-center justify-between text-[11px]">
            <span class="text-muted-foreground">{{ t(factor.labelKey as any) }}</span>
            <span class="font-medium">{{ factor.score }}/{{ factor.maxScore }}</span>
          </div>
          <div class="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              class="h-full rounded-full bg-[image:var(--gradient-brand)] transition-all duration-500"
              :style="{ width: `${(factor.score / factor.maxScore) * 100}%` }"
            />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
