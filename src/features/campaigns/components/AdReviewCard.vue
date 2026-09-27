<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, X, Loader2 } from 'lucide-vue-next'
import OutputBlock from '@/shared/components/OutputBlock.vue'
import AdCopyEditor from '@/shared/components/AdCopyEditor.vue'
import type { AdData } from '@/shared/components/AdPreview.vue'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { useReviewAd, usePatchAd, useRefineAd } from '../queries'
import { getAdCopy } from '../types'
import type { CampaignAd, PatchAdPayload } from '../types'

/**
 * Wraps one ad card with the F13 review actions: Approve / Reject (categorized
 * reason sheet) / Refine (feedback sheet) / Edit (inline AdCopyEditor → PATCH),
 * plus the persisted review_status badge restored from GET /campaigns/{id}/ads/.
 * Every successful action emits `updated` with the fresh ad from the API.
 */
const props = defineProps<{
  ad: CampaignAd
  campaignUuid: string
}>()

const emit = defineEmits<{ updated: [ad: CampaignAd] }>()

const { t } = useI18n()
const toast = useToast()

const campaignUuidRef = computed(() => props.campaignUuid)

const reviewMutation = useReviewAd(campaignUuidRef)
const patchMutation = usePatchAd(campaignUuidRef)
const refineMutation = useRefineAd(campaignUuidRef)

const busy = computed(() =>
  reviewMutation.isPending.value || patchMutation.isPending.value || refineMutation.isPending.value,
)

// ── Review status badge (restored from the API) ───────────
const showReason = ref(false)

// ── Reject sheet ──────────────────────────────────────────
const REJECT_CATEGORIES = [
  { key: 'audience', labelKey: 'adreview.reason.audience' },
  { key: 'tone', labelKey: 'adreview.reason.tone' },
  { key: 'market', labelKey: 'adreview.reason.market' },
  { key: 'service', labelKey: 'adreview.reason.service' },
] as const

const showReject = ref(false)
const rejectText = ref('')
const rejectError = ref(false)
const selectedCategory = ref('')

function openReject() {
  rejectText.value = ''
  rejectError.value = false
  selectedCategory.value = ''
  showReject.value = true
}

function pickCategory(cat: (typeof REJECT_CATEGORIES)[number]) {
  selectedCategory.value = cat.key
  // Prefill with the localized quick reason — the user can extend it.
  rejectText.value = t(cat.labelKey)
  rejectError.value = false
}

function submitReject() {
  const reason = rejectText.value.trim()
  if (!reason) {
    rejectError.value = true
    return
  }
  reviewMutation.mutate(
    { adUuid: props.ad.campaign_ad_uuid, payload: { decision: 'rejected', reject_reason: reason } },
    {
      onSuccess: (res) => {
        showReject.value = false
        toast.success(t('adreview.rejected'))
        emit('updated', res.ad)
        // MOM 16.2: a rejection almost always leads to a refine — open the
        // refine sheet prefilled with the reject reason (editable before
        // submitting). Closing the sheet keeps the rejected badge as-is.
        refineFeedback.value = reason
        refineError.value = false
        showRefine.value = true
      },
      onError: () => toast.error(t('adreview.actionFailed')),
    },
  )
}

// ── Approve ───────────────────────────────────────────────
function approveAd() {
  reviewMutation.mutate(
    { adUuid: props.ad.campaign_ad_uuid, payload: { decision: 'approved' } },
    {
      onSuccess: (res) => {
        toast.success(t('adreview.approved'))
        emit('updated', res.ad)
      },
      onError: () => toast.error(t('adreview.actionFailed')),
    },
  )
}

// ── Refine sheet (LLM — slow) ─────────────────────────────
const showRefine = ref(false)
const refineFeedback = ref('')
const refineError = ref(false)

function openRefine() {
  refineFeedback.value = ''
  refineError.value = false
  showRefine.value = true
}

function submitRefine() {
  const feedback = refineFeedback.value.trim()
  if (!feedback) {
    refineError.value = true
    return
  }
  refineMutation.mutate(
    { adUuid: props.ad.campaign_ad_uuid, payload: { feedback } },
    {
      onSuccess: (res) => {
        showRefine.value = false
        toast.success(t('adreview.refined'))
        emit('updated', res.ad)
      },
      onError: () => toast.error(t('adreview.actionFailed')),
    },
  )
}

// ── Inline edit (AdCopyEditor → PATCH) ────────────────────
const editing = ref(false)

function toAdData(ad: CampaignAd): AdData {
  const copy = getAdCopy(ad)
  return { headline: copy.headline, primary_text: copy.body, description: copy.description, cta: copy.cta }
}

function onSaveEdit(next: AdData) {
  const orig = toAdData(props.ad)
  const payload: PatchAdPayload = {}
  if (next.headline.trim() && next.headline !== orig.headline) payload.headline = next.headline.trim()
  if (next.primary_text.trim() && next.primary_text !== orig.primary_text) payload.primary_text = next.primary_text.trim()
  if (next.description.trim() && next.description !== orig.description) payload.description = next.description.trim()
  if (next.cta.trim() && next.cta !== orig.cta) payload.cta = next.cta.trim()
  // Nothing effectively changed (e.g. the editor's Reset) — no request.
  if (Object.keys(payload).length === 0) return
  patchMutation.mutate(
    { adUuid: props.ad.campaign_ad_uuid, payload },
    {
      onSuccess: (res) => {
        editing.value = false
        toast.success(t('adreview.saved'))
        emit('updated', res.ad)
      },
      onError: () => toast.error(t('adreview.actionFailed')),
    },
  )
}
</script>

