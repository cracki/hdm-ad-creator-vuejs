import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import {
  useProductTour,
  tourTargetExists,
  waitForTourTarget,
  isTourTargetVisible,
  TOUR_TARGET_TIMEOUT_MS,
  TOUR_TARGET_POLL_MS,
} from './useProductTour'
import type { TourDefinition, TourStep } from './useProductTour'
import ProductTourOverlay from '@/shared/components/ProductTourOverlay.vue'

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

  it('stopTour() (programmatic teardown, e.g. route change) does NOT persist completion', () => {
    const def = makeTour()
    tour.registerTour(def)
    tour.startTour(def.id)

    tour.stopTour()

    expect(tour.isActive.value).toBe(false)
    expect(tour.hasCompletedTour(def.id)).toBe(false)
    expect(readStore()[def.id]).toBeUndefined()
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

// ── QA4-img30: robust target lookup + overlay highlight ────────────────────
//
// The overlay used to measure the target after a FIXED 300ms sleep with a
// single querySelector attempt: late-rendered targets left the ring stale and
// hidden targets (display:none → zero rect) produced a collapsed ring.

type Box = { top: number; left: number; width: number; height: number }

function zeroRect(): DOMRect {
  return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON: () => ({}) } as unknown as DOMRect
}

/** Fake bounding boxes by element id; elements without an entry have a zero box. */
let boxes: Map<string, Box>
let rectSpy: MockInstance

function installBoxStub() {
  boxes = new Map()
  rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const box = boxes.get(this.id)
    if (!box) return zeroRect()
    return {
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
      right: box.left + box.width,
      bottom: box.top + box.height,
      x: box.left,
      y: box.top,
      toJSON: () => ({}),
    } as unknown as DOMRect
  } as unknown as () => DOMRect)
}

function appendTarget(id: string, box?: Box): HTMLElement {
  const el = document.createElement('div')
  el.id = id
  document.body.appendChild(el)
  if (box) boxes.set(id, box)
  return el
}

/**
 * Manual rAF queue — deterministic frame control (vitest's default fake
 * timers don't fake requestAnimationFrame). Returns an async flusher that
 * runs queued frame callbacks and their microtask continuations n times.
 */
function stubFrames(): (n?: number) => Promise<void> {
  const queue: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    queue.push(cb)
    return queue.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  return async (n = 1) => {
    for (let i = 0; i < n; i++) {
      const cbs = queue.splice(0, queue.length)
      cbs.forEach((cb) => cb(0))
      await Promise.resolve()
      await Promise.resolve()
    }
  }
}

describe('waitForTourTarget — visible-target polling (QA4-img30)', () => {
  beforeEach(() => {
    // Explicit toFake: Date MUST be faked — the polling loop checks
    // Date.now() against its deadline.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    installBoxStub()
  })

  afterEach(() => {
    rectSpy.mockRestore()
    document.body.innerHTML = ''
    vi.useRealTimers()
  })

  it('resolves immediately with a visible element', async () => {
    const el = appendTarget('vis', { top: 10, left: 10, width: 40, height: 20 })
    await expect(waitForTourTarget('#vis')).resolves.toBe(el)
  })

  it('keeps polling until a target that only appears after ~300ms becomes visible', async () => {
    const promise = waitForTourTarget('#late')
    await vi.advanceTimersByTimeAsync(300) // ~6 polls — element still absent
    const el = appendTarget('late', { top: 0, left: 0, width: 120, height: 40 })
    await vi.advanceTimersByTimeAsync(TOUR_TARGET_POLL_MS)
    await expect(promise).resolves.toBe(el)
  })

  it('resolves null when the deadline passes with no matching element', async () => {
    const promise = waitForTourTarget('#ghost', 500)
    await vi.advanceTimersByTimeAsync(700)
    await expect(promise).resolves.toBeNull()
  })

  it('resolves null when the element exists but stays hidden (zero rect)', async () => {
    appendTarget('hidden') // in the DOM, but zero box (e.g. display:none)
    const promise = waitForTourTarget('#hidden', 500)
    await vi.advanceTimersByTimeAsync(700)
    await expect(promise).resolves.toBeNull()
  })

  it('resolves null for invalid selectors instead of throwing', async () => {
    const promise = waitForTourTarget('<<<', 100)
    await vi.advanceTimersByTimeAsync(150)
    await expect(promise).resolves.toBeNull()
  })

  it('isTourTargetVisible requires a non-zero box', () => {
    const el = appendTarget('boxy', { top: 0, left: 0, width: 10, height: 10 })
    expect(isTourTargetVisible(el)).toBe(true)
    boxes.set('boxy', { top: 0, left: 0, width: 0, height: 40 })
    expect(isTourTargetVisible(el)).toBe(false)
  })

  it('uses the QA4-img30 defaults (2.5s max wait, ~50ms polls)', () => {
    expect(TOUR_TARGET_TIMEOUT_MS).toBe(2500)
    expect(TOUR_TARGET_POLL_MS).toBe(50)
  })
})

