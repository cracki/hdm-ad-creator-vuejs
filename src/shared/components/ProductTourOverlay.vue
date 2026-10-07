<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useProductTour, waitForTourTarget, queryTourTarget } from '@/shared/composables/useProductTour'

const { isActive, currentStep, currentStepIndex, totalSteps, isLastStep, dismiss, finish, next, prev } = useProductTour()
const { t } = useI18n()

const isRtl = ref(document.documentElement.dir === 'rtl')
const onDirChange = () => { isRtl.value = document.documentElement.dir === 'rtl' }

const tooltipStyle = ref<Record<string, string>>({})
const cutoutPath = ref('')
const vpWidth = ref(0)
const vpHeight = ref(0)
const highlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const prevStepIndex = ref(-1)

let waitTimer: ReturnType<typeof setTimeout> | null = null

// QA4-img30: measurements are async — a monotonically increasing token lets an
// in-flight measurement abort when a newer one (step change, scroll, resize)
// supersedes it.
let measureToken = 0
let measureRaf: number | null = null

/** One animation frame (rAF when available, short timer otherwise). */
function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => resolve())
    else setTimeout(resolve, 16)
  })
}

function cancelScheduledMeasure() {
  if (measureRaf !== null) {
    cancelAnimationFrame(measureRaf)
    measureRaf = null
  }
}

/**
 * Re-measure at most once per animation frame while a step is active, so the
 * ring follows the target on window resize AND scroll (including inner
 * containers — capture phase) instead of going stale (QA4-img30).
 */
function scheduleReMeasure() {
  if (!isActive.value || measureRaf !== null) return
  measureRaf = requestAnimationFrame(() => {
    measureRaf = null
    updatePosition()
  })
}

function clearHighlight() {
  // Target not in the DOM (conditionally rendered section, hidden form…) or
  // hidden (display:none → zero box). Never keep the previous step's
  // highlight — that made the tooltip point at the wrong element (QA fix 4).
  // Clear the ring/cutout and pin the tooltip top-center instead.
  const fallbackWidth = window.innerWidth < 768 ? window.innerWidth - 16 : 320
  highlightRect.value = { top: -20, left: -20, width: 0, height: 0 }
  cutoutPath.value = 'M0,0 L0,0 Z'
  tooltipStyle.value = {
    top: '24px',
    left: `${Math.max(8, window.innerWidth / 2 - fallbackWidth / 2)}px`,
    width: `${fallbackWidth}px`,
  }
}

function waitForElement(step: typeof currentStep.value): Promise<Element | null> {
  if (!step) return Promise.resolve(null)
  // QA4-img30 (a): keep polling (~50ms) for late-rendered targets — default
  // 2.5s, or the step's explicit waitFor — instead of a single attempt.
  return waitForTourTarget(step.target, step.waitFor ?? undefined)
}

/**
 * Give a smooth scrollIntoView a bounded window to finish before the first
 * precise measure. The scroll listener keeps re-measuring meanwhile, so this
 * only needs to detect "scrolling stopped" (or time out at 400ms).
 */
async function waitForScrollSettle(token: number): Promise<void> {
  const deadline = Date.now() + 400
  let lastY = window.scrollY
  let lastX = window.scrollX
  while (Date.now() < deadline) {
    await nextFrame()
    if (!isActive.value || token !== measureToken) return
    const moved = window.scrollY !== lastY || window.scrollX !== lastX
    lastY = window.scrollY
    lastX = window.scrollX
    if (!moved) return
  }
}

