<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Users, AlertCircle, RefreshCw, Check, ShoppingBag } from 'lucide-vue-next'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import SegmentDeepResearchRenderer from '@/shared/components/renderers/SegmentDeepResearchRenderer.vue'
import CountryCitySelect from '@/shared/components/CountryCitySelect.vue'
import PersonaSelector from '@/shared/components/PersonaSelector.vue'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import StepReviewActions from '@/features/campaigns/components/StepReviewActions.vue'
import { composeLocation, resolveTargetMarket, type TargetMarket } from '@/features/campaigns/types'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const businessType = ref('')
const productDescription = ref('')

// Structured target market (F19): country/city via CountryCitySelect, seeded
// from a previous run's context_payload.target_market or best-effort from the
// brand's free-text location. The legacy location is composed "City, Country".
const targetMarket = ref<TargetMarket>(resolveTargetMarket(props.campaign))

// Persona targeting (MOM): which personas the funnel generation should use.
// Empty selection = all personas. Prefilled once from the server-persisted
// context_payload.selected_personas and never clobbered after a user edit.
// initialSelection remembers the persisted selection so a later deselect-all
// can send an explicit `personas: []` and clear the stale server value.
const selectedPersonas = ref<string[]>([])
const initialSelection = ref<string[]>([])
const selectionTouched = ref(false)

watch(
  () => props.campaign.context_payload,
  (payload) => {
    if (selectionTouched.value) return
    const stored = (payload as { selected_personas?: unknown })?.selected_personas
    if (Array.isArray(stored)) {
      const seeded = stored.filter((n): n is string => typeof n === 'string')
      selectedPersonas.value = seeded
      initialSelection.value = [...seeded]
    }
  },
  { immediate: true },
)

const opKey = computed(() => `${props.campaignUuid}:segmentation`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => result.value?.step)
const isAlreadyCompleted = computed(() => props.campaign.segmentation_completed)

const segments = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return []
  const segs = payload.segments ?? payload.personas ?? payload.data?.segments ?? []
  return Array.isArray(segs) ? segs : []
})

const personas = computed(() =>
  segments.value.map((seg: any) => ({ name: seg.name || seg.persona_name || '' })),
)

const deepResearch = computed(() => stepData.value?.response_payload?.deep_research ?? {})

/**
 * Personas payload for the run request: a non-empty selection is sent as-is;
 * an empty selection sends an explicit `[]` only when the user cleared a
 * previously persisted selection (deselect-all), else omits the key entirely.
 */
function personasPayload(): string[] | undefined {
  if (selectedPersonas.value.length) return selectedPersonas.value
  if (selectionTouched.value && initialSelection.value.length) return []
  return undefined
}

// Review state restore: prefer the run just returned, else the persisted
// latest segmentation step on the campaign.
const reviewState = computed(() => {
  const fromResult = result.value?.step
  if (fromResult?.review_status != null) return fromResult
  return (props.campaign as any)?.latest_steps?.segmentation
})

