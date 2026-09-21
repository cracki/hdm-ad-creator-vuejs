<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, X, Loader2, Sparkles } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useToast } from '@/shared/composables/useToast'
import { useApproveStep, useReviewStep } from '../queries'
import type { CampaignStepType } from '../types'

/**
 * Slim review bar for step outputs (segmentation / PPC viability / funnel /
 * content strategy): Approve (advancing POST …/steps/{type}/approve/), Reject
 * (category sheet → POST …/steps/{type}/review/ with a required reason) and
 * Refine (feedback sheet → re-POSTs the step's run endpoint with
 * `refinement_feedback`; the LLM is slow, so the parent's own loading state
 * covers the wait). Review state is restored from the campaign's latest_steps
 * via the `reviewStatus` / `rejectReason` props.
 */
const props = defineProps<{
  campaignUuid: string
  stepType: CampaignStepType
  /** Persisted review decision on the latest run ('' / undefined = not reviewed). */
  reviewStatus?: string | null
  rejectReason?: string | null
  /**
   * Refine runner provided by the host view: re-submits the step's run
   * endpoint with the given feedback (+ the view's form values). When absent
   * the Refine action is hidden.
   */
  runStep?: (feedback: string) => Promise<unknown>
}>()

const emit = defineEmits<{ approved: []; rejected: []; refined: [] }>()

const { t } = useI18n()
const toast = useToast()

const uuidRef = computed(() => props.campaignUuid)
const approveMutation = useApproveStep(uuidRef)
const reviewMutation = useReviewStep(uuidRef)

const busy = computed(() => approveMutation.isPending.value || reviewMutation.isPending.value)

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
    { stepType: props.stepType, payload: { decision: 'rejected', reject_reason: reason } },
    {
      onSuccess: () => {
        showReject.value = false
        toast.success(t('stepreview.rejected'))
        emit('rejected')
      },
      onError: () => toast.error(t('adreview.actionFailed')),
    },
  )
}

// ── Approve ───────────────────────────────────────────────
function approveStep() {
  approveMutation.mutate(props.stepType, {
    onSuccess: () => {
      toast.success(t('stepreview.approved'))
      emit('approved')
    },
    onError: () => toast.error(t('adreview.actionFailed')),
  })
}

// ── Refine sheet (LLM re-run — slow) ──────────────────────
const FEEDBACK_MAX = 1000

const showRefine = ref(false)
const refineFeedback = ref('')
const refineError = ref(false)
const refining = ref(false)

function openRefine() {
  refineFeedback.value = ''
  refineError.value = false
  showRefine.value = true
}

async function submitRefine() {
  const feedback = refineFeedback.value.trim()
  if (!feedback) {
    refineError.value = true
    return
  }
  if (!props.runStep) return
  refining.value = true
  try {
    await props.runStep(feedback)
    showRefine.value = false
    toast.success(t('stepreview.refined'))
    emit('refined')
  } catch {
    // The host view's own error state surfaces run failures; just keep the sheet open.
    toast.error(t('adreview.actionFailed'))
  } finally {
    refining.value = false
  }
}
</script>

