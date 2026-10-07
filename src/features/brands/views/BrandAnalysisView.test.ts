import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import BrandAnalysisView from './BrandAnalysisView.vue'

/**
 * QA round 3: after "Analysis Complete" the Overview tab stayed empty until a
 * manual refresh. Terminal tracker success must invalidate the run queries so
 * the displayed run refetches the final payload.
 */

vi.mock('@/features/brands/queries', () => ({
  useBrand: vi.fn(),
  useAnalysisRun: vi.fn(),
  useStartAnalysis: vi.fn(),
}))

// Controllable tracker: tests flip `status` like the real composable would.
vi.mock('@/shared/composables/useJobTracker', () => ({
  useJobTracker: vi.fn(),
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useBrand, useAnalysisRun, useStartAnalysis } from '../queries'
import { useJobTracker } from '@/shared/composables/useJobTracker'

function mockTracker() {
  const tracker = {
    data: ref(null),
    status: ref<'idle' | 'starting' | 'polling' | 'completed' | 'failed'>('polling'),
    error: ref(null),
    attempts: ref(0),
    start: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
  }
  vi.mocked(useJobTracker).mockReturnValue(tracker as never)
  return tracker
}

function mockQueries(startMutateAsync?: (...args: unknown[]) => Promise<unknown>) {
  vi.mocked(useBrand).mockReturnValue({
    data: ref({ brand_uuid: 'b1', company_name: 'Lumen', website_url: 'https://lumen.test' }),
    isLoading: ref(false),
  } as never)
  // Persisted run still in progress (the pre-completion fetch).
  vi.mocked(useAnalysisRun).mockReturnValue({
    data: ref({ status: 'running' }),
    isLoading: ref(false),
  } as never)
  vi.mocked(useStartAnalysis).mockReturnValue({
    mutateAsync: (startMutateAsync ?? vi.fn()) as never,
  } as never)
}

async function mountView(
  invalidateSpy: () => void,
  startMutateAsync?: (...args: unknown[]) => Promise<unknown>,
): Promise<{ wrapper: VueWrapper; tracker: ReturnType<typeof mockTracker>; router: ReturnType<typeof createRouter> }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/brands/:brandUuid/analysis', component: BrandAnalysisView },
      { path: '/brands/:brandUuid/analysis/:runUuid', component: BrandAnalysisView },
      { path: '/brands/:brandUuid', component: { template: '<div />' } },
    ],
  })
  router.push('/brands/b1/analysis')
  await router.isReady()

  const queryClient = new QueryClient()
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(invalidateSpy as never)

  const tracker = mockTracker()
  mockQueries(startMutateAsync)

  const wrapper = mount(BrandAnalysisView, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: {
        Topbar: true,
        ProgressIndicator: true,
        PersonalityCards: true,
        BrandRadarChart: true,
        BrandWheel: true,
        TakeawayCards: true,
        AnalysisPayloadRenderer: true,
        CompetitiveAnalysisRenderer: true,
        SocialPresenceRenderer: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, tracker, router }
}

describe('BrandAnalysisView — refetch on terminal success (QA3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalidates the run queries when the tracker reaches completed', async () => {
    const invalidated: unknown[][] = []
    const { wrapper } = await mountView((...args: unknown[]) => {
      invalidated.push(args)
    })

    expect(invalidated.length).toBe(0)
    const tracker = trackerRef(wrapper)
    tracker.status.value = 'completed'
    await flushPromises()

    expect(invalidated.length).toBe(1)
    wrapper.unmount()
  })

  it('does not invalidate while still polling', async () => {
    const invalidated: unknown[][] = []
    const { wrapper, tracker } = await mountView((...args: unknown[]) => {
      invalidated.push(args)
    })

    tracker.status.value = 'polling'
    await flushPromises()
    expect(invalidated.length).toBe(0)
    wrapper.unmount()
  })
})

describe('BrandAnalysisView — retry navigates to the new run (QA4-taza1)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts a new run, replaces the route with its uuid, and resumes tracking from a cleared state', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      data: { analysis_run_uuid: 'run-2', status: 'pending' },
    })
    const { wrapper, tracker, router } = await mountView(() => {}, mutateAsync)

    // Failed state renders the retry button
    tracker.status.value = 'failed'
    await flushPromises()
    expect(wrapper.find('[data-loc="brands.analysis.retry-btn"]').exists()).toBe(true)

    await wrapper.find('[data-loc="brands.analysis.retry-btn"]').trigger('click')
    await flushPromises()

    // The old run uuid (none in this route) travels with the start mutation so
    // its single-run cache can be invalidated
    expect(mutateAsync).toHaveBeenCalledWith({ previousRunUuid: undefined })
    // Tracker state is cleared, the route moves to the NEW run, and tracking
    // resumes against it instead of the old uuid
    expect(tracker.reset).toHaveBeenCalled()
    expect(tracker.resume).toHaveBeenCalledWith('run-2')
    expect(router.currentRoute.value.path).toBe('/brands/b1/analysis/run-2')
    wrapper.unmount()
  })

  it('keeps the failed state (no navigation) when starting the new run fails', async () => {
    const mutateAsync = vi.fn().mockRejectedValue(new Error('boom'))
    const { wrapper, tracker, router } = await mountView(() => {}, mutateAsync)

    tracker.status.value = 'failed'
    await flushPromises()
    await wrapper.find('[data-loc="brands.analysis.retry-btn"]').trigger('click')
    await flushPromises()

    expect(tracker.reset).toHaveBeenCalled()
    expect(tracker.resume).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/brands/b1/analysis')
    wrapper.unmount()
  })
})

/** The view's tracker is created inside setup; grab the shared mock instance. */
function trackerRef(_wrapper: VueWrapper) {
  return vi.mocked(useJobTracker).mock.results.at(-1)!.value as ReturnType<typeof mockTracker>
}
