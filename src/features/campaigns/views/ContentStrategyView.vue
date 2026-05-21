<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Grid3x3, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCw, Shield, Check } from 'lucide-vue-next'
import Topbar from '@/layout/Topbar.vue'
import { useI18n } from '@/shared/utils/i18n'
import { usePageActions } from '@/shared/composables/usePageActions'
import { useCampaign } from '../queries'
import { useAsyncOperation } from '@/shared/composables/useAsyncOperation'
import { operationManager } from '@/infrastructure/operations/operationManager'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const campaignUuid = computed(() => route.params.campaignUuid as string)
const { data: campaign } = useCampaign(campaignUuid)

const { setActions } = usePageActions()
setActions([{ label: t('camp.backToCampaign'), icon: ArrowLeft, to: `/campaigns/${campaignUuid.value}` }])

const isPrereqMet = computed(() =>
  (campaign.value?.segmentation_completed ?? false) &&
  (campaign.value?.ppc_viability_completed ?? false) &&
  (campaign.value?.funnel_completed ?? false),
)

const opKey = computed(() => `${campaignUuid.value}:content-strategy`)
const { data: result, loading, error, run } = useAsyncOperation<any>()

const stepData = computed(() => {
  if (result.value?.step) return result.value.step
  const latest = (campaign.value as any)?.latest_steps?.content_strategy
  if (latest?.status === 'completed') return latest
  return undefined
})
const contentData = computed(() => {
  const payload = stepData.value?.response_payload
  if (!payload) return null
  return payload.data ?? payload
})
const matrix = computed(() => {
  if (!contentData.value) return []
  const d = contentData.value
  const plan = d.content_plan
  if (Array.isArray(plan) && plan.length > 0) {
    const stageMap: Record<string, string> = {
      awareness: 'TOFU', tofu: 'TOFU',
      consideration: 'MOFU', mofu: 'MOFU',
      conversion: 'BOFU', bofu: 'BOFU',
    }
    const grouped = new Map<string, any>()
    for (const item of plan) {
      const persona = item.target_persona || 'Unknown'
      if (!grouped.has(persona)) {
        grouped.set(persona, { persona, TOFU: [], MOFU: [], BOFU: [] })
      }
      const row = grouped.get(persona)!
      const stage = stageMap[(item.funnel_stage || '').toLowerCase()] || 'TOFU'
      row[stage].push({
        title: item.content_idea?.title,
        description: item.content_idea?.description,
        type: item.content_type,
        ...item,
      })
    }
    return Array.from(grouped.values())
  }
  const raw = d.matrix ?? d.content_matrix ?? d.items ?? []
  return Array.isArray(raw) ? raw : []
})
const personas = computed(() => {
  if (!contentData.value) return []
  const d = contentData.value
  if (Array.isArray(d.content_plan) && d.content_plan.length > 0) {
    const seen = new Set<string>()
    const result: any[] = []
    for (const item of d.content_plan) {
      const name = item.target_persona
      if (name && !seen.has(name)) {
        seen.add(name)
        result.push({ name, strategy: item.strategic_justification || item.content_idea?.description })
      }
    }
    return result
  }
  const raw = d.personas ?? d.audiences ?? []
  return Array.isArray(raw) ? raw : []
})
const funnelStages = computed(() => ['TOFU', 'MOFU', 'BOFU'])

