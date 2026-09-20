import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import WizardView from './WizardView.vue'
import { wizardStepApproveTypes } from '@/features/campaigns/machines/campaignWizard'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/queries', () => ({
  useCampaign: vi.fn(),
  useCampaignAds: vi.fn(),
}))

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    approveStep: vi.fn(),
    runSegmentation: vi.fn(),
    runPPCViability: vi.fn(),
    runFunnel: vi.fn(),
    runContentStrategy: vi.fn(),
    runAdsStrategy: vi.fn(),
    generateAd: vi.fn(),
    clearAllAds: vi.fn(),
    generateVisuals: vi.fn(),
  },
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

// Stub the lazily-loaded step components — their dynamic imports otherwise
// resolve after the test environment is torn down (unhandled rejections).
vi.mock('./Step2AudienceStrategy.vue', () => ({
  // __esModule makes Vue's defineAsyncComponent interop pick `default`
  // instead of treating the whole mock namespace as the component.
  __esModule: true,
  default: { name: 'Step2AudienceStrategy', template: '<div data-testid="wizard-step-2" />' },
}))
vi.mock('./Step3PPCViability.vue', () => ({
  // __esModule makes Vue's defineAsyncComponent interop pick `default`
  // instead of treating the whole mock namespace as the component.
  __esModule: true,
  default: { name: 'Step3PPCViability', template: '<div data-testid="wizard-step-3" />' },
}))
vi.mock('./Step4FunnelDashboard.vue', () => ({
  // __esModule makes Vue's defineAsyncComponent interop pick `default`
  // instead of treating the whole mock namespace as the component.
  __esModule: true,
  default: { name: 'Step4FunnelDashboard', template: '<div data-testid="wizard-step-4" />' },
}))

import { useCampaign } from '@/features/campaigns/queries'
import { campaignsApi } from '@/features/campaigns/api'

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
    current_step: 'segmentation',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: false,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: { selected_platforms: [] },
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(WizardView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, AiLoadingAnimation: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('WizardView — step-level approve on "Approve & Continue" (M-U3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/wizard/:stepNumber', component: WizardView },
      ],
    })
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(campaignsApi.approveStep).mockResolvedValue({
      data: { success: true, campaign: {} as never, step: {} as never },
    } as never)
  })

  it('approves the current step type and still navigates', async () => {
    router.push('/campaigns/c1/wizard/2')
    await router.isReady()
    const wrapper = await mountView()

    await wrapper.find('[data-loc="wizard.continue-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.approveStep).toHaveBeenCalledWith('c1', 'segmentation')
    expect(router.currentRoute.value.path).toBe('/campaigns/c1/wizard/3')
  })

  it('navigates even when the approve call fails (fire-and-forget)', async () => {
    vi.mocked(campaignsApi.approveStep).mockRejectedValueOnce(new Error('boom') as never)
    router.push('/campaigns/c1/wizard/3')
    await router.isReady()
    const wrapper = await mountView()

    await wrapper.find('[data-loc="wizard.continue-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.approveStep).toHaveBeenCalledWith('c1', 'ppc_viability')
    expect(router.currentRoute.value.path).toBe('/campaigns/c1/wizard/4')
  })
})

describe('wizardStepApproveTypes', () => {
  it('maps wizard steps 2-5 to their backend step types when completed', () => {
    const campaign = buildCampaign()
    expect(wizardStepApproveTypes(campaign, 2)).toEqual(['segmentation'])
    expect(wizardStepApproveTypes(campaign, 3)).toEqual(['ppc_viability'])
    // funnel/content_strategy are not completed in the fixture.
    expect(wizardStepApproveTypes(campaign, 4)).toEqual([])
    expect(wizardStepApproveTypes(campaign, 5)).toEqual([])
  })

  it('maps wizard step 7 to every completed selected platform strategy step', () => {
    const campaign = buildCampaign({
      meta_ads_completed: true,
      google_ads_completed: true,
      context_payload: { selected_platforms: ['meta', 'google'] },
    })
    expect(wizardStepApproveTypes(campaign, 7)).toEqual(['meta_ads', 'google_ads'])
  })

  it('returns no step types for steps without a backend run', () => {
    const campaign = buildCampaign()
    for (const step of [1, 6, 8, 9, 10]) {
      expect(wizardStepApproveTypes(campaign, step)).toEqual([])
    }
    expect(wizardStepApproveTypes(null, 2)).toEqual([])
  })
})
