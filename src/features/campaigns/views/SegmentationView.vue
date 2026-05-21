<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Brain, ArrowLeft, ArrowRight, Loader2, AlertCircle, MapPin, ShoppingBag, RefreshCw, Check } from 'lucide-vue-next'
import SegmentDeepResearchRenderer from '@/shared/components/renderers/SegmentDeepResearchRenderer.vue'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign } from '../queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { useNormalizeResponse } from '@/shared/composables/useNormalizeResponse'
import { operationManager } from '@/infrastructure/operations/operationManager'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { normalize } = useNormalizeResponse()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const businessType = ref('')
const location = ref('')
const productDescription = ref('')

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
const deepResearch = computed(() => {
  const raw = stepData.value?.response_payload?.deep_research
  if (!raw || typeof raw !== 'object') return {}
  const result = normalize(raw as Record<string, unknown>, 'deep-research')
  const hasValues = Object.values(result).some((v) => v !== null && v !== undefined)
  return hasValues ? result : {}
})

async function runSegmentation() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const { campaignsApi } = await import('../api')
      const res = await campaignsApi.runSegmentation(campaignUuid.value, {
        business_type: businessType.value || undefined,
        location: location.value || undefined,
        product_description: productDescription.value || undefined,
        include_deep_research: true,
      })
      const rawSegments = res.data?.step?.response_payload?.segments
        ?? res.data?.step?.response_payload?.data?.segments ?? []
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

      <div v-if="campaignLoading" class="flex justify-center py-12">
        <Loader2 class="h-6 w-6 animate-spin text-primary" />
      </div>

      <template v-else>
        <!-- Input form (shown when no results yet and not already completed) -->
        <div v-if="!stepData && !loading && !isAlreadyCompleted" class="surface-card p-5 space-y-4 mb-6">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.businessType') }}</label>
              <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
                <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input v-model="businessType" :placeholder="t('seg.businessTypeHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" data-loc="campaigns.segmentation.business-type-input" />
              </div>
            </div>
            <div>
              <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.location') }}</label>
              <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60">
                <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input v-model="location" :placeholder="t('seg.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" data-loc="campaigns.segmentation.location-input" />
              </div>
            </div>
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
        <div v-if="loading" class="surface-card p-8 text-center">
          <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <div class="text-sm font-medium mb-1">{{ t('seg.analyzing') }}</div>
          <div class="text-xs text-muted-foreground">{{ t('seg.analyzingDesc') }}</div>
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
        <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
          <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
          <div class="flex-1">
            <div class="text-sm font-medium text-destructive">{{ error }}</div>
          </div>
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
