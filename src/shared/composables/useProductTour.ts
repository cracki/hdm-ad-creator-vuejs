import { ref, readonly } from 'vue'

export interface TourStep {
  target: string
  titleKey: string
  descriptionKey: string
  position?: 'top' | 'bottom' | 'start' | 'end'
}

export const TOUR_STEPS: TourStep[] = [
  { target: '[data-tour="sidebar-brands"]', titleKey: 'tour.brandsTitle', descriptionKey: 'tour.brandsDesc', position: 'end' },
  { target: '[data-tour="sidebar-campaigns"]', titleKey: 'tour.campaignsTitle', descriptionKey: 'tour.campaignsDesc', position: 'end' },
  { target: '[data-tour="sidebar-intelligence"]', titleKey: 'tour.intelTitle', descriptionKey: 'tour.intelDesc', position: 'end' },
  { target: '[data-tour="credits-bar"]', titleKey: 'tour.creditsTitle', descriptionKey: 'tour.creditsDesc', position: 'end' },
  { target: '[data-tour="topbar-search"]', titleKey: 'tour.searchTitle', descriptionKey: 'tour.searchDesc', position: 'bottom' },
]

const TOUR_SEEN_KEY = 'hdm_tour_completed'

// Module-level singleton state — shared across all callers
const isActive = ref(false)
const currentStep = ref(0)

function hasSeenTour(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === 'true' } catch { return false }
}

function markTourSeen() {
  try { localStorage.setItem(TOUR_SEEN_KEY, 'true') } catch {}
}

function start() {
  isActive.value = true
  currentStep.value = 0
}

function next() {
  if (currentStep.value < TOUR_STEPS.length - 1) {
    currentStep.value++
  } else {
    close()
  }
}

function prev() {
  if (currentStep.value > 0) currentStep.value--
}

function close() {
  isActive.value = false
  markTourSeen()
}

function autoStart() {
  if (!hasSeenTour()) {
    setTimeout(start, 1500)
  }
}

export function useProductTour() {
  return {
    isActive: readonly(isActive),
    currentStep: readonly(currentStep),
    steps: TOUR_STEPS,
    start,
    next,
    prev,
    close,
    autoStart,
  }
}
