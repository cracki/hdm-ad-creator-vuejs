<script setup lang="ts">
import { computed, ref } from 'vue'
import { Users, Loader2, AlertCircle, RefreshCw, Check, ShoppingBag, MapPin } from 'lucide-vue-next'
import SegmentDeepResearchRenderer from '@/shared/components/renderers/SegmentDeepResearchRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const businessType = ref('')
const location = ref('')
const productDescription = ref('')

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

const deepResearch = computed(() => stepData.value?.response_payload?.deep_research ?? {})

async function runSegmentation() {
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const res = await campaignsApi.runSegmentation(props.campaignUuid, {
        business_type: businessType.value || undefined,
        location: location.value || undefined,
        product_description: productDescription.value || undefined,
        include_deep_research: true,
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
      <div class="grid sm:grid-cols-2 gap-4">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.businessType') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
            <ShoppingBag class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="businessType" :placeholder="t('seg.businessTypeHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.location') }}</label>
          <div class="flex items-center gap-2 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60">
            <MapPin class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input v-model="location" :placeholder="t('seg.locationHint')" class="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" />
          </div>
        </div>
      </div>
      <div>
        <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('seg.productDesc') }}</label>
        <textarea v-model="productDescription" :placeholder="t('seg.productDescHint')" rows="3" class="w-full px-3 py-2 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 resize-none" />
      </div>
      <button class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5" @click="runSegmentation">
        <Users class="h-3.5 w-3.5" /> {{ t('seg.runSegmentation') }}
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="surface-card p-8 text-center">
      <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
      <div class="text-sm font-medium mb-1">{{ t('seg.analyzing') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('seg.analyzingDesc') }}</div>
    </div>

    <!-- Already completed -->
    <div v-if="isAlreadyCompleted && !stepData && !loading" class="surface-card p-8 text-center">
      <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
        <Check class="h-5 w-5 text-success" />
      </div>
      <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
      <div class="text-xs text-muted-foreground mb-4">{{ t('seg.alreadyCompletedDesc') }}</div>
      <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition mx-auto" @click="runSegmentation">
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
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="runSegmentation">
          <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
        </button>
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
            <span v-for="goal in seg.goals.slice(0, 4)" :key="goal" class="text-[11px] px-2 py-0.5 rounded bg-white/[0.05] text-muted-foreground">{{ goal }}</span>
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
    </div>
  </div>
</template>
