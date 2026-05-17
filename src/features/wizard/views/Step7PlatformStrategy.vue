<script setup lang="ts">
import { computed, ref } from 'vue'
import { Settings2, Loader2, AlertCircle, RefreshCw, Check, Shield } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const selectedPlatforms = computed(() => (props.campaign.context_payload as any)?.selected_platforms ?? [])
const isPrereqMet = computed(() => props.campaign.content_strategy_completed && selectedPlatforms.value.length > 0)

const results = computed(() => {
  const map = new Map<string, { completed: boolean }>()
  for (const platform of selectedPlatforms.value) {
    const key = `${platform}_ads_completed` as keyof typeof props.campaign
    if (props.campaign[key]) map.set(platform, { completed: true })
  }
  return map
})

const allDone = computed(() => selectedPlatforms.value.length > 0 && selectedPlatforms.value.every((p: string) => results.value.get(p)?.completed))

const currentPlatform = ref<string | null>(null)
const opKey = computed(() => `${props.campaignUuid}:ads-strategy`)
const { data: stepResult, loading, error, run } = useAsyncOperation<any>()

async function runStrategy(platform: string) {
  if (!operationManager.canStart(opKey.value)) return
  currentPlatform.value = platform
  operationManager.start(opKey.value)
  try {
    await run(async () => (await campaignsApi.runAdsStrategy(props.campaignUuid, { platform: platform as any })).data)
    emit('completed')
  } finally {
    operationManager.finish(opKey.value)
  }
}

function platformLabel(key: string) {
  const map: Record<string, string> = { meta: 'Meta (Facebook & Instagram)', google: 'Google Ads', linkedin: 'LinkedIn Ads' }
  return map[key] ?? key
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Settings2 class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 7 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s7') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('strategy.description') }}</p>
      </div>
    </header>

    <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('strategy.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('strategy.prereqDesc') }}</div>
    </div>

    <template v-else>
      <div v-if="allDone && !stepResult" class="surface-card p-8 text-center">
        <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
          <Check class="h-5 w-5 text-success" />
        </div>
        <div class="text-sm font-medium mb-1">{{ t('strategy.allComplete') }}</div>
        <div class="text-xs text-muted-foreground">{{ t('strategy.allCompleteDesc') }}</div>
      </div>

      <div class="space-y-3">
        <div v-for="p in selectedPlatforms" :key="p" class="surface-card p-5">
          <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div class="flex items-center gap-3">
              <div class="h-8 w-8 rounded-lg bg-white/[0.05] grid place-items-center">
                <Settings2 class="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <div class="text-sm font-semibold">{{ platformLabel(p) }}</div>
                <div class="text-[11px] text-muted-foreground">{{ results.get(p)?.completed ? t('status.completed') : t('strategy.pending') }}</div>
              </div>
            </div>
            <button
              v-if="!results.get(p)?.completed"
              :disabled="loading && currentPlatform === p"
              class="h-8 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-[11px] font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50"
              @click="runStrategy(p)"
            >
              <Loader2 v-if="loading && currentPlatform === p" class="h-3 w-3 animate-spin" />
              <Settings2 v-else class="h-3 w-3" />
              {{ loading && currentPlatform === p ? t('strategy.running') : t('strategy.runStrategy') }}
            </button>
            <div v-else class="flex items-center gap-1.5 text-success text-xs">
              <Check class="h-3.5 w-3.5" /> {{ t('status.completed') }}
            </div>
          </div>
          <div v-if="loading && currentPlatform === p" class="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 class="h-3 w-3 animate-spin" /> {{ t('strategy.runningDesc') }}
          </div>
        </div>
      </div>

      <div v-if="error" class="surface-card p-4 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="currentPlatform && runStrategy(currentPlatform)">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
        </button>
      </div>

      <div v-if="stepResult?.step?.response_payload" class="surface-card p-5">
        <div class="text-xs font-semibold mb-2">{{ t('strategy.result') }}</div>
        <div class="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
          {{ typeof stepResult.step.response_payload === 'string' ? stepResult.step.response_payload : JSON.stringify(stepResult.step.response_payload, null, 2) }}
        </div>
      </div>
    </template>
  </div>
</template>