async function updatePosition() {
  if (!currentStep.value || !isActive.value) return
  const step = currentStep.value
  const token = ++measureToken

  const el = await waitForElement(step)
  if (!isActive.value || token !== measureToken) return

  if (!el) {
    clearHighlight()
    return
  }

  // Only scroll on step change, not on re-renders
  if (prevStepIndex.value !== currentStepIndex.value) {
    prevStepIndex.value = currentStepIndex.value
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // QA4-img30: no fixed 300ms sleep — wait (bounded) for the scroll to
    // settle; the resize/scroll listeners keep the ring glued meanwhile.
    await waitForScrollSettle(token)
    if (!isActive.value || token !== measureToken) return
  }

  // Re-query right before measuring: the element may have been re-created
  // while waiting (v-if re-render, list swap).
  const target = queryTourTarget(step.target) ?? el
  const rect = target.getBoundingClientRect()
  // QA4-img30 (b): never draw a ring around a zero box (display:none,
  // collapsed element) — retrying already happened in waitForElement.
  if (!rect || rect.width <= 0 || rect.height <= 0) {
    clearHighlight()
    return
  }

  const pad = 10
  const r = 8

  const w = window.innerWidth
  const h = window.innerHeight
  vpWidth.value = w
  vpHeight.value = h

  highlightRect.value = {
    top: rect.top - pad,
    left: rect.left - pad,
    width: rect.width + pad * 2,
    height: rect.height + pad * 2,
  }

  cutoutPath.value = `M0,0 L${w},0 L${w},${h} L0,${h} Z M${rect.left - pad},${rect.top - pad} L${rect.left - pad},${rect.bottom + pad} Q${rect.left - pad},${rect.bottom + pad + r},${rect.left - pad + r},${rect.bottom + pad} L${rect.right + pad - r},${rect.bottom + pad} Q${rect.right + pad},${rect.bottom + pad},${rect.right + pad},${rect.bottom + pad - r} L${rect.right + pad},${rect.top - pad + r} Q${rect.right + pad},${rect.top - pad},${rect.right + pad - r},${rect.top - pad} L${rect.left - pad + r},${rect.top - pad} Q${rect.left - pad},${rect.top - pad},${rect.left - pad},${rect.top - pad + r} Z`

  const rawPos = currentStep.value.position ?? 'bottom'
  const isMobile = w < 768
  const pos = (isMobile && (rawPos === 'start' || rawPos === 'end')) ? 'bottom' : rawPos
  const ttWidth = isMobile ? w - 16 : 320

  let top: number
  let left: number
  const rtl = isRtl.value

  switch (pos) {
    case 'bottom':
      top = rect.bottom + 12
      left = rect.left + rect.width / 2 - ttWidth / 2
      break
    case 'top':
      top = Math.max(8, rect.top - 180)
      left = rect.left + rect.width / 2 - ttWidth / 2
      break
    case 'end':
      top = rect.top
      left = rtl ? rect.left - ttWidth - 12 : rect.right + 12
      break
    case 'start':
      top = rect.top
      left = rtl ? rect.right + 12 : rect.left - ttWidth - 12
      break
    default:
      top = rect.bottom + 12
      left = rect.left + rect.width / 2 - ttWidth / 2
  }

  top = Math.max(8, Math.min(top, h - 200))
  left = Math.max(8, Math.min(left, w - ttWidth - 8))

  tooltipStyle.value = { top: `${top}px`, left: `${left}px`, width: `${ttWidth}px` }
}

function handleNext() {
  if (isLastStep.value) {
    finish()
  } else {
    next()
  }
}

function handleDismiss() {
  dismiss()
}

watch([currentStepIndex, isActive], () => {
  if (waitTimer) { clearTimeout(waitTimer); waitTimer = null }
  // Invalidate any in-flight measurement for the previous step and drop any
  // scheduled re-measure — the new step re-measures from scratch (QA4-img30).
  measureToken++
  cancelScheduledMeasure()
  waitTimer = setTimeout(() => nextTick(updatePosition), 50) as unknown as typeof waitTimer
}, { immediate: true })