<template>
  <div class="surface-card px-5 py-3 space-y-3">
    <!-- Review status (persisted server-side, restored from latest_steps) -->
    <div v-if="reviewStatus" class="flex flex-wrap items-center gap-2">
      <span
        v-if="reviewStatus === 'approved'"
        data-testid="step-status-approved"
        class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-success/15 text-success"
      >
        <Check class="h-3 w-3" /> {{ t('adreview.status.approved') }}
      </span>
      <button
        v-else
        type="button"
        data-testid="step-status-rejected"
        class="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 transition"
        @click="showReason = !showReason"
      >
        <X class="h-3 w-3" /> {{ t('adreview.status.rejected') }}
      </button>
    </div>
    <div
      v-if="reviewStatus === 'rejected' && showReason && rejectReason"
      data-testid="step-reject-reason"
      class="text-xs text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2"
    >
      {{ rejectReason }}
    </div>

    <div class="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
      <button
        type="button"
        data-testid="step-approve"
        :disabled="busy"
        class="h-10 sm:h-8 px-3 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        @click="approveStep"
      >
        <Loader2 v-if="approveMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
        <Check v-else class="h-3.5 w-3.5" /> {{ t('stepreview.approve') }}
      </button>
      <button
        type="button"
        data-testid="step-reject"
        :disabled="busy"
        class="h-10 sm:h-8 px-3 rounded-lg border border-border/60 text-xs flex items-center justify-center gap-1.5 hover:bg-overlay-subtle transition w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        @click="openReject"
      >
        <X class="h-3.5 w-3.5" /> {{ t('stepreview.reject') }}
      </button>
      <button
        v-if="runStep"
        type="button"
        data-testid="step-refine"
        :disabled="busy"
        class="h-10 sm:h-8 px-3 rounded-lg border border-primary/40 text-primary text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-primary/10 transition w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
        @click="openRefine"
      >
        <Sparkles class="h-3.5 w-3.5" /> {{ t('stepreview.refine') }}
      </button>
    </div>
  </div>

  <!-- Reject reason sheet (bottom sheet on mobile, centered dialog on desktop) -->
  <div
    v-if="showReject"
    role="dialog"
    aria-modal="true"
    :aria-label="t('stepreview.rejectTitle')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="showReject = false"
  >
    <div data-testid="reject-modal" class="surface-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div>
        <div class="text-sm font-semibold">{{ t('stepreview.rejectTitle') }}</div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ t('stepreview.rejectDesc') }}</div>
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
          :placeholder="t('stepreview.rejectPlaceholder')"
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
          {{ t('stepreview.rejectConfirm') }}
        </button>
      </div>
    </div>
  </div>

  <!-- Refine feedback sheet -->
  <div
    v-if="showRefine"
    role="dialog"
    aria-modal="true"
    :aria-label="t('stepreview.refineTitle')"
    class="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center items-stretch sm:items-center bg-black/60 p-0 sm:p-4"
    @click.self="!refining && (showRefine = false)"
  >
    <div data-testid="refine-modal" class="surface-card w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
      <div>
        <div class="text-sm font-semibold">{{ t('stepreview.refineTitle') }}</div>
        <div class="text-xs text-muted-foreground mt-0.5">{{ t('stepreview.refineDesc') }}</div>
      </div>
      <div>
        <textarea
          v-model="refineFeedback"
          data-testid="refine-feedback-input"
          :placeholder="t('stepreview.refinePlaceholder')"
          rows="3"
          maxlength="1000"
          class="w-full px-3 py-2 rounded-lg bg-overlay-subtle border border-border/70 text-sm outline-none focus:border-primary/60 transition resize-none"
        />
        <div class="flex items-center justify-between mt-1.5 gap-2">
          <div v-if="refineError" data-testid="refine-feedback-error" class="text-xs text-destructive">{{ t('adreview.refine.required') }}</div>
          <span class="text-[10px] text-muted-foreground/60 ms-auto tabular-nums">{{ refineFeedback.length }}/{{ FEEDBACK_MAX }}</span>
        </div>
      </div>
      <div class="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <button
          type="button"
          data-testid="refine-cancel-btn"
          :disabled="refining"
          class="h-10 sm:h-9 px-4 rounded-lg border border-border/60 text-xs font-medium hover:bg-overlay-subtle transition w-full sm:w-auto disabled:opacity-50"
          @click="showRefine = false"
        >
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          data-testid="refine-confirm-btn"
          :disabled="refining"
          class="h-10 sm:h-9 px-4 rounded-lg bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium flex items-center justify-center gap-1.5 w-full sm:w-auto disabled:opacity-50"
          @click="submitRefine"
        >
          <Loader2 v-if="refining" class="h-3.5 w-3.5 animate-spin" />
          {{ refining ? t('stepreview.refining') : t('stepreview.refineConfirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
