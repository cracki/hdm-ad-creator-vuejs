<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Brain, ArrowLeft, ArrowRight, ShoppingBag, RefreshCw, Check } from 'lucide-vue-next'
import SegmentDeepResearchRenderer from '@/shared/components/renderers/SegmentDeepResearchRenderer.vue'
import StepExportButton from '@/shared/components/StepExportButton.vue'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import ErrorState from '@/shared/components/ErrorState.vue'
import CountryCitySelect from '@/shared/components/CountryCitySelect.vue'
import PersonaSelector from '@/shared/components/PersonaSelector.vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useConfetti } from '@/shared/composables/useConfetti'
import { useCampaign } from '../queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { useNormalizeResponse } from '@/shared/composables/useNormalizeResponse'
import { operationManager } from '@/infrastructure/operations/operationManager'
import { exportSegmentation } from '@/shared/utils/exportStep'
import { composeLocation, resolveTargetMarket, type TargetMarket } from '../types'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { normalize } = useNormalizeResponse()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const confetti = useConfetti()

const businessType = ref('')
const productDescription = ref('')

// Structured target market (F19): country/city via CountryCitySelect; the
// legacy free-text location is composed as "City, Country" for display.
const targetMarket = ref<TargetMarket>({ country: '', city: '' })

// Restore after reload: seed from context_payload.target_market persisted by
// a previous run, falling back to a best-effort country match on the brand's
// free-text location. Only seeds while the user hasn't typed anything.
watch(
  campaign,
  (c) => {
    if (!c) return
    if (!targetMarket.value.country && !targetMarket.value.city) {
      targetMarket.value = resolveTargetMarket(c)
    }
  },
  { immediate: true },
)

const opKey = computed(() => `${campaignUuid.value}:segmentation`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => {
  if (result.value?.step) return result.value.step
  const latest = (campaign.value as any)?.latest_steps?.segmentation
  if (latest?.status === 'completed') return latest
  return undefined
})
const isAlreadyCompleted = computed(() => campaign.value?.segmentation_completed ?? false)
const segments = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return []
  const segments = payload.segments ?? payload.personas ?? payload.data?.segments ?? []
  return Array.isArray(segments) ? segments : []
})
const personas = computed(() =>
  segments.value.map((s: any) => ({ name: s.name || s.persona_name || '' })),
)

// Persona targeting (MOM): which personas the funnel generation should use.
// Empty selection = all personas. Prefilled once from the server-persisted
// context_payload.selected_personas and never clobbered after a user edit.
// initialSelection remembers the persisted selection so a later deselect-all
// can send an explicit `personas: []` and clear the stale server value.
const selectedPersonas = ref<string[]>([])
const initialSelection = ref<string[]>([])
const selectionTouched = ref(false)

watch(
  () => (campaign.value as any)?.context_payload,
  (payload) => {
    if (selectionTouched.value) return
    const stored = (payload as { selected_personas?: unknown } | undefined)?.selected_personas
    if (Array.isArray(stored)) {
      const seeded = stored.filter((n): n is string => typeof n === 'string')
      selectedPersonas.value = seeded
      initialSelection.value = [...seeded]
    }
  },
  { immediate: true },
)
const deepResearch = computed(() => {
  const raw = stepData.value?.response_payload?.deep_research
  if (!raw || typeof raw !== 'object') return {}
  const result = normalize(raw as Record<string, unknown>, 'deep-research')
  const hasValues = Object.values(result).some((v) => v !== null && v !== undefined)
  return hasValues ? result : {}
})

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

