import { ref, readonly, type Ref } from 'vue'

export type GuidedActionVariant = 'welcome' | 'empty' | 'blocked' | 'completed'

export type GuidedActionFeature =
  | 'brands'
  | 'campaigns'
  | 'adLibrary'
  | 'competitors'
  | 'market'
  | 'scenarioVariants'
  | 'dashboard'
  | 'brandDetail'
  | 'campaignSteps'

export interface GuidedActionState {
  seen: boolean
  dismissed: boolean
  completedAt: string | null
  completedSteps: string[]
}

export interface ActionStep {
  id: string
  titleKey: string
  descriptionKey: string
  completed?: boolean
}

export interface ActionPath {
  labelKey: string
  icon?: unknown
  handler?: () => void
  to?: string
  variant?: 'primary' | 'secondary' | 'outline'
}

const STORAGE_PREFIX = 'hdm_guided_'

const stateMap = new Map<string, GuidedActionState>()

function getState(id: string): GuidedActionState {
  if (stateMap.has(id)) return stateMap.get(id)!
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (raw) {
      const parsed = JSON.parse(raw) as GuidedActionState
      stateMap.set(id, parsed)
      return parsed
    }
  } catch {}
  const initial: GuidedActionState = { seen: false, dismissed: false, completedAt: null, completedSteps: [] }
  stateMap.set(id, initial)
  return initial
}

function persist(id: string) {
  try {
    const state = stateMap.get(id)
    if (state) localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state))
  } catch {}
}

// Module-level reactive progress
const featureProgress = ref<Record<GuidedActionFeature, number>>({
  brands: 0,
  campaigns: 0,
  adLibrary: 0,
  competitors: 0,
  market: 0,
  scenarioVariants: 0,
  dashboard: 0,
  brandDetail: 0,
  campaignSteps: 0,
})

const overallProgress = ref(0)

function recalcProgress() {
  const values = Object.values(featureProgress.value)
  const sum = values.reduce((a, b) => a + b, 0)
  overallProgress.value = Math.round(sum / values.length)
}

const MILESTONE_IDS = ['brands-first', 'campaigns-first', 'ad-library-first']

export function useGuidedActions() {
  function isActionCompleted(id: string): boolean {
    return getState(id).completedAt !== null
  }

  function markCompleted(id: string): void {
    const state = getState(id)
    state.completedAt = new Date().toISOString()
    state.seen = true
    persist(id)
  }

  function markStepDone(actionId: string, stepId: string): void {
    const state = getState(actionId)
    if (!state.completedSteps.includes(stepId)) {
      state.completedSteps.push(stepId)
      persist(actionId)
    }
  }

  function dismiss(actionId: string): void {
    const state = getState(actionId)
    state.dismissed = true
    state.seen = true
    persist(actionId)
  }

  function isDismissed(actionId: string): boolean {
    return getState(actionId).dismissed
  }

  function markSeen(id: string): void {
    const state = getState(id)
    state.seen = true
    persist(id)
  }

  function setFeatureProgress(feature: GuidedActionFeature, value: number): void {
    featureProgress.value[feature] = Math.min(100, Math.max(0, value))
    recalcProgress()
  }

  return {
    isActionCompleted,
    markCompleted,
    markStepDone,
    dismiss,
    isDismissed,
    markSeen,
    getState,
    setFeatureProgress,
    featureProgress: readonly(featureProgress) as Readonly<Ref<Record<GuidedActionFeature, number>>>,
    overallProgress: readonly(overallProgress) as Readonly<Ref<number>>,
  }
}
