<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useProductTour } from '@/shared/composables/useProductTour'

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

async function waitForElement(step: typeof currentStep.value): Promise<Element | null> {
  if (!step) return null
  const maxWait = step.waitFor ?? 0
  if (maxWait <= 0) return document.querySelector(step.target)

  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const el = document.querySelector(step.target)
    if (el) return el
    await new Promise(r => setTimeout(r, 100))
  }
  return document.querySelector(step.target)
}

async function updatePosition() {
  if (!currentStep.value || !isActive.value) return

  const el = await waitForElement(currentStep.value)
  if (!el || !isActive.value) return

  // Only scroll on step change, not on re-renders
  if (prevStepIndex.value !== currentStepIndex.value) {
    prevStepIndex.value = currentStepIndex.value
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // Wait for scroll to settle before measuring
    await new Promise(r => setTimeout(r, 300))
    if (!isActive.value) return
  }

  const rect = el.getBoundingClientRect()
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
  waitTimer = setTimeout(() => nextTick(updatePosition), 50) as unknown as typeof waitTimer
}, { immediate: true })

onMounted(() => {
  const observer = new MutationObserver(onDirChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['dir'] })
  onUnmounted(() => observer.disconnect())
})

onUnmounted(() => {
  if (waitTimer) clearTimeout(waitTimer)
})
</script>

<template>
  <Teleport to="body">
    <div v-if="isActive" class="fixed inset-0 z-[9999]">
      <!-- SVG cutout backdrop -->
      <svg class="absolute inset-0 w-full h-full" :viewBox="`0 0 ${vpWidth} ${vpHeight}`" style="pointer-events: auto">
        <defs>
          <clipPath id="tour-cutout">
            <path :d="cutoutPath" clip-rule="evenodd" />
          </clipPath>
        </defs>
        <rect x="0" y="0" :width="vpWidth" :height="vpHeight" fill="rgba(0,0,0,0.6)" clip-path="url(#tour-cutout)" />
      </svg>

      <!-- Highlight ring -->
      <div
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
