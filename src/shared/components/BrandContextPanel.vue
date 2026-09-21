<script setup lang="ts">
import { computed } from 'vue'
import { Users, Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { BrandContext, BrandContextPersona } from '@/features/campaigns/types'

/**
 * "Reused from Brand Analysis" panel (M-H8): read-only view of the campaign's
 * brand_context — audience summary, persona segment cards and services.
 * Purely presentational; parents decide visibility (brand_context.available).
 */
const props = defineProps<{ context: BrandContext }>()

const { t } = useI18n()

const audienceSummary = computed(() => props.context.audience_summary ?? null)

const topPainPoints = computed(() => (audienceSummary.value?.pain_points ?? []).slice(0, 4))

const topMotivations = computed(() => (audienceSummary.value?.motivations ?? []).slice(0, 4))

const personas = computed(() => props.context.personas ?? [])

const services = computed(() => props.context.services ?? [])

function personaTitle(index: number): string {
  return t('bc.persona', { n: index + 1 })
}

function painOf(persona: BrandContextPersona): string[] {
  return (persona.pain_points ?? []).slice(0, 3)
}

function motivationsOf(persona: BrandContextPersona): string[] {
  return (persona.motivations ?? []).slice(0, 3)
}

function personaText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value
  return null
}
</script>

<template>
  <div class="space-y-4" data-testid="brand-context-panel">
    <!-- Audience summary (compact) -->
    <div v-if="audienceSummary" class="space-y-2" data-testid="brand-context-audience">
      <p v-if="audienceSummary.summary" class="text-xs text-muted-foreground leading-relaxed">
        {{ audienceSummary.summary }}
      </p>
      <div v-if="topPainPoints.length" class="flex flex-wrap gap-1">
        <span
          v-for="pp in topPainPoints"
          :key="`pp-${pp}`"
          class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80"
        >
          {{ pp }}
        </span>
      </div>
      <div v-if="topMotivations.length" class="flex flex-wrap gap-1">
        <span
          v-for="m in topMotivations"
          :key="`m-${m}`"
          class="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success/80"
        >
          {{ m }}
        </span>
      </div>
    </div>

    <!-- Persona segment cards -->
    <div v-if="personas.length" class="grid sm:grid-cols-2 gap-2" data-testid="brand-context-personas">
      <div
        v-for="(persona, idx) in personas"
        :key="idx"
        class="rounded-lg border border-border/50 bg-overlay-subtle p-3 space-y-1.5 min-w-0"
      >
        <div class="flex items-center gap-2">
          <span
            class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
            :class="persona.segment === 'primary' ? 'bg-primary/15 text-primary' : 'bg-overlay-light text-muted-foreground'"
          >
            {{ persona.segment === 'secondary' ? t('bc.secondary') : t('bc.primary') }}
          </span>
          <span class="text-xs font-medium truncate">{{ personaTitle(idx) }}</span>
        </div>
        <p v-if="personaText(persona.summary)" class="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {{ personaText(persona.summary) }}
        </p>
        <p v-else-if="personaText(persona.demographics)" class="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {{ personaText(persona.demographics) }}
        </p>
        <div v-if="painOf(persona).length" class="flex flex-wrap gap-1">
          <span v-for="pp in painOf(persona)" :key="`ppp-${idx}-${pp}`" class="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive/80">
            {{ pp }}
          </span>
        </div>
        <div v-if="motivationsOf(persona).length" class="flex flex-wrap gap-1">
          <span v-for="m in motivationsOf(persona)" :key="`pm-${idx}-${m}`" class="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/80">
            {{ m }}
          </span>
        </div>
      </div>
    </div>

    <!-- Services -->
    <div v-if="services.length" data-testid="brand-context-services">
      <div class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
        <Sparkles class="h-3 w-3" /> {{ t('bc.services') }}
      </div>
      <div class="flex flex-wrap gap-1.5">
        <span
          v-for="svc in services"
          :key="svc"
          class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border/60 bg-overlay-subtle text-[11px] text-foreground/80"
        >
          <Users class="h-2.5 w-2.5 text-muted-foreground" /> {{ svc }}
        </span>
      </div>
    </div>
  </div>
</template>
