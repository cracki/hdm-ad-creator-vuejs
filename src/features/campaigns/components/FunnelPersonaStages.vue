<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { readFunnelBudgetShare, readFunnelTextField } from '../types'

/**
 * Expandable per-persona funnel cards (QA round 3): one collapsible card per
 * persona listing its stage messages with the additive CTA / KPI / budget_share
 * fields from FunnelResultSerializer. All three fields are defensive reads —
 * chips/badges are simply hidden on older runs that lack them. Collapsed by
 * default; the chevron + aria-expanded expose the toggle.
 */
const props = defineProps<{ stages: unknown[] }>()
const { t } = useI18n()

interface StageEntry {
  stage: string
  title: string | null
  description: string | null
  cta: string | null
  kpi: string | null
  budgetShare: number | null
}

interface PersonaCard {
  name: string
  stages: StageEntry[]
}

const personaCards = computed<PersonaCard[]>(() => {
  const groups = new Map<string, StageEntry[]>()
  for (const raw of props.stages as Record<string, unknown>[]) {
    if (!raw || typeof raw !== 'object') continue
    const stageKey = typeof raw.stage === 'string' ? raw.stage : ''
    const name = (typeof raw.name === 'string' && raw.name) || stageKey
    if (!name) continue
    const entry: StageEntry = {
      stage: stageKey,
      title: readFunnelTextField(raw.title ?? raw.headline_angle),
      description: readFunnelTextField(raw.description ?? raw.body_approach ?? raw.content_strategy),
      cta: readFunnelTextField(raw.cta),
      kpi: readFunnelTextField(raw.kpi),
      budgetShare: readFunnelBudgetShare(raw.budget_share),
    }
    const existing = groups.get(name)
    if (existing) existing.push(entry)
    else groups.set(name, [entry])
  }
  return Array.from(groups.entries()).map(([name, stages]) => ({ name, stages }))
})

// Collapsed by default; keyed per persona so cards toggle independently.
const expanded = ref<Record<string, boolean>>({})

function isOpen(name: string): boolean {
  return !!expanded.value[name]
}

function toggle(name: string) {
  expanded.value[name] = !expanded.value[name]
}

function stageClass(stage: string): string {
  const s = stage.toLowerCase()
  if (s.includes('tofu') || s.includes('awareness')) return 'bg-info/15 text-info'
  if (s.includes('mofu') || s.includes('consideration')) return 'bg-warning/15 text-warning'
  return 'bg-success/15 text-success'
}
</script>

<template>
  <div v-if="personaCards.length" class="space-y-2" data-testid="funnel-persona-cards">
    <div
      v-for="card in personaCards"
      :key="card.name"
      class="surface-card overflow-hidden"
      data-testid="funnel-persona-card"
    >
      <button
        type="button"
        class="w-full flex items-center gap-2 p-4 text-start hover:bg-overlay-subtle/60 transition"
        :data-testid="'funnel-persona-toggle'"
        :aria-expanded="isOpen(card.name)"
        :aria-label="(isOpen(card.name) ? t('funnel.collapse') : t('funnel.expand')) + ' — ' + card.name"
        @click="toggle(card.name)"
      >
        <span class="text-sm font-semibold flex-1 min-w-0 truncate">{{ card.name }}</span>
        <!-- budget_share is per-stage (sums to 100 WITHIN each stage), so no
             cross-stage total is shown here — per-stage badges live inside. -->
        <ChevronDown
          class="h-4 w-4 text-muted-foreground shrink-0 transition-transform"
          :class="isOpen(card.name) ? 'rotate-180' : ''"
        />
      </button>

      <div v-if="isOpen(card.name)" class="px-4 pb-4 space-y-2" data-testid="funnel-persona-details">
        <div v-for="(row, idx) in card.stages" :key="idx" class="p-3 rounded-lg bg-overlay-subtle space-y-2">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span
              v-if="row.stage"
              :class="['text-[11px] px-2 py-0.5 rounded font-semibold', stageClass(row.stage)]"
            >{{ row.stage }}</span>
            <span
              v-if="row.budgetShare != null"
              class="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium"
              data-testid="funnel-persona-budget"
            >{{ row.budgetShare }}%</span>
          </div>
          <p v-if="row.title || row.description" class="text-xs text-muted-foreground leading-relaxed">
            <span v-if="row.title" class="font-medium text-foreground">{{ row.title }}</span>
            <span v-if="row.title && row.description"> — </span>
            <span v-if="row.description">{{ row.description }}</span>
          </p>
          <div v-if="row.cta || row.kpi" class="flex flex-wrap gap-1.5">
            <span
              v-if="row.cta"
              class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-accent-cyan/10 text-accent-cyan"
              data-testid="funnel-persona-cta"
            >
              <span class="font-semibold uppercase tracking-wide">{{ t('funnel.cta') }}</span>
              <span class="min-w-0 truncate">{{ row.cta }}</span>
            </span>
            <span
              v-if="row.kpi"
              class="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-accent-magenta/10 text-accent-magenta"
              data-testid="funnel-persona-kpi"
            >
              <span class="font-semibold uppercase tracking-wide">{{ t('funnel.kpi') }}</span>
              <span class="min-w-0 truncate">{{ row.kpi }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