async function runSegmentation() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const { campaignsApi } = await import('../api')
      const res = await campaignsApi.runSegmentation(campaignUuid.value, {
        business_type: businessType.value || undefined,
        location: composeLocation(targetMarket.value) || undefined,
        country: targetMarket.value.country.trim() || undefined,
        city: targetMarket.value.city.trim() || undefined,
        product_description: productDescription.value || undefined,
        include_deep_research: true,
        // Explicit empty list only when the user CLEARED a persisted selection;
        // otherwise omit so the backend leaves any stored selection untouched.
        personas: personasPayload(),
      })
      const payload = res.data?.step?.response_payload as any
      const rawSegments: any[] = payload?.data?.segments
        ?? payload?.segments ?? []
      const segments = rawSegments.map((s: any) => ({
        ...s,
        persona_name: s.persona_name || s.name || '',
      }))
      if (segments.length) {
        await campaignsApi.update(campaignUuid.value, {
          context_payload: {
            ...((campaign.value as any)?.context_payload ?? {}),
            segmentation_data: { segments },
          },
        })
      }
      return res.data
    })
  } finally {
    operationManager.finish(opKey.value)
  }
}

function goNext() {
  router.push(`/campaigns/${campaignUuid.value}/ppc-viability`)
}

const exporting = ref(false)
const hasExportData = computed(() => !!stepData.value?.response_payload)

