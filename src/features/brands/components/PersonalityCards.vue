<script setup lang="ts">
import { Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import type { PersonalityData } from './personality'

const props = defineProps<{
  data: PersonalityData
}>()

const { t } = useI18n()

const fields = () => {
  const d = props.data
  return [
    { key: 'tone', label: t('analysis.personality.tone' as any), value: d.tone },
    { key: 'persona', label: t('analysis.personality.persona' as any), value: d.persona },
    { key: 'writingStyle', label: t('analysis.personality.writingStyle' as any), value: d.writingStyle },
  ].filter((f) => f.value)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Archetype hero card -->
    <div
      v-if="data.archetype"
      data-testid="personality-archetype"
      class="flex items-center gap-3 p-3.5 rounded-xl bg-[image:var(--gradient-brand)]/10 border border-primary/20"
    >
      <div class="h-9 w-9 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center shrink-0">
        <Sparkles class="h-4.5 w-4.5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] uppercase tracking-wide text-muted-foreground">
          {{ t('analysis.personality.archetype' as any) }}
        </div>
        <div class="text-sm font-semibold truncate">{{ data.archetype }}</div>
      </div>
    </div>

    <!-- Attribute cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div
        v-for="field in fields()"
        :key="field.key"
        data-testid="personality-card"
        class="p-3 rounded-lg border border-border/50 bg-overlay-subtle/50 space-y-1"
      >
        <div class="text-[11px] text-muted-foreground">{{ field.label }}</div>
        <div class="text-sm font-medium">{{ field.value }}</div>
      </div>
    </div>

    <!-- Voice attribute chips -->
    <div v-if="data.voiceAttributes.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-[11px] text-muted-foreground me-1">
        {{ t('analysis.personality.voiceAttributes' as any) }}:
      </span>
      <span
        v-for="attr in data.voiceAttributes"
        :key="attr"
        data-testid="voice-attribute-chip"
        class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
      >
        {{ attr }}
      </span>
    </div>
  </div>
</template>
