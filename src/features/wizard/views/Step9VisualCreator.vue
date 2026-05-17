<script setup lang="ts">
import { computed, ref } from 'vue'
import { Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Shield, Download } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useCampaignAds } from '@/features/campaigns/queries'
import { campaignsApi } from '@/features/campaigns/api'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'
import type { Campaign } from '@/features/campaigns/types'

const props = defineProps<{ campaign: Campaign; campaignUuid: string }>()
const emit = defineEmits<{ (e: 'completed'): void }>()
const { t } = useI18n()

const { data: ads, isLoading: adsLoading } = useCampaignAds(computed(() => props.campaignUuid))

const adsList = computed(() => Array.isArray(ads.value) ? ads.value : [])

const aspectRatio = ref<'1:1' | '9:16' | '16:9' | '4:5'>('1:1')
const quality = ref<'standard' | 'hd'>('standard')
const style = ref<'natural' | 'vivid'>('natural')

const selectedAdUuids = ref<Set<string>>(new Set())

function toggleAd(uuid: string) {
  if (selectedAdUuids.value.has(uuid)) selectedAdUuids.value.delete(uuid)
  else selectedAdUuids.value.add(uuid)
}

const selectAll = computed({
  get: () => adsList.value.length > 0 && selectedAdUuids.value.size === adsList.value.length,
  set: (v: boolean) => {
    selectedAdUuids.value = new Set(v ? adsList.value.map((a: any) => a.campaign_ad_uuid) : [])
  },
})

const opKey = computed(() => `${props.campaignUuid}:generate-visuals`)
const { data: visualResult, loading, error, run } = useAsyncOperation<any>()

const results = computed(() => visualResult.value?.results ?? [])
const generatedCount = computed(() => visualResult.value?.generated_count ?? 0)

const isPrereqMet = computed(() => adsList.value.length > 0)

async function generateVisuals() {
  if (selectedAdUuids.value.size === 0) return
  if (!operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const res = await campaignsApi.generateVisuals(props.campaignUuid, {
        ad_uuids: Array.from(selectedAdUuids.value),
        aspect_ratio: aspectRatio.value,
        quality: quality.value,
        style: style.value,
      })
      return res.data
    })
    emit('completed')
  } finally {
    operationManager.finish(opKey.value)
  }
}

function adPlatformLabel(p: string) {
  const map: Record<string, string> = { meta: 'Meta', google: 'Google', linkedin: 'LinkedIn' }
  return map[p] ?? p
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex items-start gap-2.5 sm:gap-4">
      <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
        <ImageIcon class="h-5 w-5 text-primary-foreground" />
      </div>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 9 / 10</div>
        <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s9') }}</h2>
        <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('visual.description') }}</p>
      </div>
    </header>

    <div v-if="adsLoading" class="flex justify-center py-12"><Loader2 class="h-6 w-6 animate-spin text-primary" /></div>

    <div v-else-if="!isPrereqMet" class="surface-card p-8 text-center">
      <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
      <div class="text-sm font-medium mb-1">{{ t('visual.prereqTitle') }}</div>
      <div class="text-xs text-muted-foreground">{{ t('visual.prereqDesc') }}</div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('visual.aspectRatio') }}</label>
          <select v-model="aspectRatio" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
            <option value="1:1">1:1</option><option value="9:16">9:16</option><option value="16:9">16:9</option><option value="4:5">4:5</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('visual.quality') }}</label>
          <select v-model="quality" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
            <option value="standard">{{ t('visual.standard') }}</option><option value="hd">HD</option>
          </select>
        </div>
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('visual.style') }}</label>
          <select v-model="style" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
            <option value="natural">{{ t('visual.natural') }}</option><option value="vivid">{{ t('visual.vivid') }}</option>
          </select>
        </div>
      </div>

      <div class="surface-card p-4">
        <div class="flex items-center justify-between mb-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" v-model="selectAll" class="rounded border-border/60" />
            <span class="text-xs font-medium">{{ t('visual.selectAll') }}</span>
          </label>
          <span class="text-[11px] text-muted-foreground">{{ selectedAdUuids.size }} / {{ adsList.length }}</span>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div
            v-for="ad in adsList"
            :key="ad.campaign_ad_uuid"
            :class="['p-3 rounded-lg border cursor-pointer transition text-xs', selectedAdUuids.has(ad.campaign_ad_uuid) ? 'border-primary/60 bg-primary/5' : 'border-border/40 hover:border-primary/30']"
            @click="toggleAd(ad.campaign_ad_uuid)"
          >
            <div class="flex items-center gap-2 mb-1">
              <span class="font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[11px]">{{ adPlatformLabel(ad.platform) }}</span>
              <span class="text-[11px] text-muted-foreground">{{ ad.funnel_stage }}</span>
            </div>
            <div class="text-[11px] text-muted-foreground truncate">{{ ad.persona || '—' }}</div>
          </div>
        </div>
      </div>

      <div class="flex items-center justify-center">
        <button :disabled="selectedAdUuids.size === 0 || loading" class="h-10 px-6 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 disabled:opacity-50" @click="generateVisuals">
          <Loader2 v-if="loading" class="h-3.5 w-3.5 animate-spin" />
          <ImageIcon v-else class="h-3.5 w-3.5" />
          {{ loading ? t('visual.generating') : t('visual.generate') }}
        </button>
      </div>

      <div v-if="error" class="surface-card p-4 flex items-center gap-3">
        <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
        <div class="flex-1 text-sm text-destructive">{{ error }}</div>
        <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="generateVisuals"><RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}</button>
      </div>

      <div v-if="results.length > 0" class="space-y-4">
        <div class="text-xs text-muted-foreground">{{ t('visual.generated', { count: generatedCount }) }}</div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div v-for="v in results" :key="v.campaign_ad_uuid" class="surface-card overflow-hidden">
            <div v-if="v.success && v.image_url" class="relative">
              <img :src="v.image_url" :alt="v.visual_summary" class="w-full aspect-video object-cover" />
              <a :href="v.image_url" download class="absolute top-2 end-2 h-7 w-7 rounded-md bg-black/50 grid place-items-center hover:bg-black/70 transition">
                <Download class="h-3.5 w-3.5 text-white" />
              </a>
            </div>
            <div v-else class="aspect-video bg-destructive/10 grid place-items-center">
              <div class="text-center p-3">
                <AlertCircle class="h-5 w-5 text-destructive mx-auto mb-1" />
                <div class="text-[11px] text-destructive">{{ v.error || t('visual.failed') }}</div>
              </div>
            </div>
            <div class="p-3">
              <div class="flex items-center gap-1.5 mb-1">
                <span class="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300">{{ adPlatformLabel(v.platform ?? '') }}</span>
                <span class="text-[11px] text-muted-foreground">{{ v.funnel_stage }}</span>
              </div>
              <div v-if="v.visual_summary" class="text-[11px] text-muted-foreground line-clamp-2">{{ v.visual_summary }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