async function runContentStrategy() {
  if (!isPrereqMet.value || !operationManager.canStart(opKey.value)) return
  operationManager.start(opKey.value)
  try {
    await run(async () => {
      const { campaignsApi } = await import('../api')
      return (await campaignsApi.runContentStrategy(campaignUuid.value)).data
    })
  } finally {
    operationManager.finish(opKey.value)
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
      <header class="flex items-start gap-2.5 sm:gap-4 mb-6">
        <div class="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-[image:var(--gradient-brand)] grid place-items-center shadow-[var(--shadow-glow)] shrink-0">
          <Grid3x3 class="h-5 w-5 text-primary-foreground" />
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{{ t('smart.stepOf') }} 4 / 9</div>
          <h2 class="text-lg sm:text-2xl font-semibold tracking-tight mt-1">{{ t('smart.s5') }}</h2>
          <p class="text-sm text-muted-foreground mt-1 line-clamp-2">{{ t('content.description') }}</p>
        </div>
      </header>

      <!-- Prerequisite -->
      <div v-if="!isPrereqMet" class="surface-card p-8 text-center">
        <Shield class="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <div class="text-sm font-medium mb-1">{{ t('content.prereqTitle') }}</div>
        <div class="text-xs text-muted-foreground mb-4">{{ t('content.prereqDesc') }}</div>
        <button
          class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)]"
          @click="router.push(`/campaigns/${campaignUuid}/funnel`)"
        >
          {{ t('funnel.runFunnel') }}
        </button>
      </div>

      <template v-else>
        <!-- Already completed (no data from latest_steps either) -->
        <div v-if="isPrereqMet && (campaign?.content_strategy_completed) && !stepData && !loading" class="surface-card p-8 text-center mb-6">
          <div class="h-10 w-10 rounded-lg bg-success/15 border border-success/40 grid place-items-center mx-auto mb-3">
            <Check class="h-5 w-5 text-success" />
          </div>
          <div class="text-sm font-medium mb-1">{{ t('status.completed') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('content.alreadyCompletedDesc') }}</div>
          <div class="flex items-center justify-center gap-3">
            <button class="h-9 px-4 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runContentStrategy">
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
            <button
              class="h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              @click="router.push(`/campaigns/${campaignUuid}`)"
            >
              {{ t('camp.backToCampaign') }}
            </button>
          </div>
        </div>

        <!-- Run -->
        <div v-if="!stepData && !loading && !campaign?.content_strategy_completed" class="surface-card p-8 text-center">
          <Grid3x3 class="h-8 w-8 text-primary mx-auto mb-3" />
          <div class="text-sm font-medium mb-1">{{ t('content.ready') }}</div>
          <div class="text-xs text-muted-foreground mb-4">{{ t('content.readyDesc') }}</div>
          <button
            class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5 mx-auto"
            @click="runContentStrategy"
          >
            <Grid3x3 class="h-3.5 w-3.5" /> {{ t('content.runStrategy') }}
          </button>
        </div>

        <div v-if="loading" class="surface-card p-8 text-center">
          <Loader2 class="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <div class="text-sm font-medium mb-1">{{ t('content.analyzing') }}</div>
          <div class="text-xs text-muted-foreground">{{ t('content.analyzingDesc') }}</div>
        </div>

        <div v-if="error" class="surface-card p-5 flex items-center gap-3 mb-6">
          <AlertCircle class="h-5 w-5 text-destructive shrink-0" />
          <div class="flex-1 text-sm text-destructive">{{ error }}</div>
          <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5" @click="runContentStrategy">
            <RefreshCw class="h-3 w-3" /> {{ t('seg.retry') }}
          </button>
        </div>

        <!-- Content matrix results -->
        <div v-if="stepData && !loading">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs text-muted-foreground">{{ t('content.itemsFound', { count: matrix.length }) }}</div>
            <button class="h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center gap-1.5 hover:bg-overlay-subtle transition" @click="runContentStrategy">
              <RefreshCw class="h-3 w-3" /> {{ t('seg.reRun') }}
            </button>
          </div>

          <!-- Persona x Funnel grid -->
          <!-- Mobile: card layout -->
          <div v-if="matrix.length" class="sm:hidden space-y-3 mb-6">
            <div v-for="(row, rIdx) in matrix" :key="rIdx" class="surface-card p-3 space-y-3">
              <div class="text-sm font-semibold text-foreground">{{ row.persona || row.audience || row.name || `${t('content.persona')} ${rIdx + 1}` }}</div>
              <div v-for="stage in funnelStages" :key="stage" class="space-y-1">
                <div class="text-[11px] text-muted-foreground font-medium mb-1">{{ stage }}</div>
                <div v-if="row[stage] || row[stage.toLowerCase()]" class="space-y-1">
                  <div v-for="(item, iIdx) in (row[stage] ?? row[stage.toLowerCase()] ?? [])" :key="iIdx" class="p-1.5 rounded bg-overlay-subtle">
                    <div v-if="typeof item === 'string'" class="text-[11px]">{{ item }}</div>
                    <div v-else>
                      <div class="font-medium">{{ item.title || item.topic || item.type }}</div>
                      <div v-if="item.description" class="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{{ item.description }}</div>
                    </div>
                  </div>
                </div>
                <div v-else class="text-muted-foreground/40 text-[11px]">—</div>
              </div>
            </div>
          </div>
          <!-- Desktop: table layout -->
          <div class="hidden sm:block overflow-x-auto mb-6">
            <table v-if="matrix.length" class="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th class="text-start p-2 text-muted-foreground font-medium border-b border-border/40">{{ t('content.persona') }}</th>
                  <th v-for="stage in funnelStages" :key="stage" class="text-start p-2 text-muted-foreground font-medium border-b border-border/40">
                    {{ stage }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, rIdx) in matrix" :key="rIdx" class="hover:bg-overlay-subtle transition">
                  <td class="p-2 font-medium border-b border-border/20 align-top">
                    {{ row.persona || row.audience || row.name || `${t('content.persona')} ${rIdx + 1}` }}
                  </td>
                  <td v-for="stage in funnelStages" :key="stage" class="p-2 border-b border-border/20 align-top">
                    <div v-if="row[stage] || row[stage.toLowerCase()]" class="space-y-1">
                      <div v-for="(item, iIdx) in (row[stage] ?? row[stage.toLowerCase()] ?? [])" :key="iIdx" class="p-1.5 rounded bg-overlay-subtle">
                        <div v-if="typeof item === 'string'" class="text-[11px]">{{ item }}</div>
                        <div v-else>
                          <div class="font-medium">{{ item.title || item.topic || item.type }}</div>
                          <div v-if="item.description" class="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{{ item.description }}</div>
                        </div>
                      </div>
                    </div>
                    <div v-else class="text-muted-foreground/40">—</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <!-- Fallback: flat card grid -->
            <div v-else class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="(item, idx) in (personas.length ? personas : [contentData])"
                :key="idx"
                class="surface-card p-4"
              >
                <div class="text-xs font-semibold mb-2">{{ item.name || item.persona_name || `${t('content.item')} ${idx + 1}` }}</div>
                <div v-if="item.topics || item.content_ideas" class="flex flex-wrap gap-1">
                  <span v-for="topic in (item.topics ?? item.content_ideas ?? []).slice(0, 5)" :key="topic" class="text-[11px] px-2 py-0.5 rounded bg-overlay-light text-muted-foreground">
                    {{ topic }}
                  </span>
                </div>
                <p v-if="item.strategy || item.approach" class="text-[11px] text-muted-foreground mt-2 line-clamp-3">
                  {{ item.strategy || item.approach }}
                </p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <button
              class="h-10 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition flex items-center gap-1.5"
              data-loc="campaigns.content.prev-btn"
              @click="router.push(`/campaigns/${campaignUuid}`)"
            >
              <ArrowLeft class="h-3.5 w-3.5" /> {{ t('camp.backToCampaign') }}
            </button>
            <button
              class="h-10 px-5 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium shadow-[var(--shadow-glow)] flex items-center gap-1.5"
              data-loc="campaigns.content.complete-btn"
              @click="router.push(`/campaigns/${campaignUuid}`)"
            >
              {{ t('content.complete') }} <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </main>
</template>
