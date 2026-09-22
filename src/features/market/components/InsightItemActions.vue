<script setup lang="ts">
import { computed, ref } from 'vue'
import { FolderPlus, Check, Loader2, FileText, Copy, Download, X } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import { triggerDownload } from '@/shared/utils/download'
import {
  appendContentInsight,
  buildInsightBrief,
  insightBriefFilename,
  type MarketInsightView,
} from '../insights'

/**
 * Per-insight-item Content Intelligence actions (MOM):
 *  - "Add to Campaign" → pick one of the user's campaigns → PATCH that
 *    campaign's context_payload with the merged content_insights list.
 *  - "Generate Brief" → client-side print-friendly brief modal with Copy and
 *    Download (.md) — no backend call.
 */
const props = defineProps<{
  view: MarketInsightView
  title: string
  snippet: string
  /** Optional suggested-angle override for the brief. */
  angle?: string
}>()

const { t } = useI18n()
const toast = useToast()

const { data: campaigns, isLoading: campaignsLoading } = useCampaigns()
const updateMutation = useUpdateCampaign()

// ── Add to Campaign ───────────────────────────────────────
const showCampaigns = ref(false)
const added = ref(false)

function openCampaigns() {
  showCampaigns.value = true
}

function addToCampaign(campaignUuid: string, campaignName: string) {
  const campaign = (campaigns.value ?? []).find((c) => c.campaign_uuid === campaignUuid)
  updateMutation.mutate(
    {
      uuid: campaignUuid,
      // Merge (never clobber) the campaign's context_payload and append the
      // insight reference, capped at the last 20 entries.
      payload: appendContentInsight(campaign?.context_payload, {
        view: props.view,
        title: props.title,
        snippet: props.snippet,
      }),
    },
    {
      onSuccess: () => {
        showCampaigns.value = false
        added.value = true
        toast.success(t('insight.added', { name: campaignName }))
      },
      onError: () => toast.error(t('insight.addFailed')),
    },
  )
}

// ── Generate Brief (client-side, print-friendly) ──────────
const showBrief = ref(false)
const copied = ref(false)

const brief = computed(() =>
  buildInsightBrief({ view: props.view, title: props.title, snippet: props.snippet, angle: props.angle }),
)

function openBrief() {
  copied.value = false
  showBrief.value = true
}

async function copyBrief() {
  try {
    await navigator.clipboard.writeText(brief.value)
    copied.value = true
    toast.success(t('insight.copied'))
  } catch {
    toast.error(t('insight.addFailed'))
  }
}

function downloadBrief() {
  triggerDownload(new Blob([brief.value], { type: 'text/markdown;charset=utf-8' }), insightBriefFilename(props.title))
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <!-- Saved badge -->
    <span
      v-if="added"
      data-testid="insight-added-badge"
      class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success"
    >
      <Check class="h-3 w-3" /> {{ t('insight.addedBadge') }}
    </span>

    <button
      type="button"
      data-testid="insight-add-btn"
      :disabled="added"
      class="h-8 px-2.5 rounded-lg border border-border/60 text-[11px] font-medium flex items-center gap-1.5 hover:bg-overlay-subtle transition disabled:opacity-60 disabled:cursor-not-allowed"
      @click="openCampaigns"
    >
      <FolderPlus class="h-3.5 w-3.5" /> {{ t('insight.addToCampaign') }}
    </button>
    <button
      type="button"
      data-testid="insight-brief-btn"
      class="h-8 px-2.5 rounded-lg border border-primary/40 text-primary text-[11px] font-medium flex items-center gap-1.5 hover:bg-primary/10 transition"
      @click="openBrief"
    >
      <FileText class="h-3.5 w-3.5" /> {{ t('insight.generateBrief') }}
    </button>
  </div>

  <!-- Campaign picker sheet (bottom sheet on mobile, dialog on desktop) -->
  <div
    v-if="showCampaigns"
    role="dialog"
    aria-modal="true"
    :aria-label="t('insight.pickCampaign')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="showCampaigns = false"
  >
    <div data-testid="insight-campaign-modal" class="surface-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-sm font-semibold">{{ t('insight.pickCampaign') }}</div>
          <div class="text-xs text-muted-foreground mt-0.5">{{ t('insight.pickCampaignDesc') }}</div>
        </div>
        <button type="button" data-testid="insight-campaign-close" class="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:bg-overlay-subtle transition" @click="showCampaigns = false">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div v-if="campaignsLoading" class="flex justify-center py-6">
        <Loader2 class="h-5 w-5 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="!campaigns?.length" class="text-xs text-muted-foreground py-4 text-center">
        {{ t('insight.noCampaigns') }}
      </div>

      <div v-else class="space-y-1.5">
        <button
          v-for="c in campaigns"
          :key="c.campaign_uuid"
          type="button"
          data-testid="insight-campaign-option"
          :disabled="updateMutation.isPending.value"
          class="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-border/60 hover:bg-overlay-subtle transition text-start disabled:opacity-50"
          @click="addToCampaign(c.campaign_uuid, c.name)"
        >
          <span class="min-w-0">
            <span class="block text-xs font-medium truncate">{{ c.name }}</span>
            <span class="block text-[10px] text-muted-foreground capitalize">{{ c.status }}</span>
          </span>
          <Loader2 v-if="updateMutation.isPending.value" class="h-3.5 w-3.5 animate-spin shrink-0" />
          <FolderPlus v-else class="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>
    </div>
  </div>

  <!-- Brief sheet (print-friendly) -->
  <div
    v-if="showBrief"
    role="dialog"
    aria-modal="true"
    :aria-label="t('insight.briefTitle')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="showBrief = false"
  >
    <div data-testid="insight-brief-modal" class="surface-card w-full sm:max-w-lg rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div class="flex items-start justify-between gap-2">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-primary font-semibold">{{ t('insight.briefTitle') }}</div>
          <h3 data-testid="insight-brief-title" class="text-base font-semibold leading-snug mt-1">{{ title }}</h3>
        </div>
        <button type="button" data-testid="insight-brief-close" class="h-7 w-7 rounded-md grid place-items-center text-muted-foreground hover:bg-overlay-subtle transition" @click="showBrief = false">
          <X class="h-3.5 w-3.5" />
        </button>
      </div>

      <div class="space-y-3">
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{{ t('insight.briefSummaryLabel') }}</div>
          <p data-testid="insight-brief-summary" class="text-xs text-muted-foreground leading-relaxed">{{ snippet || '—' }}</p>
        </div>
        <div>
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{{ t('insight.briefAngleLabel') }}</div>
          <p data-testid="insight-brief-angle" class="text-xs leading-relaxed">{{ angle || snippet || '—' }}</p>
        </div>
      </div>

      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          data-testid="insight-brief-copy"
          class="h-10 sm:h-9 px-4 rounded-lg border border-border/60 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-overlay-subtle transition w-full sm:w-auto"
          @click="copyBrief"
        >
          <component :is="copied ? Check : Copy" class="h-3.5 w-3.5" />
          {{ copied ? t('insight.copied') : t('insight.briefCta') }}
        </button>
        <button
          type="button"
          data-testid="insight-brief-download"
          class="h-10 sm:h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto"
          @click="downloadBrief"
        >
          <Download class="h-3.5 w-3.5" /> {{ t('insight.downloadMd') }}
        </button>
      </div>
    </div>
  </div>
</template>
