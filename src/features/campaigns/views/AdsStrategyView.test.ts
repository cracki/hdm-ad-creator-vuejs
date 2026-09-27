import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import AdsStrategyView from './AdsStrategyView.vue'
import type { Campaign } from '../types'

// Real vue-query + mocked api: after a platform strategy POST resolves, the
// view must invalidate the campaign + ads-strategy queries so the status
// badge flips from Pending to Completed without a manual refresh. The
// per-platform completion flags are the server-side contract.
vi.mock('../api', () => ({
  campaignsApi: {
    get: vi.fn(),
    getAdsStrategy: vi.fn(),
    runAdsStrategy: vi.fn(),
  },
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { campaignsApi } from '../api'

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
    current_step: 'meta_ads',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: { selected_platforms: ['meta'] },
    summary: {},
    steps_count: 4,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

let router: Router
let campaign: Campaign

async function mountView(): Promise<VueWrapper> {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/ads-strategy', component: AdsStrategyView },
      { path: '/campaigns/:campaignUuid/platform', component: { template: '<div />' } },
      { path: '/campaigns/:campaignUuid/generate-ads', component: { template: '<div />' } },
      { path: '/campaigns/:campaignUuid', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/ads-strategy')
  await router.isReady()

  const wrapper = mount(AdsStrategyView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, StepExportButton: true, ErrorState: true, AdsStrategyRenderer: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('AdsStrategyView — live status after a run', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    campaign = buildCampaign()

    vi.mocked(campaignsApi.get).mockImplementation(async () => ({ data: campaign }) as never)
    vi.mocked(campaignsApi.getAdsStrategy).mockResolvedValue({
      data: { success: true, strategies: [] },
    } as never)
    // Running the strategy persists the completion flag server-side.
    vi.mocked(campaignsApi.runAdsStrategy).mockImplementation(async () => {
      campaign = buildCampaign({ meta_ads_completed: true })
      return { data: { success: true, step: { response_payload: {} } } } as never
    })
  })

  it('flips the platform badge to Completed and enables continue without a refresh', async () => {
    const wrapper = await mountView()

    // Before: meta is pending and Approve & Continue is disabled.
    expect(wrapper.find('[data-testid="platform-status-meta"]').text()).toBe('Pending')
    expect(wrapper.find('[data-loc="campaigns.strategy.continue-btn"]').attributes('disabled')).toBeDefined()
    const getCallsBeforeRun = vi.mocked(campaignsApi.get).mock.calls.length

    await wrapper.find('[data-loc="campaigns.strategy.run-btn"]').trigger('click')
    await flushPromises()
    await flushPromises()
    await flushPromises()

    expect(campaignsApi.runAdsStrategy).toHaveBeenCalledWith('c1', { platform: 'meta' })
    // The campaign query was invalidated → the flag lands without a reload.
    expect(vi.mocked(campaignsApi.get).mock.calls.length).toBeGreaterThan(getCallsBeforeRun)
    expect(wrapper.find('[data-testid="platform-status-meta"]').text()).toBe('Completed')
    expect(wrapper.find('[data-loc="campaigns.strategy.run-btn"]').exists()).toBe(false)
    expect(wrapper.find('[data-loc="campaigns.strategy.continue-btn"]').attributes('disabled')).toBeUndefined()
  })
})
