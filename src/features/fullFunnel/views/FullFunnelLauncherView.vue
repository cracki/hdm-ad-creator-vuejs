<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Rocket, Loader2, AlertCircle, Plus, X, History,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import AiLoadingAnimation from '@/shared/components/AiLoadingAnimation.vue'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import { fullFunnelApi } from '../api'
import FullFunnelCampaignDisplay from '../components/FullFunnelCampaignDisplay.vue'

const router = useRouter()
const { t } = useI18n()
const { data: brands } = useBrands()

const selectedBrandUuid = ref('')
useAutoSelectBrand(selectedBrandUuid)
const selectedPlatforms = ref<string[]>(['meta', 'google'])
const selectedStages = ref<string[]>(['tofu', 'mofu', 'bofu'])
const budget = ref(1000)
const currency = ref('USD')
const duration = ref(30)
const adsPerStage = ref(3)
const personas = ref<{ name: string; description: string }[]>([
  { name: '', description: '' },
])

const platformList = [
  { id: 'meta', name: 'Meta', icon: '📘' },
  { id: 'google', name: 'Google Ads', icon: '🔍' },
  { id: 'linkedin', name: 'LinkedIn', icon: '💼' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵' },
]

const stages = [
  { id: 'tofu', name: 'TOFU', description: 'Awareness & Discovery', color: 'accent-cyan' },
  { id: 'mofu', name: 'MOFU', description: 'Consideration & Engagement', color: 'accent-magenta' },
  { id: 'bofu', name: 'BOFU', description: 'Decision & Conversion', color: 'accent-amber' },
]

const { data: campaign, loading, error, run } = useAsyncOperation<any>()

function togglePlatform(id: string) {
  selectedPlatforms.value = selectedPlatforms.value.includes(id)
    ? selectedPlatforms.value.filter((p) => p !== id)
    : [...selectedPlatforms.value, id]
}

function toggleStage(id: string) {
  selectedStages.value = selectedStages.value.includes(id)
    ? selectedStages.value.filter((s) => s !== id)
    : [...selectedStages.value, id]
}

const canGenerate = computed(() =>
  selectedBrandUuid.value.length > 0 &&
  selectedPlatforms.value.length > 0 &&
  selectedStages.value.length > 0 &&
  personas.value.some((p) => p.name.trim().length > 0),
)

async function generate() {
  if (!canGenerate.value) return

  await run(async () => {
    const filledPersonas = personas.value
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        ...(p.description.trim() ? { description: p.description.trim() } : {}),
      }))

    const { data } = await fullFunnelApi.run({
      brand_uuid: selectedBrandUuid.value,
      personas: filledPersonas,
      platforms: selectedPlatforms.value,
      budget: budget.value,
      currency: currency.value,
      duration_days: duration.value,
      funnel_stages: selectedStages.value,
      ads_per_stage: adsPerStage.value,
    })
    return data
  })
}

const campaignData = computed(() => campaign.value?.campaign ?? campaign.value ?? null)

const brandName = computed(() => {
  const b = (brands.value ?? []).find((br: any) => br.brand_uuid === selectedBrandUuid.value)
  return b?.company_name ?? 'Full Funnel'
})

function resetCampaign() {
  campaign.value = null
}
</script>

