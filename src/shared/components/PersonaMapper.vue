<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/shared/utils/i18n'

export interface PersonaMapData {
  personas: string[]
  funnelStages: string[]
  platforms: string[]
  matrix?: Record<string, number>
}

const props = defineProps<{ data: PersonaMapData }>()
const { t } = useI18n()

const STAGE_COLORS: Record<string, string> = {
  TOFU: 'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  MOFU: 'bg-primary/20 text-primary border-primary/30',
  BOFU: 'bg-success/20 text-success border-success/30',
}

const PLATFORM_COLORS: Record<string, string> = {
  meta: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  google: 'bg-green-500/20 text-green-400 border-green-500/30',
  linkedin: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  tiktok: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
}

const PERSONA_COLORS = [
  'bg-accent-magenta/20 text-accent-magenta border-accent-magenta/30',
  'bg-accent-amber/20 text-accent-amber border-accent-amber/30',
  'bg-accent-cyan/20 text-accent-cyan border-accent-cyan/30',
  'bg-success/20 text-success border-success/30',
  'bg-primary/20 text-primary border-primary/30',
  'bg-destructive/20 text-destructive border-destructive/30',
]

function cellKey(persona: string, stage: string, platform: string): string {
  return `${persona}-${stage}-${platform}`
}

function getHeatLevel(persona: string, stage: string, platform: string): number {
  const key = cellKey(persona, stage, platform)
  const val = props.data.matrix?.[key]
  if (val !== undefined) return Math.min(val, 3)
  // Default heat based on common patterns
  if (stage === 'TOFU' && (platform === 'meta' || platform === 'tiktok')) return 3
  if (stage === 'MOFU' && platform === 'meta') return 2
  if (stage === 'BOFU' && platform === 'google') return 3
  return 1
}

const heatClasses = [
  'bg-overlay-subtle border-border/30',
  'bg-primary/5 border-primary/20',
  'bg-primary/10 border-primary/30',
  'bg-primary/20 border-primary/40',
]

const hasData = computed(() => props.data.personas.length > 0 && props.data.funnelStages.length > 0)
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="text-sm font-semibold">{{ t('persona.title') }}</h3>
      <p class="text-xs text-muted-foreground">{{ t('persona.subtitle') }}</p>
    </div>

    <div v-if="!hasData" class="surface-card p-8 text-center text-sm text-muted-foreground">
      No persona data available. Run segmentation first.
    </div>

    <!-- Persona × Funnel Matrix -->
    <div v-else class="surface-card p-4 overflow-x-auto">
      <table class="w-full text-xs border-collapse min-w-[600px]">
        <thead>
          <tr>
            <th class="p-2 text-start text-muted-foreground font-medium" />
            <th
              v-for="stage in data.funnelStages"
              :key="stage"
              class="p-2 text-center font-medium"
            >
              <span :class="['text-[11px] px-2 py-1 rounded-full border', STAGE_COLORS[stage] ?? 'border-border/60 text-muted-foreground']">
                {{ stage }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(persona, pi) in data.personas" :key="persona">
            <td class="p-2">
              <span :class="['text-[11px] px-2 py-1 rounded-full border', PERSONA_COLORS[pi % PERSONA_COLORS.length]]">
                {{ persona }}
              </span>
            </td>
            <td
              v-for="stage in data.funnelStages"
              :key="stage"
              class="p-1"
            >
              <div
                :class="['rounded-lg border p-2 text-center transition cursor-default', heatClasses[getHeatLevel(persona, stage, 'meta')]]"
              >
                <div class="text-[11px] text-muted-foreground mb-1">Content ideas</div>
                <div class="flex justify-center gap-1">
                  <span
                    v-for="platform in data.platforms"
                    :key="platform"
                    :class="['inline-block h-2 w-2 rounded-full', PLATFORM_COLORS[platform]?.split(' ')[0] ?? 'bg-muted']"
                    :title="platform"
                  />
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Legend -->
      <div class="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-border/40">
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-muted-foreground">Stages:</span>
          <span v-for="stage in data.funnelStages" :key="stage" :class="['text-[11px] px-1.5 py-0.5 rounded-full border', STAGE_COLORS[stage] ?? '']">
            {{ stage }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-muted-foreground">Platforms:</span>
          <span
            v-for="platform in data.platforms"
            :key="platform"
            :class="['text-[11px] px-1.5 py-0.5 rounded-full border', PLATFORM_COLORS[platform] ?? '']"
          >
            {{ platform }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-muted-foreground">Heat:</span>
          <span v-for="i in 4" :key="i" :class="['inline-block h-3 w-6 rounded border', heatClasses[i - 1]]" />
        </div>
      </div>
    </div>
  </div>
</template>
