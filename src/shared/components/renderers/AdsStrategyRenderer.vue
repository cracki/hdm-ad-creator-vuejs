<script setup lang="ts">
import { computed } from 'vue'
import { Target, DollarSign, BarChart3, Users, Layers, Zap } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'

const { t } = useI18n()

const props = defineProps<{
  data: Record<string, unknown>
}>()

const overview = computed(() => {
  const d = props.data?.data ?? props.data
  return (d as any)?.campaign_overview ?? null
})

const funnelCampaigns = computed(() => {
  const d = props.data?.data ?? props.data
  const campaigns = (d as any)?.funnel_campaigns ?? []
  return Array.isArray(campaigns) ? campaigns : []
})

const extraSections = computed(() => {
  const d = props.data?.data ?? props.data
  const raw = d as Record<string, unknown>
  const skip = new Set(['campaign_overview', 'funnel_campaigns', 'success', 'platform'])
  const sections: { key: string; label: string; data: unknown }[] = []
  for (const [key, value] of Object.entries(raw)) {
    if (skip.has(key) || value === null || value === undefined) continue
    if (typeof value !== 'object' || Array.isArray(value)) continue
    sections.push({ key, label: formatLabel(key), data: value })
  }
  return sections
})

const platformLabel = computed(() => {
  const p = (props.data as any)?.platform ?? ''
  const map: Record<string, string> = {
    meta: 'Meta',
    google: 'Google Ads',
    linkedin: 'LinkedIn',
  }
  return map[p] ?? p
})

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^\w/, (c) => c.toUpperCase())
}

const stageColors: Record<string, { bg: string; text: string }> = {
  bofu: { bg: 'bg-success/10', text: 'text-success' },
  mofu: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  tofu: { bg: 'bg-info/10', text: 'text-info' },
}

function getStageColor(stage: string) {
  const key = (stage || '').toLowerCase()
  return stageColors[key] ?? { bg: 'bg-white/5', text: 'text-muted-foreground' }
}

function renderValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') return val
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')
  return ''
}
</script>

