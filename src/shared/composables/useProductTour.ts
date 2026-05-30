import { ref, readonly, computed } from 'vue'

export interface TourStep {
  target: string
  titleKey: string
  descriptionKey: string
  position?: 'top' | 'bottom' | 'start' | 'end'
  beforeShow?: () => boolean
  waitFor?: number
}

export interface TourDefinition {
  id: string
  steps: TourStep[]
  routeNames: string[]
  autoStartOnFirstVisit?: boolean
  autoStartDelay?: number
}

const COMPLETION_KEY = 'hdm_tour_completed'

const isActive = ref(false)
const currentStepIndex = ref(0)
const activeTourId = ref<string | null>(null)
const registry = new Map<string, TourDefinition>()

// --- Completion tracking (cached) ---

let completionCache: Record<string, boolean> | null = null

function loadCompletion(): Record<string, boolean> {
  if (completionCache) return completionCache
  try {
    const raw = localStorage.getItem(COMPLETION_KEY)
    if (raw === 'true') {
      const migrated: Record<string, boolean> = { welcome: true }
      localStorage.setItem(COMPLETION_KEY, JSON.stringify(migrated))
      completionCache = migrated
      return migrated
    }
    completionCache = raw ? JSON.parse(raw) : {}
    return completionCache!
  } catch {
    completionCache = {}
    return completionCache
  }
}

function saveCompletion(state: Record<string, boolean>) {
  completionCache = state
  try { localStorage.setItem(COMPLETION_KEY, JSON.stringify(state)) } catch {}
}

function hasCompletedTour(tourId: string): boolean {
  return loadCompletion()[tourId] === true
}

function markTourCompleted(tourId: string) {
  const state = { ...loadCompletion() }
  state[tourId] = true
  saveCompletion(state)
}

function resetTourCompletion(tourId: string) {
  const state = { ...loadCompletion() }
  delete state[tourId]
  saveCompletion(state)
}

function resetAllTours() {
  saveCompletion({})
}

// --- Active step filtering ---

const activeSteps = computed(() => {
  if (!activeTourId.value) return []
  const def = registry.get(activeTourId.value)
  return def?.steps ?? []
})

const currentStep = computed<TourStep | null>(() =>
  activeSteps.value[currentStepIndex.value] ?? null,
)

const isLastStep = computed(() =>
  currentStepIndex.value >= activeSteps.value.length - 1,
)

const totalSteps = computed(() => activeSteps.value.length)

// --- Tour lifecycle ---

function registerTour(def: TourDefinition) {
  registry.set(def.id, def)
}

function unregisterTour(id: string) {
  if (activeTourId.value === id) dismiss()
  registry.delete(id)
}

function startTour(tourId: string) {
  const def = registry.get(tourId)
  if (!def) return

  activeTourId.value = tourId
  currentStepIndex.value = 0
  isActive.value = true

  // If all steps are hidden, silently dismiss without marking completed
  const firstVisible = findNextVisibleStep(0, 1)
  if (firstVisible === -1) {
    dismiss()
    return
  }
  currentStepIndex.value = firstVisible
}

function findNextVisibleStep(startIdx: number, direction: 1 | -1): number {
  const steps = activeSteps.value
  let idx = startIdx
  while (idx >= 0 && idx < steps.length) {
    const step = steps[idx]
    if (step.beforeShow && !step.beforeShow()) {
      idx += direction
    } else {
      return idx
    }
  }
  return -1
}

/** User completed all steps — mark as done */
function finish() {
  const tourId = activeTourId.value
  isActive.value = false
  activeTourId.value = null
  currentStepIndex.value = 0
  if (tourId) markTourCompleted(tourId)
}

/** User dismissed (X button) or navigated away — do NOT mark completed */
function dismiss() {
  isActive.value = false
  activeTourId.value = null
  currentStepIndex.value = 0
}

function next() {
  const nextIdx = findNextVisibleStep(currentStepIndex.value + 1, 1)
  if (nextIdx === -1) {
    finish()
  } else {
    currentStepIndex.value = nextIdx
  }
}

function prev() {
  const prevIdx = findNextVisibleStep(currentStepIndex.value - 1, -1)
  if (prevIdx >= 0) currentStepIndex.value = prevIdx
}

function close() {
  dismiss()
}

function autoStartForRoute(routeName: string) {
  for (const def of registry.values()) {
    if (
      def.routeNames.includes(routeName) &&
      def.autoStartOnFirstVisit &&
      !hasCompletedTour(def.id)
    ) {
      const delay = def.autoStartDelay ?? 1200
      setTimeout(() => startTour(def.id), delay)
      return
    }
  }
}

export function useProductTour() {
  return {
    isActive: readonly(isActive),
    currentStepIndex: readonly(currentStepIndex),
    activeTourId: readonly(activeTourId),
    activeSteps,
    currentStep,
    isLastStep,
    totalSteps,

    registerTour,
    unregisterTour,
    startTour,
    next,
    prev,
    close,
    dismiss,
    finish,
    autoStartForRoute,
    hasCompletedTour,
    markTourCompleted,
    resetTourCompletion,
    resetAllTours,
  }
}
