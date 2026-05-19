<script setup lang="ts">
import { computed, ref } from 'vue'
import { MonitorSmartphone, Loader2, Check, Shield } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const isPrereqMet = computed(() => props.campaign.content_strategy_completed)

const platforms: { key: 'meta' | 'google' | 'linkedin'; label: string }[] = [
  { key: 'meta', label: 'Meta (Facebook & Instagram)' },
  { key: 'google', label: 'Google Ads' },
  { key: 'linkedin', label: 'LinkedIn Ads' },
]

const selected = ref<Set<string>>(new Set())
const savedPlatforms = computed(() => (props.campaign.context_payload as any)?.selected_platforms ?? [])
const isAlreadySaved = computed(() => savedPlatforms.value.length > 0)
const saving = ref(false)
const error = ref<string | null>(null)

function togglePlatform(key: string) {
  if (selected.value.has(key)) selected.value.delete(key)
  else selected.value.add(key)
}

function isSelected(key: string): boolean {
  return selected.value.has(key) || savedPlatforms.value.includes(key)
}

async function savePlatforms() {
  const platformsToSave = Array.from(selected.value)
  if (platformsToSave.length === 0) return
  const opKey = `${props.campaignUuid}:platform-selection`
  if (!operationManager.canStart(opKey)) return
  operationManager.start(opKey)
  saving.value = true
  error.value = null
  try {
    await campaignsApi.update(props.campaignUuid, {
      context_payload: {
        ...(props.campaign.context_payload as any),
        selected_platforms: platformsToSave,
      },
    })
    emit('completed')
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? 'Failed to save'
  } finally {
    saving.value = false
    operationManager.finish(opKey)
  }
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <MonitorSmartphone class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 6 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s6') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('platform.description') }}</p>
      </div>
    </header>

    <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('platform.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('platform.prereqDesc') }}</div>
    </div>

    <template v-else>
      <!-- Already saved -->
      <div v-if="isAlreadySaved && selected.size === 0" class="surface-card p-8 text-center">
        <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
          <Check class="h-5 w-5 text-success" />
        </div>
        <div class="text-sm font-medium mb-1">{{ t('platform.saved') }}</div>
        <div class="text-xs text-muted-foreground mb-3">
          {{ savedPlatforms.map((p: string) => platforms.find(pl => pl.key === p)?.label ?? p).join(', ') }}
        </div>
        <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition mx-auto" @click="selected = new Set(savedPlatforms)">
          {{ t('platform.edit') }}
        </button>
      </div>

      <!-- Selection -->
      <div v-if="!isAlreadySaved || selected.size > 0" class="space-y-3">
        <div
          v-for="p in platforms"
          :key="p.key"
          :class="['surface-card p-4 flex items-center gap-4 cursor-pointer transition', isSelected(p.key) ? 'border-primary/60' : 'hover:border-primary/30']"
          @click="togglePlatform(p.key)"
        >
          <div :role="'checkbox'" :aria-checked="isSelected(p.key)" tabindex="0" @keydown.space.prevent="togglePlatform(p.key)" :class="['h-5 w-5 rounded border-2 grid place-items-center shrink-0 transition', isSelected(p.key) ? 'bg-primary border-primary' : 'border-border/60']">
            <Check v-if="isSelected(p.key)" class="h-3 w-3 text-primary-foreground" />
          </div>
          <div class="flex-1"><div class="text-sm font-medium">{{ p.label }}</div></div>
        </div>
      </div>

      <div v-if="error" class="surface-card p-4 flex items-center gap-3">
        <div class="text-sm text-destructive">{{ error }}</div>
      </div>

      <button
        v-if="!isAlreadySaved || selected.size > 0"
        :disabled="selected.size === 0 || saving"
        class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
        @click="savePlatforms"
      >
        <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" />
        {{ saving ? t('platform.saving') : t('platform.saveContinue') }}
      </button>
    </template>
  </div>
</template>
