<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Loader2, AlertCircle, ArrowLeft } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCreativeAngles, useFunnelStages, usePlatformConfigs, useGenerateAdLibrary } from '../queries'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'

const { t } = useI18n()
const router = useRouter()

const { setActions } = usePageActions()
setActions([{ label: t('adlib.backToLibrary'), icon: ArrowLeft, to: '/ad-library' }])

const generateMutation = useGenerateAdLibrary()
const { data: anglesData } = useCreativeAngles()
const { data: stagesData } = useFunnelStages()
const { data: platformsData } = usePlatformConfigs()
const { data: brandsData } = useBrands()

const selectedBrandUuid = ref('')
useAutoSelectBrand(selectedBrandUuid)
const selectedAngles = ref<string[]>([])
const selectedStages = ref<string[]>([])
const selectedPlatforms = ref<string[]>([])
const adsPerCombination = ref(2)

const loading = ref(false)
const error = ref<string | null>(null)
const generatedRunUuid = ref<string | null>(null)

const angles = computed(() => {
  const d = anglesData.value
  return d?.angles ? Object.entries(d.angles) : []
})
const stages = computed(() => {
  const d = stagesData.value
  return d?.funnel_stages ? Object.entries(d.funnel_stages) : []
})
const platforms = computed(() => {
  const d = platformsData.value
  return d?.platforms ? Object.entries(d.platforms) : []
})

function toggleItem(arr: string[], item: string) {
  const idx = arr.indexOf(item)
  if (idx >= 0) arr.splice(idx, 1)
  else arr.push(item)
}

async function generate() {
  loading.value = true
  error.value = null
  try {
    const res = await generateMutation.mutateAsync({
      brand_uuid: selectedBrandUuid.value || undefined,
      selected_angles: selectedAngles.value.length ? selectedAngles.value : undefined,
      funnel_stages: selectedStages.value.length ? selectedStages.value : undefined,
      platforms: selectedPlatforms.value.length ? selectedPlatforms.value : undefined,
      ads_per_combination: adsPerCombination.value,
    })
    generatedRunUuid.value = res.data.run?.ad_library_run_uuid
    if (generatedRunUuid.value) {
      router.push(`/ad-library/runs/${generatedRunUuid.value}`)
    }
  } catch (e: any) {
    error.value = e?.response?.data?.detail ?? e?.message ?? t('adlib.errorGenerate')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Topbar :title="t('adlib.generateTitle')" :subtitle="t('adlib.generateSubtitle')">
    <template #actions>
      <button
        data-loc="adlib.generate.back-btn"
        class="h-9 px-3 rounded-lg border border-border/60 text-xs font-medium hover:bg-white/[0.03] transition"
        @click="router.push('/ad-library')"
      >
        {{ t('adlib.backToLibrary') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
      <div class="surface-card p-5 space-y-5">
        <!-- Brand selection -->
        <div v-if="brandsData?.length">
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adlib.selectBrand') }}</label>
          <select v-model="selectedBrandUuid" data-loc="adlib.generate.brand-select" class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
            <option value="">{{ t('adlib.noBrand') }}</option>
            <option v-for="brand in brandsData" :key="brand.brand_uuid" :value="brand.brand_uuid">
              {{ brand.company_name }}
            </option>
          </select>
        </div>

        <!-- Creative Angles -->
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">{{ t('adlib.selectAngles') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="[key, angle] in angles"
              :key="key"
              data-loc="adlib.generate.angle-btn"
              :class="[
                'h-8 px-3 rounded-lg text-xs font-medium border transition',
                selectedAngles.includes(key)
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground border-transparent'
                  : 'bg-white/[0.03] border-border/60 text-muted-foreground hover:text-foreground',
              ]"
              @click="toggleItem(selectedAngles, key)"
            >
              {{ angle.name }}
            </button>
          </div>
        </div>

        <!-- Funnel Stages -->
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">{{ t('adlib.selectStages') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="[key, stage] in stages"
              :key="key"
              data-loc="adlib.generate.stage-btn"
              :class="[
                'h-8 px-3 rounded-lg text-xs font-medium border transition',
                selectedStages.includes(key)
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground border-transparent'
                  : 'bg-white/[0.03] border-border/60 text-muted-foreground hover:text-foreground',
              ]"
              @click="toggleItem(selectedStages, key)"
            >
              {{ stage.name }}
            </button>
          </div>
        </div>

        <!-- Platforms -->
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block">{{ t('adlib.selectPlatforms') }}</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="[key, platform] in platforms"
              :key="key"
              data-loc="adlib.generate.platform-btn"
              :class="[
                'h-8 px-3 rounded-lg text-xs font-medium border transition',
                selectedPlatforms.includes(key)
                  ? 'bg-[image:var(--gradient-brand)] text-primary-foreground border-transparent'
                  : 'bg-white/[0.03] border-border/60 text-muted-foreground hover:text-foreground',
              ]"
              @click="toggleItem(selectedPlatforms, key)"
            >
              {{ platform.name }}
            </button>
          </div>
        </div>

        <!-- Ads per combination -->
        <div>
          <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adlib.adsPerCombo') }}</label>
          <input v-model.number="adsPerCombination" data-loc="adlib.generate.ads-per-combo-input" type="number" min="1" max="10" class="w-32 h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none" />
        </div>

        <!-- Error -->
        <div v-if="error" class="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
          <AlertCircle class="h-4 w-4 text-destructive shrink-0" />
          <div class="text-xs text-destructive">{{ error }}</div>
        </div>

        <!-- Generate button -->
        <button
          data-loc="adlib.generate.generate-btn"
          class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
          :disabled="loading"
          @click="generate"
        >
          <template v-if="loading">
            <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t('adlib.generating') }}
          </template>
          <template v-else>
            <Sparkles class="h-3.5 w-3.5" /> {{ t('adlib.generateBtn') }}
          </template>
        </button>
      </div>
    </div>
  </main>
</template>