onMounted(() => {
  const observer = new MutationObserver(onDirChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
  // QA4-img30 (c): keep the ring glued to the target while a step is active —
  // re-measure (rAF-throttled) on window resize AND scroll. `capture` catches
  // scrolls of inner containers, which don't bubble.
  window.addEventListener('resize', scheduleReMeasure, { passive: true })
  window.addEventListener('scroll', scheduleReMeasure, { passive: true, capture: true })
  onUnmounted(() => {
    observer.disconnect()
    window.removeEventListener('resize', scheduleReMeasure)
    window.removeEventListener('scroll', scheduleReMeasure, { capture: true })
    cancelScheduledMeasure()
  })
})

onUnmounted(() => {
  if (waitTimer) clearTimeout(waitTimer)
  cancelScheduledMeasure()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isActive" class="fixed inset-0 z-[9999]">
      <!-- SVG cutout backdrop — clicking it dismisses (and persists) the tour -->
      <svg class="absolute inset-0 w-full h-full" :viewBox="`0 0 ${vpWidth} ${vpHeight}`" style="pointer-events: auto" @click="handleDismiss">
        <defs>
          <clipPath id="tour-cutout">
            <path :d="cutoutPath" clip-rule="evenodd" />
          </clipPath>
        </defs>
        <rect x="0" y="0" :width="vpWidth" :height="vpHeight" fill="rgba(0,0,0,0.6)" clip-path="url(#tour-cutout)" />
      </svg>

      <!-- Highlight ring -->
      <div
        data-testid="tour-highlight-ring"
        class="absolute rounded-lg ring-2 ring-primary transition-all duration-300 pointer-events-none"
        :style="{
          top: `${highlightRect.top}px`,
          left: `${highlightRect.left}px`,
          width: `${highlightRect.width}px`,
          height: `${highlightRect.height}px`,
        }"
      />

      <!-- Tooltip -->
      <div
        dir="auto"
        data-testid="tour-tooltip"
        class="fixed p-5 z-[10000] transition-all duration-300 rounded-xl border border-border/60 shadow-2xl bg-popover"
        :style="tooltipStyle"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="text-xs font-semibold text-primary uppercase tracking-wider" dir="ltr">
            {{ currentStepIndex + 1 }} &#x200e;/ {{ totalSteps }}
          </div>
          <button data-loc="product-tour.close-btn" class="h-7 w-7 grid place-items-center rounded-md hover:bg-overlay-medium text-muted-foreground transition" @click="handleDismiss">
            <X class="h-4 w-4" />
          </button>
        </div>

        <h4 class="text-sm font-semibold mb-1.5">{{ t(currentStep?.titleKey as any) }}</h4>
        <p class="text-xs text-muted-foreground leading-relaxed mb-4">{{ t(currentStep?.descriptionKey as any) }}</p>

        <div class="flex items-center justify-between" :class="{ 'flex-row-reverse': isRtl }">
          <button
            data-loc="product-tour.prev-btn"
            class="h-9 min-w-9 px-3 rounded-md text-xs font-medium hover:bg-overlay-light transition"
            :class="{ 'opacity-30 pointer-events-none': currentStepIndex === 0 }"
            @click="prev"
          >
            <component :is="isRtl ? ChevronRight : ChevronLeft" class="h-3.5 w-3.5 inline" :class="isRtl ? 'ms-1' : 'me-1'" />
            {{ t('tour.prev') }}
          </button>
          <div class="flex gap-1">
            <span
              v-for="i in totalSteps"
              :key="i"
              :class="['h-1 rounded-full transition-all', i - 1 === currentStepIndex ? 'w-4 bg-primary' : 'w-1.5 bg-overlay-strong']"
            />
          </div>
          <button
            data-loc="product-tour.next-btn"
            class="h-9 min-w-9 px-3 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium"
            @click="handleNext"
          >
            {{ isLastStep ? t('tour.finish') : t('tour.next') }}
            <component :is="isRtl ? ChevronLeft : ChevronRight" v-if="!isLastStep" class="h-3.5 w-3.5 inline" :class="isRtl ? 'me-1' : 'ms-1'" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
