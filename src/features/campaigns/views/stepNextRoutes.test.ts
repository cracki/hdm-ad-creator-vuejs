import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import type { Campaign } from '../types'

/**
 * Canonical wizard order (QA round 3, blocker): every standalone step view's
 * "Approve & Continue" must advance to the NEXT step — never skip one.
 *   1 segmentation → 2 ppc-viability → 3 funnel → 4 content → 5 platform
 *   → 6 ads-strategy (→ generate-ads → visuals → review)
 * Content matrix used to jump straight to ads-strategy, surfacing "Platforms
 * required" on the ads step.
 */

vi.mock('@/features/campaigns/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>()
  return { ...actual, useCampaign: vi.fn(), useRecommendPlatforms: vi.fn() }
})

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    update: vi.fn(),
    reviewStep: vi.fn(),
    approveStep: vi.fn(),
    recommendPlatforms: vi.fn(),
  },
}))

vi.mock('@/features/brands/queries', () => ({
  useBrandServices: vi.fn(() => ({ data: ref([]), isLoading: ref(false) })),
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign, useRecommendPlatforms } from '../queries'
import SegmentationView from './SegmentationView.vue'
import PPCViabilityView from './PPCViabilityView.vue'
import FunnelView from './FunnelView.vue'
import ContentStrategyView from './ContentStrategyView.vue'
import PlatformSelectionView from './PlatformSelectionView.vue'

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    brand: {
      brand_uuid: 'b1',
      company_name: 'Lumen',
      website_url: 'https://lumen.test',
      location: null,
      selected_industry: null,
    },
    name: 'Summer Launch',
    status: 'in_progress',
    current_step: 'review',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: true,
    google_ads_completed: true,
    linkedin_ads_completed: true,
    context_payload: { selected_platforms: ['meta'] },
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

function mockCampaign(campaign: Campaign) {
  vi.mocked(useCampaign).mockReturnValue({
    data: ref(campaign),
    isLoading: ref(false),
  } as never)
  vi.mocked(useRecommendPlatforms).mockReturnValue({
    isPending: ref(false),
    mutateAsync: vi.fn(),
  } as never)
}

const DUMMY = { template: '<div />' }

function makeRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid', component: DUMMY },
      { path: '/campaigns/:campaignUuid/segmentation', component: DUMMY },
      { path: '/campaigns/:campaignUuid/ppc-viability', component: DUMMY },
      { path: '/campaigns/:campaignUuid/funnel', component: DUMMY },
      { path: '/campaigns/:campaignUuid/content', component: DUMMY },
      { path: '/campaigns/:campaignUuid/platform', component: DUMMY },
      { path: '/campaigns/:campaignUuid/ads-strategy', component: DUMMY },
      { path: '/campaigns/:campaignUuid/generate-ads', component: DUMMY },
      { path: '/campaigns/:campaignUuid/visuals', component: DUMMY },
      { path: '/campaigns/:campaignUuid/review', component: DUMMY },
    ],
  })
}

async function mountAt(router: Router, path: string, component: unknown): Promise<VueWrapper> {
  router.push(path)
  await router.isReady()
  const wrapper = mount(component as never, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: {
        Topbar: true,
        StepExportButton: true,
        ErrorState: true,
        SegmentDeepResearchRenderer: true,
        StepReviewActions: true,
      },
    },
  })
  await flushPromises()
  return wrapper
}

/** Each standalone view's Continue button advances exactly one wizard step. */
async function expectNextFrom(
  path: string,
  component: unknown,
  expectedPath: string,
): Promise<void> {
  const router = makeRouter()
  mockCampaign(buildCampaign())
  const wrapper = await mountAt(router, path, component)

  const next = wrapper.find('[data-testid="step-next-btn"]')
  expect(next.exists(), `continue button missing on ${path}`).toBe(true)
  await next.trigger('click')
  await flushPromises()

  expect(router.currentRoute.value.path).toBe(expectedPath)
}

describe('standalone step views — canonical next-route order (QA3 blocker)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('segmentation (1) continues to ppc-viability (2)', async () => {
    await expectNextFrom('/campaigns/c1/segmentation', SegmentationView, '/campaigns/c1/ppc-viability')
  })

  it('ppc-viability (2) continues to funnel (3)', async () => {
    await expectNextFrom('/campaigns/c1/ppc-viability', PPCViabilityView, '/campaigns/c1/funnel')
  })

  it('funnel (3) continues to content (4)', async () => {
    await expectNextFrom('/campaigns/c1/funnel', FunnelView, '/campaigns/c1/content')
  })

  it('content matrix (4) continues to platform selection (5), not ads-strategy', async () => {
    await expectNextFrom('/campaigns/c1/content', ContentStrategyView, '/campaigns/c1/platform')
  })

  it('platform selection (5) continues to ads-strategy (6)', async () => {
    await expectNextFrom('/campaigns/c1/platform', PlatformSelectionView, '/campaigns/c1/ads-strategy')
  })
})