async function runSegmentation(feedback?: string | Event) {
  // The same fn doubles as a click handler — never send an Event as feedback.
  const refinementFeedback = typeof feedback === 'string' ? feedback : undefined
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const res = await campaignsApi.runSegmentation(props.campaignUuid, {
        business_type: businessType.value || undefined,
        location: composeLocation(targetMarket.value) || undefined,
        country: targetMarket.value.country.trim() || undefined,
        city: targetMarket.value.city.trim() || undefined,
        product_description: productDescription.value || undefined,
        include_deep_research: true,
        // Explicit empty list only when the user CLEARED a persisted selection;
        // otherwise omit so the backend leaves any stored selection untouched.
        personas: personasPayload(),
        refinement_feedback: refinementFeedback,
      })
      return res.data
    })
    emit('completed')
  } finally {
    operationManager.finish(opKey.value)
  }
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <Users class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 2 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s2') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('seg.description') }}</p>
      </div>
    </header>

    <!-- Input form -->
    <div v-if="!stepData && !loading && !isAlreadyCompleted" class="surface-card p-5 space-y-4">
      <div>
        <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.businessType') }}</label>
        <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
          <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input v-model="businessType" :placeholder="t('seg.businessTypeHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
        </div>
      </div>
      <div>
        <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.targetMarket') }}</label>
        <CountryCitySelect v-model="targetMarket" />
      </div>
      <div>
        <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.productDesc') }}</label>
        <textarea v-model="productDescription" :placeholder="t('seg.productDescHint')" rows="3" class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 resize-none" />
      </div>
      <button class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5" @click="runSegmentation">
        <Users class="h-3.5 w-3.5" /> {{ t('seg.runSegmentation') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="surface-card p-8">
      <AiLoadingAnimation :message="t('seg.analyzing')" :description="t('seg.analyzingDesc')" />
    </div>

    <!-- Already completed -->
    <div v-if="isAlreadyCompleted && !stepData && !loading" class="surface-card p-8 text-center">
      <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
        <Check class="h-5 w-5 text-success" />
      </div>
      <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
      <div class="text-xs text-muted-foreground mb-4">{{ t('seg.alreadyCompletedDesc') }}</div>
      <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition mx-auto" @click="runSegmentation">
        <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="surface-card p-5 flex items-center gap-3">
      <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
      <div class="flex-1 text-sm text-destructive">{{ error }}</div>
      <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runSegmentation">
        <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
      </button>
    </div>

    <!-- Results -->
    <div v-if="stepData && !loading">
      <div class="flex items-center justify-between mb-4">
        <div class="text-xs text-muted-foreground">{{ t('seg.segmentsFound', { count: segments.length }) }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runSegmentation">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
        </button>
      </div>

      <!-- Persona targeting (MOM): pick which personas the funnel targets -->
      <div v-if="personas.length" class="surface-card p-5 space-y-2.5 mt-4">
        <div class="text-xs font-semibold">{{ t('seg.personaPickerTitle') }}</div>
        <div class="text-[11px] text-muted-foreground">{{ t('seg.personaPickerHint') }}</div>
        <PersonaSelector
          v-model="selectedPersonas"
          :personas="personas"
          @update:model-value="selectionTouched = true"
        />
        <div class="text-[11px] text-muted-foreground" data-testid="persona-all-note">{{ t('seg.personaPickerAll') }}</div>
      </div>

      <div class="grid sm:grid-cols-2 gap-3">
        <div v-for="(seg, idx) in segments" :key="idx" class="surface-card p-5 space-y-3">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center text-primary-foreground text-xs font-bold">{{ idx + 1 }}</div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">{{ seg.name || seg.persona_name || `${t('seg.persona')} ${idx + 1}` }}</div>
              <div v-if="seg.age_range || seg.demographics" class="text-[11px] text-muted-foreground">{{ seg.age_range || '' }} {{ seg.demographics?.gender || '' }}</div>
            </div>
          </div>
          <div v-if="seg.goals?.length" class="flex flex-wrap gap-1">
            <span v-for="goal in seg.goals.slice(0, 4)" :key="goal" class="text-[11px] px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">{{ goal }}</span>
          </div>
          <p v-if="seg.messaging_approach || seg.description" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">{{ seg.messaging_approach || seg.description }}</p>
          <div v-if="seg.pain_points?.length" class="space-y-1">
            <div class="text-[11px] uppercase tracking-wider text-muted-foreground">{{ t('seg.painPoints') }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="pp in seg.pain_points.slice(0, 3)" :key="pp" class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80">{{ pp }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="Object.keys(deepResearch).length" class="surface-card p-5 mt-4">
        <div class="text-xs font-semibold mb-3">{{ t('seg.deepResearch') }}</div>
        <SegmentDeepResearchRenderer :data="deepResearch" />
      </div>

      <!-- Approve / Reject / Refine -->
      <StepReviewActions
        class="mt-4"
        :campaign-uuid="campaignUuid"
        step-type="segmentation"
        :review-status="reviewState?.review_status"
        :reject-reason="reviewState?.reject_reason"
        :run-step="runSegmentation"
      />
    </div>
  </div>
</template>
