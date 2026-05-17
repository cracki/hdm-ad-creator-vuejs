<script setup lang="ts">
import { computed, watch, ref, nextTick } from 'vue'
import { X, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import { useI18n } from '@/shared/utils/i18n'
import { useProductTour, TOUR_STEPS } from '@/shared/composables/useProductTour'

const { isActive, currentStep, close, next, prev } = useProductTour()
const { t } = useI18n()

const tooltipStyle = ref<Record<string, string>>({})
const cutoutPath = ref('')
const vpWidth = ref(0)
const vpHeight = ref(0)
const highlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })

const step = computed(() => TOUR_STEPS[currentStep.value])
const isLast = computed(() => currentStep.value === TOUR_STEPS.length - 1)

function updatePosition() {
  if (!step.value || !isActive.value) return
  const el = document.querySelector(step.value.target)
  if (!el) return

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

  const pos = step.value.position ?? 'bottom'
  const ttWidth = 320

  let top: number
  let left: number

  switch (pos) {
    case 'bottom':
      top = rect.bottom + 12
      left = rect.left + rect.width / 2 - ttWidth / 2
      break
    case 'top':
      top = rect.top - 180
      left = rect.left + rect.width / 2 - ttWidth / 2
      break
    case 'end':
      top = rect.top
      left = rect.right + 12
      break
    case 'start':
      top = rect.top
      left = rect.left - ttWidth - 12
      break
    default:
      top = rect.bottom + 12
      left = rect.left + rect.width / 2 - ttWidth / 2
  }

  top = Math.max(8, Math.min(top, h - 200))
  left = Math.max(8, Math.min(left, w - ttWidth - 8))

  tooltipStyle.value = { top: `${top}px`, left: `${left}px` }
}

watch([currentStep, isActive], () => nextTick(updatePosition), { immediate: true })
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
        class="fixed w-80 surface-card p-5 z-[10000] transition-all duration-300"
        :style="tooltipStyle"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="text-xs font-semibold text-primary uppercase tracking-wider">
            {{ currentStep + 1 }} / {{ TOUR_STEPS.length }}
          </div>
          <button class="h-6 w-6 grid place-items-center rounded-md hover:bg-white/[0.06] text-muted-foreground" @click="close">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <h4 class="text-sm font-semibold mb-1.5">{{ t(step?.titleKey as any) }}</h4>
        <p class="text-xs text-muted-foreground leading-relaxed mb-4">{{ t(step?.descriptionKey as any) }}</p>

        <div class="flex items-center justify-between">
          <button
            class="h-8 px-3 rounded-md text-xs font-medium hover:bg-white/[0.04] transition"
            :class="{ 'opacity-30 pointer-events-none': currentStep === 0 }"
            @click="prev"
          >
            <ChevronLeft class="h-3.5 w-3.5 inline me-1" />
            {{ t('tour.prev') }}
          </button>
          <div class="flex gap-1">
            <span
              v-for="i in TOUR_STEPS.length"
              :key="i"
              :class="['h-1 rounded-full transition-all', i - 1 === currentStep ? 'w-4 bg-primary' : 'w-1.5 bg-white/20']"
            />
          </div>
          <button
            class="h-8 px-3 rounded-md bg-[image:var(--gradient-brand)] text-primary-foreground text-xs font-medium"
            @click="next"
          >
            {{ isLast ? t('tour.finish') : t('tour.next') }}
            <ChevronRight v-if="!isLast" class="h-3.5 w-3.5 inline ms-1" />
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
