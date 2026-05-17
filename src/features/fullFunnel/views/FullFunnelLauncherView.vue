<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  Rocket, Loader2, AlertCircle, Check, RefreshCw,
  Download, ChevronDown, ChevronUp, Plus, X,
} from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { useBrands } from '@/features/brands/queries'
import { useAutoSelectBrand } from '@/shared/composables/useAutoSelectBrand'
import { fullFunnelApi } from '../api'

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
const activeTab = ref<'overview' | 'ads' | 'targeting'>('overview')
const expandedSections = ref<Record<string, boolean>>({})

const platforms = [
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

function toggleSection(id: string) {
  expandedSections.value[id] = !expandedSections.value[id]
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

  if (campaign.value) {
    const allSections: Record<string, boolean> = {}
    selectedStages.value.forEach((s) => { allSections[s] = true })
    expandedSections.value = allSections
    activeTab.value = 'overview'
  }
}

const campaignData = computed(() => campaign.value?.campaign ?? campaign.value ?? null)

const adsByStage = computed(() => {
  const c = campaignData.value
  if (!c) return {}
  const result: Record<string, any[]> = {}
  if (c.ad_copies) {
    c.ad_copies.forEach((group: any) => {
      const ads = group.ads ?? [group]
      ads.forEach((ad: any) => {
        const stage = ad.funnel_stage ?? 'tofu'
        if (!result[stage]) result[stage] = []
        result[stage].push(ad)
      })
    })
  }
  return result
})

function exportCSV() {
  const c = campaignData.value
  if (!c) return
  const rows: string[] = []
  rows.push(['Funnel Stage', 'Platform', 'Headline', 'Body Copy', 'CTA'].join(','))
  Object.entries(adsByStage.value).forEach(([, ads]) => {
    ads.forEach((ad: any) => {
      rows.push([
        ad.funnel_stage ?? '',
        ad.platform ?? '',
        ad.headline ?? '',
        ad.body_text ?? ad.body ?? '',
        ad.cta_button ?? ad.cta_text ?? '',
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    })
  })
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `full-funnel-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <Topbar :title="t('funnelLauncher.title')" :subtitle="t('funnelLauncher.subtitle')" />

  <main class="flex-1 overflow-y-auto">
    <div class="max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">

      <!-- Config Panel -->
      <div v-if="!campaignData" class="surface-card p-6 space-y-6">
        <!-- Brand Selection -->
        <div>
          <label class="text-xs font-medium text-muted-foreground block mb-2">{{ t('funnelLauncher.selectBrand') }}</label>
          <select
            v-model="selectedBrandUuid"
            class="w-full h-10 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none focus:ring-1 focus:ring-primary/50"
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
              v-for="p in platforms" :key="p.id"
              @click="togglePlatform(p.id)"
              :class="[
                'p-3 rounded-lg border text-center text-xs transition',
                selectedPlatforms.includes(p.id)
                  ? 'border-primary/60 bg-primary/10'
                  : 'border-border/60 bg-white/[0.02] hover:border-border',
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
              @click="toggleStage(s.id)"
              :class="[
                'p-3 rounded-lg border text-center text-xs transition',
                selectedStages.includes(s.id)
                  ? `border-${s.color}/60 bg-${s.color}/10`
                  : 'border-border/60 bg-white/[0.02] hover:border-border',
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
              class="h-7 px-2 rounded border border-border/60 text-[11px] text-muted-foreground flex items-center gap-1 hover:bg-white/[0.03] transition"
              @click="personas.push({ name: '', description: '' })"
            >
              <Plus class="h-3 w-3" /> {{ t('funnelLauncher.addPersona') }}
            </button>
          </div>
          <div class="space-y-2">
            <div v-for="(persona, idx) in personas" :key="idx" class="flex flex-col sm:flex-row gap-2">
              <input
                v-model="persona.name"
                :placeholder="t('funnelLauncher.personaName')"
                class="flex-1 h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
              <input
                v-model="persona.description"
                :placeholder="t('funnelLauncher.personaDesc')"
                class="flex-1 h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
              />
              <button
                v-if="personas.length > 1"
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
            <input v-model.number="budget" type="number" class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.currency') }}</label>
            <select v-model="currency" class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="AED">AED</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.duration') }}</label>
            <input v-model.number="duration" type="number" class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none" />
          </div>
          <div>
            <label class="text-xs font-medium text-muted-foreground block mb-1">{{ t('funnelLauncher.adsPerStage') }}</label>
            <select v-model.number="adsPerStage" class="w-full h-9 px-3 rounded-lg bg-white/[0.03] border border-border/60 text-sm outline-none">
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
          :disabled="loading || !canGenerate"
          class="w-full h-11 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-sm font-medium shadow-[var(--shadow-glow)] flex items-center justify-center gap-2 disabled:opacity-50"
          @click="generate"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          <Rocket v-else class="h-4 w-4" />
          {{ loading ? t('funnelLauncher.generating') : t('funnelLauncher.launch') }}
        </button>
      </div>

      <!-- Results -->
      <div v-if="campaignData" class="space-y-6">
        <!-- Success Banner -->
        <div class="surface-card p-5 bg-gradient-to-r from-primary/10 to-transparent border-primary/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center">
                <Check class="h-5 w-5 text-success" />
              </div>
              <div>
                <div class="text-sm font-semibold">{{ t('funnelLauncher.successTitle') }}</div>
                <div class="text-xs text-muted-foreground">{{ Object.values(adsByStage).flat().length }} {{ t('funnelLauncher.ads') }} {{ t('funnelLauncher.successDesc') }}</div>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="h-9 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-white/[0.03] transition" @click="campaign = null; $forceUpdate()">
                <RefreshCw class="h-3 w-3" /> {{ t('funnelLauncher.newCampaign') }}
              </button>
              <button class="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs flex items-center gap-1.5" @click="exportCSV">
                <Download class="h-3 w-3" /> {{ t('variant.exportCSV') }}
              </button>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 bg-white/[0.03] p-1 rounded-lg">
          <button
            v-for="tab in ['overview', 'ads', 'targeting'] as const" :key="tab"
            @click="activeTab = tab"
            :class="['flex-1 h-9 rounded-md text-xs font-medium capitalize transition', activeTab === tab ? 'bg-white/[0.08] text-foreground' : 'text-muted-foreground']"
          >{{ tab }}</button>
        </div>

        <!-- Overview -->
        <div v-if="activeTab === 'overview'" class="surface-card p-5 space-y-4">
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="p-3 rounded-lg bg-white/[0.03]">
              <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.totalAds') }}</div>
              <div class="text-xl font-bold">{{ Object.values(adsByStage).flat().length }}</div>
            </div>
            <div class="p-3 rounded-lg bg-white/[0.03]">
              <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.platformCount') }}</div>
              <div class="text-xl font-bold">{{ selectedPlatforms.length }}</div>
            </div>
            <div class="p-3 rounded-lg bg-white/[0.03]">
              <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.budgetLabel') }}</div>
              <div class="text-xl font-bold">{{ currency }} {{ budget.toLocaleString() }}</div>
            </div>
            <div class="p-3 rounded-lg bg-white/[0.03]">
              <div class="text-xs text-muted-foreground">{{ t('funnelLauncher.durationLabel') }}</div>
              <div class="text-xl font-bold">{{ duration }} {{ t('funnelLauncher.days') }}</div>
            </div>
          </div>
        </div>

        <!-- Ads -->
        <div v-if="activeTab === 'ads'" class="space-y-4">
          <div v-for="stage in selectedStages" :key="stage" class="border-b border-border/40 pb-4 last:border-0">
            <button
              @click="toggleSection(stage)"
              class="w-full flex items-center justify-between py-2"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold">{{ stages.find((s) => s.id === stage)?.name }}</span>
                <span class="text-[11px] px-2 py-0.5 rounded bg-white/[0.06] text-muted-foreground">{{ adsByStage[stage]?.length ?? 0 }} {{ t('funnelLauncher.ads') }}</span>
              </div>
              <component :is="expandedSections[stage] ? ChevronUp : ChevronDown" class="h-4 w-4 text-muted-foreground" />
            </button>
            <div v-if="expandedSections[stage] && adsByStage[stage]" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <div v-for="(ad, idx) in adsByStage[stage]" :key="idx" class="surface-card p-3">
                <div v-if="ad.headline" class="font-medium text-sm mb-1">{{ ad.headline }}</div>
                <div class="text-xs text-muted-foreground mb-2">{{ ad.body_text ?? ad.body }}</div>
                <span v-if="ad.cta_button ?? ad.cta_text" class="inline-block text-[11px] px-2 py-1 rounded bg-primary text-primary-foreground font-medium">{{ ad.cta_button ?? ad.cta_text }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Targeting -->
        <div v-if="activeTab === 'targeting' && campaignData?.targeting_specs" class="surface-card p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div v-for="(spec, platform) in campaignData.targeting_specs" :key="platform" class="p-3 rounded-lg bg-white/[0.03]">
              <div class="text-sm font-semibold mb-2">{{ String(platform).toUpperCase() }}</div>
              <div v-if="spec.demographics" class="text-xs text-muted-foreground">
                {{ spec.demographics.age_range ?? '' }} · {{ spec.demographics.gender ?? '' }}
              </div>
              <div v-if="spec.interests" class="flex flex-wrap gap-1 mt-2">
                <span v-for="(int, i) in spec.interests.slice(0, 5)" :key="i" class="text-[11px] px-1.5 py-0.5 rounded bg-accent-cyan/15 text-accent-cyan">{{ int }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>
