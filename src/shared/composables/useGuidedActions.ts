import { reactive } from 'vue'

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
  title: string
  description?: string
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
const reactiveMap = reactive(new Map<string, GuidedActionState>())

function getState(id: string): GuidedActionState {
  if (reactiveMap.has(id)) return reactiveMap.get(id)!
  let initial: GuidedActionState = { seen: false, dismissed: false, completedAt: null, completedSteps: [] }
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + id)
    if (raw) initial = { ...initial, ...JSON.parse(raw) }
  } catch {}
  reactiveMap.set(id, initial)
  return initial
}

function persist(id: string) {
  try {
    const state = reactiveMap.get(id)
    if (state) localStorage.setItem(STORAGE_PREFIX + id, JSON.stringify(state))
  } catch {}
}

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

  return {
    isActionCompleted,
    markCompleted,
    markStepDone,
    dismiss,
    isDismissed,
    markSeen,
    getState,
  }
}