describe('ProductTourOverlay — highlight robustness (QA4-img30)', () => {
  const tour = useProductTour()
  let wrapper: VueWrapper | null = null
  let flushFrames: (n?: number) => Promise<void>
  let restoreScrollIntoView: () => void = () => {}
  let def: TourDefinition | null = null

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    installBoxStub()
    localStorage.clear()
    tour.resetAllTours()
    flushFrames = stubFrames()
    // jsdom does not implement scrollIntoView at all — provide a no-op.
    const proto = Element.prototype as unknown as { scrollIntoView?: () => void }
    const original = proto.scrollIntoView
    proto.scrollIntoView = () => {}
    restoreScrollIntoView = () => {
      if (original) proto.scrollIntoView = original
      else delete (Element.prototype as unknown as { scrollIntoView?: () => void }).scrollIntoView
    }
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    document.body.innerHTML = ''
    tour.stopTour()
    if (def) tour.unregisterTour(def.id)
    def = null
    restoreScrollIntoView()
    vi.unstubAllGlobals()
    rectSpy.mockRestore()
    vi.useRealTimers()
  })

  function startOverlayTour(steps: TourStep[]) {
    def = { id: 'overlay-robustness', routeNames: ['test-robust'], steps }
    tour.registerTour(def)
    wrapper = mount(ProductTourOverlay, { attachTo: document.body })
    tour.startTour(def.id)
  }

  const ring = () => document.querySelector('[data-testid="tour-highlight-ring"]') as HTMLElement | null
  const tooltip = () => document.querySelector('[data-testid="tour-tooltip"]') as HTMLElement | null

  it('eventually highlights a target that only renders after ~300ms', async () => {
    startOverlayTour([{ target: '#tour-late', titleKey: 'tour.next', descriptionKey: 'tour.next' }])

    await vi.advanceTimersByTimeAsync(300) // debounce + polls — target still absent
    appendTarget('tour-late', { top: 100, left: 50, width: 200, height: 60 })
    await vi.advanceTimersByTimeAsync(TOUR_TARGET_POLL_MS) // next poll picks it up
    await flushFrames(3) // scroll-settle frame(s) + continuations

    const r = ring()
    expect(r).toBeTruthy()
    expect(r!.style.width).toBe('220px') // 200 + 2 × 10 padding
    expect(r!.style.top).toBe('90px') // 100 − 10 padding
  })

  it('clears the ring and pins the tooltip top-center when the target stays hidden (zero rect)', async () => {
    appendTarget('tour-ghost') // in the DOM but zero box (e.g. display:none)

    startOverlayTour([{ target: '#tour-ghost', titleKey: 'tour.next', descriptionKey: 'tour.next' }])
    await vi.advanceTimersByTimeAsync(TOUR_TARGET_TIMEOUT_MS + 300) // past the default deadline

    const r = ring()
    expect(r).toBeTruthy() // overlay is active, but no stale highlight
    expect(r!.style.width).toBe('0px')
    expect(r!.style.height).toBe('0px')
    expect(r!.style.top).toBe('-20px')
    expect(tooltip()?.style.top).toBe('24px')
  })

  it('re-measures on window resize so the ring follows the target', async () => {
    appendTarget('tour-move', { top: 100, left: 50, width: 200, height: 60 })

    startOverlayTour([{ target: '#tour-move', titleKey: 'tour.next', descriptionKey: 'tour.next' }])
    await vi.advanceTimersByTimeAsync(50)
    await flushFrames(2)
    expect(ring()!.style.top).toBe('90px')

    boxes.set('tour-move', { top: 300, left: 50, width: 200, height: 60 })
    window.dispatchEvent(new Event('resize'))
    await flushFrames(2)

    expect(ring()!.style.top).toBe('290px')
  })
})