<template>
  <div class="space-y-5">
    <!-- Platform badge -->
    <div v-if="platformLabel" class="flex items-center gap-2">
      <span class="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
        {{ platformLabel }}
      </span>
    </div>

    <!-- Campaign Overview -->
    <div v-if="overview" class="surface-card p-4 space-y-3">
      <div class="text-xs font-semibold flex items-center gap-1.5">
        <BarChart3 class="h-3.5 w-3.5 text-primary" /> {{ t('strategy.overview') }}
      </div>
      <div class="grid sm:grid-cols-3 gap-3">
        <div v-if="overview.total_campaigns" class="space-y-0.5">
          <div class="text-[10px] text-muted-foreground/60 uppercase">{{ t('strategy.totalCampaigns') }}</div>
          <div class="text-lg font-bold text-foreground">{{ overview.total_campaigns }}</div>
        </div>
        <div v-if="overview.monthly_budget_range ?? overview.estimated_monthly_budget_range" class="space-y-0.5">
          <div class="text-[10px] text-muted-foreground/60 uppercase">{{ t('strategy.budget') }}</div>
          <div class="text-sm font-medium text-foreground">{{ overview.monthly_budget_range ?? overview.estimated_monthly_budget_range }}</div>
        </div>
        <div v-if="overview.primary_goal ?? overview.primary_conversion_goal" class="space-y-0.5">
          <div class="text-[10px] text-muted-foreground/60 uppercase">{{ t('strategy.primaryGoal') }}</div>
          <div class="text-sm font-medium text-foreground">{{ overview.primary_goal ?? overview.primary_conversion_goal }}</div>
        </div>
      </div>
    </div>

    <!-- Funnel Campaigns -->
    <div v-if="funnelCampaigns.length">
      <div class="text-xs font-semibold mb-3 flex items-center gap-1.5">
        <Layers class="h-3.5 w-3.5 text-primary" /> {{ t('strategy.funnelCampaigns') }}
      </div>
      <div class="space-y-3">
        <div
          v-for="(camp, idx) in funnelCampaigns"
          :key="idx"
          class="rounded-lg border border-border/30 bg-white/[0.015] p-4 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-2">
              <span :class="['text-[11px] px-1.5 py-0.5 rounded font-medium capitalize', getStageColor(camp.funnel_stage).bg, getStageColor(camp.funnel_stage).text]">
                {{ camp.funnel_stage ?? camp.funnel_stage }}
              </span>
              <span v-if="camp.objective" class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.05] text-muted-foreground">
                {{ camp.objective }}
              </span>
            </div>
            <span v-if="camp.budget_percent ?? camp.budget_allocation_percent" class="text-xs font-semibold text-primary">
              {{ camp.budget_percent ?? camp.budget_allocation_percent }}%
            </span>
          </div>

          <div class="text-sm font-medium text-foreground">{{ camp.campaign_name ?? camp.campaign_name_suggestion }}</div>

          <!-- Grid of details -->
          <div class="grid sm:grid-cols-2 gap-2 text-xs">
            <div v-if="camp.bidding ?? camp.bidding_strategy" class="flex items-start gap-1.5">
              <DollarSign class="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span class="text-muted-foreground/60">{{ t('strategy.bidding') }}:</span>
                <span class="ms-1 text-muted-foreground">{{ camp.bidding ?? camp.bidding_strategy }}</span>
              </div>
            </div>
            <div v-if="camp.kpi ?? camp.primary_kpi" class="flex items-start gap-1.5">
              <Target class="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <span class="text-muted-foreground/60">{{ t('strategy.kpi') }}:</span>
                <span class="ms-1 text-muted-foreground">{{ camp.kpi ?? camp.primary_kpi }}</span>
              </div>
            </div>
          </div>

          <!-- Audience / Targeting -->
          <div v-if="camp.audience ?? camp.audience_targeting" class="space-y-1.5 text-xs">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('strategy.targeting') }}</div>
            <div class="text-muted-foreground">
              <template v-if="camp.audience?.type">
                <span class="font-medium">{{ camp.audience.type }}</span>
                <span v-if="camp.audience.details?.length"> — {{ camp.audience.details.join(', ') }}</span>
              </template>
              <template v-else-if="camp.audience_targeting?.targeting_approach">
                {{ camp.audience_targeting.targeting_approach }}
              </template>
            </div>
            <div v-if="camp.audience?.exclusions?.length" class="text-muted-foreground/60">
              {{ t('strategy.exclusions') }}: {{ camp.audience.exclusions.join(', ') }}
            </div>
          </div>

          <!-- Creative -->
          <div v-if="camp.creative ?? camp.creative_strategy" class="space-y-1.5 text-xs">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('strategy.creative') }}</div>
            <div v-if="(camp.creative ?? camp.creative_strategy)?.angle ?? (camp.creative_strategy ?? camp.creative)?.creative_concept" class="text-muted-foreground">
              {{ (camp.creative ?? camp.creative_strategy)?.angle ?? (camp.creative_strategy ?? camp.creative)?.creative_concept }}
            </div>
            <div v-if="(camp.creative?.headlines ?? camp.creative?.primary_text) ?? (camp.creative_strategy?.headline ?? camp.creative_strategy?.introductory_text)" class="flex flex-wrap gap-1">
              <span
                v-for="(h, hIdx) in ((camp.creative?.headlines ?? [camp.creative?.primary_text]) ?? [camp.creative_strategy?.headline ?? camp.creative_strategy?.introductory_text]).filter(Boolean)"
                :key="hIdx"
                class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04]"
              >
                {{ h }}
              </span>
            </div>
            <div v-if="(camp.creative ?? camp.creative_strategy)?.cta ?? (camp.creative ?? camp.creative_strategy)?.call_to_action" class="text-primary text-[11px]">
              CTA: {{ (camp.creative ?? camp.creative_strategy)?.cta ?? (camp.creative ?? camp.creative_strategy)?.call_to_action }}
            </div>
          </div>

          <!-- Ad Groups (Google) -->
          <div v-if="camp.ad_groups?.length" class="space-y-1.5 text-xs">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('strategy.adGroups') }}</div>
            <div v-for="(ag, agIdx) in camp.ad_groups" :key="agIdx" class="flex items-center gap-2 text-muted-foreground">
              <Zap class="h-2.5 w-2.5" />
              <span class="font-medium">{{ ag.name }}</span>
              <span v-if="ag.keywords?.length" class="opacity-60">— {{ ag.keywords.join(', ') }}</span>
            </div>
          </div>

          <!-- Placements (Meta) -->
          <div v-if="camp.placements?.length" class="space-y-1.5 text-xs">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground/60">{{ t('strategy.placements') }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="p in camp.placements" :key="p" class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04]">{{ p }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Extra sections (platform-specific like pmax_strategy, retargeting, measurement, etc.) -->
    <div v-for="section in extraSections" :key="section.key" class="surface-card p-4 space-y-2.5">
      <div class="text-xs font-semibold">{{ section.label }}</div>
      <div class="space-y-1.5">
        <div
          v-for="(val, sKey) in (section.data as Record<string, unknown>)"
          :key="sKey"
          class="text-xs"
        >
          <template v-if="Array.isArray(val)">
            <div class="text-[11px] text-muted-foreground/60 mb-1">{{ formatLabel(String(sKey)) }}</div>
            <div class="flex flex-wrap gap-1">
              <span v-for="(item, iIdx) in val" :key="iIdx" class="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04]">
                {{ typeof item === 'string' ? item : JSON.stringify(item) }}
              </span>
            </div>
          </template>
          <template v-else>
            <div class="flex items-start gap-2">
              <span class="text-muted-foreground/60 min-w-[100px]">{{ formatLabel(String(sKey)) }}</span>
              <span class="text-muted-foreground">{{ renderValue(val) }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Fallback: if nothing matched, show as key-value pairs -->
    <div v-if="!overview && !funnelCampaigns.length && !extraSections.length" class="space-y-2">
      <div
        v-for="(val, key) in data"
        :key="String(key)"
        class="text-xs"
      >
        <span class="text-muted-foreground/60">{{ formatLabel(String(key)) }}:</span>
        <span class="ms-2 text-muted-foreground">{{ renderValue(val) }}</span>
      </div>
    </div>
  </div>
</template>