async function handleExport(format: 'csv' | 'pdf' | 'pptx') {
  if (!stepData.value?.response_payload) return
  exporting.value = true
  try {
    await exportSegmentation(format, stepData.value.response_payload as Record<string, unknown>, {
      stepName: t('smart.s1'),
      campaignName: campaign.value?.name ?? 'Campaign',
      brandName: campaign.value?.brand?.company_name,
    })
    confetti.trigger()
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <Topbar :title="campaign?.name ?? ''" :subtitle="campaign?.brand?.company_name">
    <template #actions>
      <button
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
        @click="router.push(`/campaigns/${campaignUuid}`)"
      >
        {{ t('camp.backToCampaign') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <!-- Header -->
      <header class="flex items-start gap-4 mb-6">
        <div class="h-12 w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Brain class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 1 / 9</div>
          <h2 class="text-xl sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s1') }}</h2>
          <p class="text-sm text-muted-foreground mt-1">{{ t('seg.description') }}</p>
        </div>
      </header>

      <div v-if="campaignLoading" class="py-12">
        <AiLoadingAnimation :message="t('camp.loading')" size="sm" />
      </div>

      <template v-else>
        <!-- Input form (shown when no results yet and not already completed) -->
        <div v-if="!stepData && !loading && !isAlreadyCompleted" class="surface-card p-5 space-y-4 mb-6">
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.businessType') }}</label>
            <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
              <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input v-model="businessType" :placeholder="t('seg.businessTypeHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" data-loc="campaigns.segmentation.business-type-input" />
            </div>
          </div>
          <div data-loc="campaigns.segmentation.target-market">
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.targetMarket') }}</label>
            <CountryCitySelect v-model="targetMarket" />
          </div>
          <div>
            <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.productDesc') }}</label>
            <textarea
              v-model="productDescription"
              :placeholder="t('seg.productDescHint')"
              rows="3"
              class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 resize-none"
              data-loc="campaigns.segmentation.product-desc-input"
            />
          </div>

          <button
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
            data-loc="campaigns.segmentation.run-btn"
            @click="runSegmentation"
          >
            <Brain class="h-3.5 w-3.5" /> {{ t('seg.runSegmentation') }}
          </button>
        </div>

        <!-- Loading state -->
        <div v-if="loading" class="surface-card p-8">
          <AiLoadingAnimation :message="t('seg.analyzing')" :description="t('seg.analyzingDesc')" />
        </div>

        <!-- Already completed (no data from latest_steps either) -->
        <div v-if="isAlreadyCompleted && !stepData && !loading" class="surface-card p-8 text-center mb-6">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('seg.alreadyCompletedDesc') }}</div>
          <div class="flex items-center justify-center gap-3">
            <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runSegmentation">
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
            <button
              class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              @click="goNext"
            >
              {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <!-- Error -->
        <ErrorState v-if="error" :message="error" :retry-label="t('seg.retry')" class="mb-6" @retry="runSegmentation" />

        <!-- Results -->
        <div v-if="stepData && !loading">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs text-muted-foreground">{{ t('seg.segmentsFound', { count: segments.length }) }}</div>
            <div class="flex items-center gap-2">
              <StepExportButton :disabled="!hasExportData || exporting" @export="handleExport" />
              <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runSegmentation">
                <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
              </button>
            </div>
          </div>

          <!-- Persona targeting (MOM): pick which personas the funnel targets -->
          <div v-if="personas.length" class="surface-card p-5 space-y-2.5 mb-6">
            <div class="text-xs font-semibold">{{ t('seg.personaPickerTitle') }}</div>
            <div class="text-[11px] text-muted-foreground">{{ t('seg.personaPickerHint') }}</div>
            <PersonaSelector
              v-model="selectedPersonas"
              :personas="personas"
              @update:model-value="selectionTouched = true"
            />
            <div class="text-[11px] text-muted-foreground" data-testid="persona-all-note">{{ t('seg.personaPickerAll') }}</div>
          </div>

          <div class="grid sm:grid-cols-2 gap-3 mb-6">
            <div
              v-for="(seg, idx) in segments"
              :key="idx"
              class="surface-card p-5 space-y-3 overflow-hidden min-w-0"
            >
              <div class="flex items-center gap-3">
                <div class="h-9 w-9 rounded-lg bg-[image:var(--gradient-brand)] grid place-items-center text-primary-foreground text-xs font-bold shrink-0">
                  {{ idx + 1 }}
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-semibold truncate">{{ seg.name || seg.persona_name || `${t('seg.persona')} ${idx + 1}` }}</div>
                  <div v-if="seg.demographic_profile?.key_identifiers?.age_range || seg.age_range" class="text-[11px] text-muted-foreground truncate">
                    {{ seg.demographic_profile?.key_identifiers?.age_range || seg.age_range }}
                  </div>
                </div>
              </div>

              <p v-if="seg.goals_motivations?.primary_goal" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {{ seg.goals_motivations.primary_goal }}
              </p>
              <p v-else-if="seg.strategic_approach?.value_proposition" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {{ seg.strategic_approach.value_proposition }}
              </p>
              <p v-else-if="seg.messaging_approach || seg.description" class="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {{ seg.messaging_approach || seg.description }}
              </p>

              <div v-if="seg.goals_motivations?.secondary_goals?.length" class="flex flex-wrap gap-1">
                <span v-for="goal in seg.goals_motivations.secondary_goals.slice(0, 3)" :key="goal" class="text-[11px] px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">
                  {{ goal }}
                </span>
              </div>

              <div v-if="seg.pain_points?.functional_pains?.length" class="space-y-1">
                <div class="text-[11px] uppercase tracking-wider text-muted-foreground">{{ t('seg.painPoints') }}</div>
                <div class="flex flex-wrap gap-1">
                  <span v-for="pp in seg.pain_points.functional_pains.slice(0, 3)" :key="pp" class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80">
                    {{ pp }}
                  </span>
                </div>
              </div>
              <div v-else-if="Array.isArray(seg.pain_points) && seg.pain_points.length" class="space-y-1">
                <div class="text-[11px] uppercase tracking-wider text-muted-foreground">{{ t('seg.painPoints') }}</div>
                <div class="flex flex-wrap gap-1">
                  <template v-for="(pp, pi) in seg.pain_points.slice(0, 3)" :key="pi">
                    <span class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80">
                      {{ typeof pp === 'string' ? pp : (pp as Record<string, unknown>).pain ?? pp }}
                    </span>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- Deep research -->
          <div v-if="Object.keys(deepResearch).length" class="surface-card p-5 mb-6">
            <div class="text-xs font-semibold mb-3">{{ t('seg.deepResearch') }}</div>
            <SegmentDeepResearchRenderer :data="deepResearch" />
          </div>

          <!-- Next -->
          <div class="flex items-center justify-end">
            <button
              class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              data-loc="campaigns.segmentation.next-btn"
              @click="goNext"
            >
              {{ t('smart.approveContinue') }} {{ t('smart.continue') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>
