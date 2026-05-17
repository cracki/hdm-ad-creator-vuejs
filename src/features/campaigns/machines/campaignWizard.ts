import { reactive, computed, watch, type Ref } from 'vue'
import type { Campaign } from '../types'

export type StepState = 'idle' | 'loading' | 'completed' | 'failed'

export interface StepDef {
  n: number
  labelKey: string
  iconKey: string
}

export const WIZARD_STEPS: StepDef[] = [
  { n: 1, labelKey: 'smart.s1', iconKey: 'Brain' },
  { n: 2, labelKey: 'smart.s2', iconKey: 'Users' },
  { n: 3, labelKey: 'smart.s3', iconKey: 'Target' },
  { n: 4, labelKey: 'smart.s4', iconKey: 'Layers' },
  { n: 5, labelKey: 'smart.s5', iconKey: 'Grid3x3' },
  { n: 6, labelKey: 'smart.s6', iconKey: 'MonitorSmartphone' },
  { n: 7, labelKey: 'smart.s7', iconKey: 'Settings2' },
  { n: 8, labelKey: 'smart.s8', iconKey: 'Sparkles' },
  { n: 9, labelKey: 'smart.s9', iconKey: 'ImageIcon' },
  { n: 10, labelKey: 'smart.s10', iconKey: 'Download' },
]

function isStepCompleted(campaign: Campaign, step: number, adsCount?: number): boolean {
  const ctx = campaign.context_payload as any
  switch (step) {
    case 1: return true // Brand intelligence always available
    case 2: return campaign.segmentation_completed
    case 3: return campaign.ppc_viability_completed
    case 4: return campaign.funnel_completed
    case 5: return campaign.content_strategy_completed
    case 6: return (ctx?.selected_platforms?.length ?? 0) > 0
    case 7: {
      const platforms: string[] = ctx?.selected_platforms ?? []
      return platforms.length > 0 && platforms.every(p => campaign[`${p}_ads_completed` as keyof Campaign] as boolean)
    }
    case 8: return (adsCount ?? 0) > 0
    case 9: return campaign.status === 'completed' || (adsCount ?? 0) > 0
    case 10: return campaign.status === 'completed'
    default: return false
  }
}

export function getFirstIncompleteStep(campaign: Campaign | null, adsCount?: number): number {
  if (!campaign) return 1
  for (let i = 1; i <= 10; i++) {
    if (!isStepCompleted(campaign, i, adsCount)) return i
  }
  return 10
}

export function useCampaignWizard(campaign: Ref<Campaign | null>, adsCount?: Ref<number | undefined>) {
  const state = reactive({
    currentStep: 1,
    stepStates: {} as Record<number, StepState>,
  })

  const stepCompletion = computed(() => {
    const result: Record<number, boolean> = {}
    if (!campaign.value) return result
    for (let i = 1; i <= 10; i++) {
      result[i] = isStepCompleted(campaign.value, i, adsCount?.value)
    }
    return result
  })

  const progress = computed(() => {
    const completed = Object.values(stepCompletion.value).filter(Boolean).length
    return Math.round((completed / 10) * 100)
  })

  const canNavigateTo = computed(() => {
    const result: Record<number, boolean> = {}
    if (!campaign.value) {
      for (let i = 1; i <= 10; i++) result[i] = i === 1
      return result
    }
    // Can navigate to a step if all previous steps are completed
    result[1] = true
    for (let i = 2; i <= 10; i++) {
      result[i] = stepCompletion.value[i - 1]
    }
    return result
  })

  const canGoNext = computed(() => {
    if (state.currentStep >= 10) return false
    return stepCompletion.value[state.currentStep] ?? false
  })

  const canGoBack = computed(() => state.currentStep > 1)

  function goToStep(step: number) {
    if (step < 1 || step > 10) return
    if (!canNavigateTo.value[step]) return
    state.currentStep = step
  }

  function next() {
    if (!canGoNext.value) return
    const nextStep = state.currentStep + 1
    if (canNavigateTo.value[nextStep]) {
      state.currentStep = nextStep
    }
  }

  function back() {
    if (!canGoBack.value) return
    state.currentStep = Math.max(1, state.currentStep - 1)
  }

  function setStepState(step: number, s: StepState) {
    state.stepStates[step] = s
  }

  function getStepState(step: number): StepState {
    if (state.stepStates[step]) return state.stepStates[step]
    if (stepCompletion.value[step]) return 'completed'
    return 'idle'
  }

  function initStep(step: number) {
    state.currentStep = step
  }

  // Auto-redirect to first incomplete step when campaign loads
  watch(campaign, (c) => {
    if (!c) return
    // Only auto-redirect if current step hasn't been explicitly set yet
    // and is beyond what's available
    if (!canNavigateTo.value[state.currentStep]) {
      state.currentStep = getFirstIncompleteStep(c, adsCount?.value)
    }
  }, { immediate: true })

  return {
    currentStep: computed(() => state.currentStep),
    stepCompletion,
    progress,
    canNavigateTo,
    canGoNext,
    canGoBack,
    goToStep,
    next,
    back,
    setStepState,
    getStepState,
    initStep,
    steps: WIZARD_STEPS,
  }
}
