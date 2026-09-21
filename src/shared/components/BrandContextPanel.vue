<script setup lang="ts">
import { computed } from 'vue'
import { Users, Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { BrandContext, BrandContextPersona } from '@/features/campaigns/types'

/**
 * "Reused from Brand Analysis" panel (M-H8): read-only view of the campaign's
 * brand_context — persona segment cards and services.
 *
 * The backend `audience_summary` mirrors the SAME primary/secondary segments
 * as `personas` (both come from `target_audience`), so the separate
 * audience-summary block was removed in favor of the persona cards — one
 * formatter renders the segment objects defensively.
 *
 * Purely presentational; parents decide visibility (brand_context.available).
 */
const props = defineProps<{ context: BrandContext }>()

const { t } = useI18n()

const personas = computed(() => props.context.personas ?? [])

const services = computed(() => props.context.services ?? [])

function personaTitle(index: number): string {
  return t('bc.persona', { n: index + 1 })
}

/**
 * Defensive formatter for arbitrary LLM-produced segment values: strings pass
 * through; arrays are joined; objects become "Label: value" pairs (keys are
 * humanized, never localized — the data itself is LLM English).
 */
function segmentText(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => segmentText(item))
      .filter((part): part is string => !!part)
    return parts.length ? parts.join(' · ') : null
  }
  if (value && typeof value === 'object') {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const rendered = segmentText(val)
        return rendered ? `${humanizeKey(key)}: ${rendered}` : null
      })
      .filter((part): part is string => !!part)
    return parts.length ? parts.join(' · ') : null
  }
  return null
}

function humanizeKey(key: string): string {
  return key.replace(/[_-]+/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

function summaryOf(persona: BrandContextPersona): string | null {
  return segmentText(persona.summary) ?? segmentText(persona.description)
}

function chipsOf(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map((item) => segmentText(item))
    .filter((item): item is string => !!item)
    .slice(0, 3)
}

function painOf(persona: BrandContextPersona): string[] {
  return chipsOf(persona.pain_points)
}

function motivationsOf(persona: BrandContextPersona): string[] {
  return chipsOf(persona.motivations)
}
</script>

<template>
  <div class="space-y-4" data-testid="brand-context-panel">
    <!-- Persona segment cards (render both audience_summary and personas data) -->
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
        <p v-if="summaryOf(persona)" class="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {{ summaryOf(persona) }}
        </p>
        <div v-if="segmentText(persona.demographics)" class="space-y-0.5">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">{{ t('bc.demographics') }}</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            {{ segmentText(persona.demographics) }}
          </p>
        </div>
        <div v-if="segmentText(persona.psychographics)" class="space-y-0.5">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">{{ t('bc.psychographics') }}</div>
          <p class="text-[11px] text-muted-foreground leading-relaxed">
            {{ segmentText(persona.psychographics) }}
          </p>
        </div>
        <div v-if="painOf(persona).length" class="space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">{{ t('bc.painPoints') }}</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="pp in painOf(persona)" :key="`ppp-${idx}-${pp}`" class="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive/80">
              {{ pp }}
            </span>
          </div>
        </div>
        <div v-if="motivationsOf(persona).length" class="space-y-1">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground">{{ t('bc.motivations') }}</div>
          <div class="flex flex-wrap gap-1">
            <span v-for="m in motivationsOf(persona)" :key="`pm-${idx}-${m}`" class="text-[10px] px-1.5 py-0.5 rounded bg-success/10 text-success/80">
              {{ m }}
            </span>
          </div>
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
