<script setup lang="ts">
import { computed, ref } from 'vue'
import { MonitorSmartphone, Loader2, Check, Shield, Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useRecommendPlatforms } from '@/features/campaigns/queries'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { useToast } from '@/shared/composables/useToast'
import PlatformRecommendationDetails from '@/features/campaigns/components/PlatformRecommendationDetails.vue'
import PlatformRecommendationSummary from '@/features/campaigns/components/PlatformRecommendationSummary.vue'
import { getPlatformRecommendations } from '@/features/campaigns/types'
import type { Campaign, PlatformRecommendation, PlatformRecommendationsResult } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const isPrereqMet = computed(() => props.campaign.content_strategy_completed)

const platforms = computed<{ key: 'meta' | 'google' | 'linkedin'; label: string }[]>(() => [
  { key: 'meta', label: t('platform.meta') },
  { key: 'google', label: t('platform.google') },
  { key: 'linkedin', label: t('platform.linkedin') },
])

const selected = ref<Set<string>>(new Set())
const savedPlatforms = computed(() => (props.campaign.context_payload as any)?.selected_platforms ?? [])
const isAlreadySaved = computed(() => savedPlatforms.value.length > 0)
const saving = ref(false)
const error = ref<string | null>(null)

// ── AI platform recommendation (F15/C5) ──
// In-session result wins; otherwise fall back to what the backend persisted in
// context_payload.platform_recommendations. Informs the choice — never selects.
const toast = useToast()
const recommendMutation = useRecommendPlatforms(computed(() => props.campaignUuid))
const fetchedRecs = ref<PlatformRecommendationsResult | null>(null)
const persistedRecs = computed(() => getPlatformRecommendations(props.campaign))
const activeRecs = computed(() => fetchedRecs.value ?? persistedRecs.value)
const recByPlatform = computed<Record<string, PlatformRecommendation>>(() => {
  const map: Record<string, PlatformRecommendation> = {}
  for (const r of activeRecs.value?.recommendations ?? []) map[r.platform] = r
  return map
})
const recommending = computed(() => recommendMutation.isPending.value)

async function fetchRecommendation() {
  if (recommending.value) return
  try {
    fetchedRecs.value = await recommendMutation.mutateAsync()
  } catch {
    // Graceful fallback: static cards remain usable; nothing is auto-selected.
    toast.error(t('platform.recFailed'))
  }
}

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
      <!-- AI platform recommendation (F15/C5) — informs, never auto-selects -->
      <div>
        <div v-if="!activeRecs" class="flex items-center flex-wrap gap-3 justify-between">
          <div class="flex items-center gap-2 text-xs text-muted-foreground">
            <Sparkles class="h-4 w-4 text-primary shrink-0" />
            <span>{{ t('platform.recTitle') }}</span>
          </div>
          <button
            class="h-10 px-4 rounded-lg border border-primary/40 text-primary text-xs font-medium hover:bg-primary/10 transition flex items-center gap-1.5 disabled:opacity-50 w-full sm:w-auto justify-center"
            data-testid="rec-button"
            data-loc="wizard.platform.rec-btn"
            :disabled="recommending"
            @click="fetchRecommendation"
          >
            <Loader2 v-if="recommending" class="h-3.5 w-3.5 animate-spin" />
            <Sparkles v-else class="h-3.5 w-3.5" />
            {{ recommending ? t('platform.recLoading') : t('platform.recButton') }}
          </button>
        </div>
        <PlatformRecommendationSummary v-else :result="activeRecs" />
      </div>

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
          :class="['surface-card p-4 space-y-2 cursor-pointer transition', isSelected(p.key) ? 'border-primary/60' : 'hover:border-primary/30']"
          :data-testid="`platform-card-${p.key}`"
          @click="togglePlatform(p.key)"
        >
          <div class="flex items-center gap-4">
            <div :role="'checkbox'" :aria-checked="isSelected(p.key)" tabindex="0" @keydown.space.prevent="togglePlatform(p.key)" :class="['h-5 w-5 rounded border-2 grid place-items-center shrink-0 transition', isSelected(p.key) ? 'bg-primary border-primary' : 'border-border/60']">
              <Check v-if="isSelected(p.key)" class="h-3 w-3 text-primary-foreground" />
            </div>
            <div class="flex-1"><div class="text-sm font-medium">{{ p.label }}</div></div>
          </div>
          <div v-if="recByPlatform[p.key]" @click.stop>
            <PlatformRecommendationDetails :rec="recByPlatform[p.key]" />
          </div>
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
