<script setup lang="ts">
import { computed } from 'vue'
import { TrendingUp, ChevronDown, ChevronUp } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { ppcServiceDetailRows, hasPpcServiceDetails, ppcServiceBudgetShare } from '../types'

/**
 * One expandable PPC service card (QA round 3 fix 4): extracted from
 * PPCViabilityView so selected AND "other analyzed" rows render identically.
 * The parent owns the one-open-at-a-time state.
 */
const props = defineProps<{
  /** Service row (payload rows are loosely shaped — same as the views). */
  svc: Record<string, any>
  /** Global row index — drives the expandable testids. */
  idx: number
  expanded: boolean
}>()

const emit = defineEmits<{ toggle: [] }>()

const { t } = useI18n()

// Budget share badge (QA4-img14): normalized percent off the raw
// budget_share / budget_share_percent payload keys (or a pre-normalized
// budgetShare); null hides the badge.
const budgetShareText = computed(() => {
  const share = ppcServiceBudgetShare(props.svc)
  return share == null ? null : t('ppc.budgetShareBadge', { share })
})
</script>

<template>
  <div class="surface-card overflow-hidden" data-testid="ppc-service-card">
    <!-- Collapsed summary: name + classification + score -->
    <div class="p-4 sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div class="flex items-start gap-3 min-w-0">
          <div class="h-8 w-8 rounded-lg bg-overlay-light grid place-items-center shrink-0">
            <TrendingUp class="h-4 w-4 text-primary" />
          </div>
          <div class="min-w-0">
            <div class="text-sm font-semibold truncate" data-testid="ppc-service-name">{{ svc.name || svc.platform || svc.service || `${t('ppc.service')} ${idx + 1}` }}</div>
            <div v-if="svc.type || svc.category || svc.classification" class="text-[11px] text-muted-foreground truncate">{{ svc.type || svc.category || svc.classification }}</div>
          </div>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <div
            v-if="budgetShareText"
            class="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20"
            data-testid="ppc-budget-share"
          >
            {{ budgetShareText }}
          </div>
          <div v-if="svc.score || svc.bpc_score || svc.viability_score || svc.opportunity_score || svc.priority" class="flex items-center gap-1">
            <span class="h-1.5 w-1.5 rounded-full bg-success" />
            <span class="text-xs font-semibold text-success">
              {{ svc.score ?? svc.bpc_score ?? svc.viability_score ?? svc.opportunity_score ?? svc.priority }}
            </span>
          </div>
          <button
            v-if="hasPpcServiceDetails(svc)"
            type="button"
            :data-testid="`ppc-service-toggle-${idx}`"
            :aria-expanded="expanded"
            class="h-8 w-8 rounded-lg border border-border/40 grid place-items-center hover:bg-overlay-subtle transition"
            @click="emit('toggle')"
          >
            <ChevronDown v-if="!expanded" class="h-3.5 w-3.5 text-muted-foreground" />
            <ChevronUp v-else class="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>

    <!-- Expandable details (MOM 11.2): whatever the payload carries -->
    <div
      v-if="expanded"
      :data-testid="`ppc-service-details-${idx}`"
      class="border-t border-border/30 px-4 sm:px-5 py-4 space-y-3 bg-overlay-subtle/30"
    >
      <p v-if="svc.description || svc.recommendation || svc.reasoning" class="text-xs text-muted-foreground leading-relaxed">
        {{ svc.description || svc.recommendation || svc.reasoning }}
      </p>
      <div v-for="row in ppcServiceDetailRows(svc)" :key="row.labelKey" class="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-2">
        <span class="text-[11px] uppercase tracking-wider text-muted-foreground shrink-0">{{ t(row.labelKey) }}</span>
        <span class="text-xs leading-relaxed">{{ row.text }}</span>
      </div>
      <div v-if="svc.pros?.length" class="flex flex-wrap gap-1">
        <span v-for="pro in (svc.pros ?? [])" :key="pro" class="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success/80">
          {{ pro }}
        </span>
      </div>
      <div v-if="svc.cons?.length" class="flex flex-wrap gap-1">
        <span v-for="con in svc.cons" :key="con" class="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive/80">
          {{ con }}
        </span>
      </div>
    </div>
  </div>
</template>