<template>
  <OutputBlock
    :approve-label="t('adreview.approve')"
    :reject-label="t('adreview.reject')"
    :edit-label="t('adreview.edit')"
    :refine-label="t('adreview.refine')"
    :disabled="busy"
    @approve="approveAd"
    @reject="openReject"
    @edit="editing = !editing"
    @refine="openRefine"
  >
    <!-- Review status (persisted server-side, restored from GET ads) -->
    <div v-if="ad.review_status" class="flex flex-wrap items-center gap-2 mb-3">
      <span
        v-if="ad.review_status === 'approved'"
        data-testid="ad-status-approved"
        class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success"
      >
        <Check class="h-3 w-3" /> {{ t('adreview.status.approved') }}
      </span>
      <button
        v-else
        type="button"
        data-testid="ad-status-rejected"
        class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition"
        @click="showReason = !showReason"
      >
        <X class="h-3 w-3" /> {{ t('adreview.status.rejected') }}
      </button>
    </div>
    <div
      v-if="ad.review_status === 'rejected' && showReason && ad.reject_reason"
      data-testid="ad-reject-reason"
      class="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2 mb-3"
    >
      {{ ad.reject_reason }}
    </div>

    <!-- Read-only card body (provided by the view) -->
    <slot v-if="!editing" />

    <!-- Inline manual edit with per-platform char limits -->
    <div v-else data-testid="ad-edit-editor" class="text-start">
      <AdCopyEditor :ad="toAdData(ad)" :platform="ad.platform" start-editing @update="onSaveEdit" />
    </div>
  </OutputBlock>

  <!-- Reject reason sheet (bottom sheet on mobile, centered dialog on desktop) -->
  <div
    v-if="showReject"
    role="dialog"
    aria-modal="true"
    :aria-label="t('adreview.rejectTitle')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="showReject = false"
  >
    <div data-testid="reject-modal" class="surface-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div>
        <div class="text-sm font-semibold">{{ t('adreview.rejectTitle') }}</div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ t('adreview.rejectDesc') }}</div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="cat in REJECT_CATEGORIES"
          :key="cat.key"
          type="button"
          :data-testid="`reject-category-${cat.key}`"
          :class="[
            'h-8 px-3 rounded-full text-xs font-medium border transition',
            selectedCategory === cat.key
              ? 'bg-destructive/15 border-destructive/50 text-destructive'
              : 'border-border/60 text-muted-foreground hover:bg-overlay-subtle',
          ]"
          @click="pickCategory(cat)"
        >
          {{ t(cat.labelKey) }}
        </button>
      </div>
      <div>
        <label class="text-[11px] uppercase tracking-wider text-muted-foreground mb-1.5 block">{{ t('adreview.rejectReasonLabel') }}</label>
        <textarea
          v-model="rejectText"
          data-testid="reject-reason-input"
          :placeholder="t('adreview.rejectPlaceholder')"
          rows="3"
          class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition resize-none"
        />
        <div v-if="rejectError" data-testid="reject-reason-error" class="text-xs text-destructive mt-1.5">{{ t('adreview.reason.required') }}</div>
      </div>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          data-testid="reject-cancel-btn"
          class="h-10 sm:h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition w-full sm:w-auto"
          @click="showReject = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          data-testid="reject-confirm-btn"
          :disabled="reviewMutation.isPending.value"
          class="h-10 sm:h-9 px-4 rounded-lg bg-destructive text-white text-xs font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
          @click="submitReject"
        >
          <Loader2 v-if="reviewMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          <X v-else class="h-3.5 w-3.5" />
          {{ t('adreview.rejectConfirm') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Refine feedback sheet -->
  <div
    v-if="showRefine"
    role="dialog"
    aria-modal="true"
    :aria-label="t('adreview.refineTitle')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="!refineMutation.isPending.value && (showRefine = false)"
  >
    <div data-testid="refine-modal" class="surface-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div>
        <div class="text-sm font-semibold">{{ t('adreview.refineTitle') }}</div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ t('adreview.refineDesc') }}</div>
      </div>
      <div>
        <textarea
          v-model="refineFeedback"
          data-testid="refine-feedback-input"
          :placeholder="t('adreview.refinePlaceholder')"
          rows="3"
          class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition resize-none"
        />
        <div v-if="refineError" data-testid="refine-feedback-error" class="text-xs text-destructive mt-1.5">{{ t('adreview.refine.required') }}</div>
      </div>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          data-testid="refine-cancel-btn"
          :disabled="refineMutation.isPending.value"
          class="h-10 sm:h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition w-full sm:w-auto disabled:opacity-50"
          @click="showRefine = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          data-testid="refine-confirm-btn"
          :disabled="refineMutation.isPending.value"
          class="h-10 sm:h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
          @click="submitRefine"
        >
          <Loader2 v-if="refineMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          {{ refineMutation.isPending.value ? t('adreview.refining') : t('adreview.refineConfirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
