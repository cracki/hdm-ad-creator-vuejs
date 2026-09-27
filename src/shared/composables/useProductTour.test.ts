import { describe, it, expect, beforeEach } from 'vitest'
import { useProductTour, tourTargetExists } from './useProductTour'
import type { TourDefinition } from './useProductTour'

/**
 * QA fix 4: dismissing a tour (X / backdrop / skip) must persist completion
 * in the same localStorage store finish() uses — otherwise the tour re-opens
 * on every page load.
 */

const COMPLETION_KEY = 'hdm_tour_completed'

function makeTour(overrides: Partial<TourDefinition> = {}): TourDefinition {
  return {
    id: `tour-${Math.random().toString(36).slice(2)}`,
    routeNames: ['test-route'],
    steps: [
      { target: '#a', titleKey: 'tour.prev', descriptionKey: 'tour.prev' },
      { target: '#b', titleKey: 'tour.next', descriptionKey: 'tour.next' },
      { target: '#c', titleKey: 'tour.finish', descriptionKey: 'tour.finish' },
    ],
    ...overrides,
  }
}

describe('useProductTour — dismissal persistence (QA fix 4)', () => {
  const tour = useProductTour()

  beforeEach(() => {
    localStorage.clear()
    tour.resetAllTours()
  })

  function readStore(): Record<string, boolean> {
    return JSON.parse(localStorage.getItem(COMPLETION_KEY) ?? '{}')
  }

  it('dismiss() marks the tour completed in the same store finish() uses', () => {
    const def = makeTour()
    tour.registerTour(def)
    tour.startTour(def.id)
    expect(tour.isActive.value).toBe(true)

    tour.dismiss()

    expect(tour.isActive.value).toBe(false)
    expect(tour.hasCompletedTour(def.id)).toBe(true)
    expect(readStore()[def.id]).toBe(true)
  })

  it('skipping steps with next() does NOT complete the tour', () => {
    const def = makeTour()
    tour.registerTour(def)
    tour.startTour(def.id)

    tour.next() // step 1 → 2
    tour.next() // step 2 → 3
    expect(tour.currentStepIndex.value).toBe(2)
    expect(tour.isActive.value).toBe(true)
    expect(tour.hasCompletedTour(def.id)).toBe(false)
    expect(readStore()[def.id]).toBeUndefined()
  })

  it('finish() (last step) marks the tour completed', () => {
    const def = makeTour()
    tour.registerTour(def)
    tour.startTour(def.id)

    tour.next()
    tour.next()
    tour.next() // advances past the last step → finish()

    expect(tour.isActive.value).toBe(false)
    expect(tour.hasCompletedTour(def.id)).toBe(true)
    expect(readStore()[def.id]).toBe(true)
  })

  it('a silently-hidden tour (all steps filtered out) does not get marked completed', () => {
    const def = makeTour({
      steps: [{ target: '#a', titleKey: 'tour.prev', descriptionKey: 'tour.prev', beforeShow: () => false }],
    })
    tour.registerTour(def)
    tour.startTour(def.id)

    expect(tour.isActive.value).toBe(false)
    expect(tour.hasCompletedTour(def.id)).toBe(false)
  })

  it('auto-start is suppressed for tours the user dismissed', () => {
    const def = makeTour({ autoStartOnFirstVisit: true })
    tour.registerTour(def)
    tour.startTour(def.id)
    tour.dismiss()

    tour.autoStartForRoute('test-route')
    // autoStart is delayed — flush the timer
    return new Promise((resolve) => setTimeout(resolve, 1400)).then(() => {
      expect(tour.isActive.value).toBe(false)
    })
  })

  it('resetTourCompletion clears the persisted dismissal', () => {
    const def = makeTour()
    tour.registerTour(def)
    tour.startTour(def.id)
    tour.dismiss()

    tour.resetTourCompletion(def.id)
    expect(tour.hasCompletedTour(def.id)).toBe(false)
    expect(readStore()[def.id]).toBeUndefined()
  })
})

describe('tourTargetExists', () => {
  it('reflects DOM presence of the selector', () => {
    const el = document.createElement('div')
    el.setAttribute('data-tour', 'x')
    document.body.appendChild(el)
    try {
      expect(tourTargetExists('[data-tour="x"]')).toBe(true)
      expect(tourTargetExists('[data-tour="missing"]')).toBe(false)
    } finally {
      el.remove()
    }
  })

  it('swallows invalid selectors', () => {
    expect(tourTargetExists('<<<')).toBe(false)
  })
})