<template>
  <Topbar :title="t('funnelLauncher.title')" :subtitle="t('funnelLauncher.subtitle')">
    <template #actions>
      <button
        @click="router.push('/campaigns/full-funnel/history')"
        data-loc="funnel.history-btn"
        class="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition"
      >
        <History class="h-3.5 w-3.5" /> {{ t('funnelLauncher.viewHistory') }}
      </button>
    </template>
  </Topbar>

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">

      <!-- Loading -->
      <div v-if="loading" class="surface-card p-8">
        <AiLoadingAnimation :message="t('funnelLauncher.generating')" :description="t('funnelLauncher.subtitle')" />
      </div>

      <!-- Config Panel -->
      <div v-if="!campaignData && !loading" class="surface-card p-6 space-y-6">
        <!-- Brand Selection -->
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-2">{{ t('funnelLauncher.selectBrand') }}</label>
          <select
            v-model="selectedBrandUuid"
            data-loc="funnel.brand-select"
            class="w-full h-10 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary/50"
          >
            <option value="" disabled>{{ t('funnelLauncher.chooseBrand') }}</option>
            <option v-for="b in (brands ?? [])" :key="b.brand_uuid" :value="b.brand_uuid">
              {{ b.company_name }}
            </option>
          </select>
        </div>

        <!-- Platforms -->
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-2">{{ t('funnelLauncher.platforms') }}</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              v-for="p in platformList" :key="p.id"
              data-loc="funnel.platform-btn"
              @click="togglePlatform(p.id)"
              :class="[
                'p-3 rounded-lg border text-center text-xs transition',
                selectedPlatforms.includes(p.id)
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border/60 bg-overlay-subtle hover:border-border',
              ]"
            >
              <span class="text-xl block mb-1">{{ p.icon }}</span>
              <span class="font-medium">{{ p.name }}</span>
            </button>
          </div>
        </div>

        <!-- Funnel Stages -->
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-2">{{ t('funnelLauncher.stages') }}</label>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              v-for="s in stages" :key="s.id"
              data-loc="funnel.stage-btn"
              @click="toggleStage(s.id)"
              :class="[
                'p-3 rounded-lg border text-center text-xs transition',
                selectedStages.includes(s.id)
                  ? `border-${s.color}/60 bg-${s.color}/10`
                  : 'border-border/60 bg-overlay-subtle hover:border-border',
              ]"
            >
              <div class="font-semibold">{{ s.name }}</div>
              <div class="text-[11px] text-muted-foreground mt-0.5">{{ s.description }}</div>
            </button>
          </div>
        </div>

        <!-- Personas -->
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-medium text-muted-foreground">{{ t('funnelLauncher.personas') }}</label>
            <button
              data-loc="funnel.add-persona-btn"
              class="h-7 px-2 rounded border border-border/60 text-[11px] text-muted-foreground flex items-center gap-1 hover:bg-overlay-subtle transition"
              @click="personas.push({ name: '', description: '' })"
            >
              <Plus class="h-3 w-3" /> {{ t('funnelLauncher.addPersona') }}
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(persona, idx) in personas" :key="idx" class="flex flex-col sm:flex-row gap-2">
              <input
                v-model="persona.name"
                data-loc="funnel.persona-name-input"
                :placeholder="t('funnelLauncher.personaName')"
                class="flex-1 h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
              <input
                v-model="persona.description"
                data-loc="funnel.persona-desc-input"
                :placeholder="t('funnelLauncher.personaDesc')"
                class="flex-1 h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
              <button
                v-if="personas.length > 1"
                data-loc="funnel.remove-persona-btn"
                class="h-9 w-9 rounded-lg border border-border/60 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition shrink-0 grid place-items-center self-end"
                @click="personas.splice(idx, 1)"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Budget & Duration -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.budget') }}</label>
            <input v-model.number="budget" data-loc="funnel.budget-input" type="number" class="w-full h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.currency') }}</label>
            <select v-model="currency" data-loc="funnel.currency-select" class="w-full h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.duration') }}</label>
            <input v-model.number="duration" data-loc="funnel.duration-input" type="number" class="w-full h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.adsPerStage') }}</label>
            <select v-model.number="adsPerStage" data-loc="funnel.ads-per-stage-select" class="w-full h-9 px-3 rounded-lg bg-overlay-subtle border border-border/60 text-sm outline-none">
              <option :value="2">2</option>
              <option :value="3">3</option>
              <option :value="5">5</option>
            </select>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center gap-2">
          <AlertCircle class="h-4 w-4 text-destructive shrink-0" />
          <span class="text-xs text-destructive">{{ error }}</span>
        </div>

        <!-- Generate -->
        <button
          data-loc="funnel.generate-btn"
          :disabled="loading || !canGenerate"
          class="w-full h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] flex items-center justify-center gap-2 disabled:opacity-50"
          @click="generate"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <Rocket v-else class="h-4 w-4" />
          {{ loading ? t('funnelLauncher.generating') : t('funnelLauncher.launch') }}
        </button>
      </div>

      <!-- Results (extracted component) -->
      <FullFunnelCampaignDisplay
        v-if="campaignData"
        :campaign-data="campaignData"
        :brand-name="brandName"
        :selected-platforms="selectedPlatforms"
        :currency="currency"
        :budget="budget"
        :duration="duration"
        :selected-stages="selectedStages"
        @reset="resetCampaign"
      />
    </div>
  </main>
</template>
