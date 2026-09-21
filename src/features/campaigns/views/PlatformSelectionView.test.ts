import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import PlatformSelectionView from './PlatformSelectionView.vue'
import { useToast } from '@/shared/composables/useToast'
import type { Campaign, PlatformRecommendationsResult } from '../types'

vi.mock('@/features/campaigns/queries', () => ({
  useCampaign: vi.fn(),
  useRecommendPlatforms: vi.fn(),
}))

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    update: vi.fn(),
  },
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign, useRecommendPlatforms } from '../queries'
import { campaignsApi } from '../api'

const recResult: PlatformRecommendationsResult = {
  success: true,
  campaign_uuid: 'c1',
  recommendations: [
    {
      platform: 'meta',
      suitability_score: 85,
      recommended: true,
      rationale: 'Best fit for a DTC skincare brand',
      key_strengths: ['Visual storytelling'],
      risks: ['Rising CPMs'],
      requirements: ['Pixel must be installed'],
    },
    {
      platform: 'google',
      suitability_score: 55,
      recommended: false,
      rationale: 'Moderate search demand',
      key_strengths: [],
      risks: [],
      requirements: [],
    },
    {
      platform: 'linkedin',
      suitability_score: 20,
      recommended: false,
      rationale: 'High CPC for a B2C offer',
      key_strengths: [],
      risks: [],
      requirements: [],
    },
  ],
  budget_fit: { assessment: 'Fits', notes: 'Spread thin on 3 channels', suggested_channel_count: 2 },
  channel_strategy: {
    summary: 'Lead with Meta, support with Google',
    platform_roles: [{ platform: 'meta', role: 'Primary conversion driver', funnel_stage: 'TOFU' }],
    cross_platform_relationships: ['Meta retargets Google visitors'],
  },
  warnings: [{ type: 'budget', message: 'Budget is tight for 3 channels', platform: 'linkedin' }],
}

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
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

const mutateAsync = vi.fn()

function mockCampaign(campaign: Campaign) {
  vi.mocked(useCampaign).mockReturnValue({
    data: ref(campaign),
    isLoading: ref(false),
  } as never)
}

function mockRecommendMutation() {
  vi.mocked(useRecommendPlatforms).mockReturnValue({
    isPending: ref(false),
    mutateAsync,
  } as never)
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/platforms', component: PlatformSelectionView },
      { path: '/campaigns/:campaignUuid', component: { template: '<div />' } },
      { path: '/campaigns/:campaignUuid/content', component: { template: '<div />' } },
      { path: '/campaigns/:campaignUuid/ads-strategy', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/platforms')
  await router.isReady()

  const wrapper = mount(PlatformSelectionView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, AiLoadingAnimation: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('PlatformSelectionView — AI platform recommendation (F15/C5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useToast().clear()
    mutateAsync.mockReset()
    vi.mocked(campaignsApi.update).mockResolvedValue({ data: {} } as never)
    mockCampaign(buildCampaign())
    mockRecommendMutation()
  })

  it('shows a "Get AI recommendation" button and no rec UI while there is no result', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="rec-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="platform-rec-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="platform-rec-details"]').exists()).toBe(false)
  })

  it('calls the endpoint on click and renders score, rationale, warnings and strategy', async () => {
    mutateAsync.mockResolvedValueOnce(recResult)
    const wrapper = await mountView()

    await wrapper.find('[data-testid="rec-button"]').trigger('click')
    await flushPromises()

    expect(useRecommendPlatforms).toHaveBeenCalled()
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    // Button disappears, result UI replaces it
    expect(wrapper.find('[data-testid="rec-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="platform-rec-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rec-strategy-summary"]').text()).toContain('Lead with Meta')
    expect(wrapper.find('[data-testid="rec-role-meta"]').text()).toContain('Primary conversion driver')
    expect(wrapper.find('[data-testid="rec-warnings"]').text()).toContain('Budget is tight for 3 channels')
    expect(wrapper.find('[data-testid="rec-budget-channel-count"]').text()).toContain('2')

    // Merged into the cards: score + recommended badge + rationale
    expect(wrapper.find('[data-testid="rec-score-meta"]').text()).toContain('85/100')
    expect(wrapper.find('[data-testid="rec-recommended-meta"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rec-rationale-meta"]').text()).toContain('Best fit for a DTC skincare brand')
    expect(wrapper.find('[data-testid="rec-recommended-google"]').exists()).toBe(false)
    // Selection behavior unchanged: nothing auto-selected
    expect(wrapper.find('[data-testid="platform-card-meta"]').classes()).not.toContain('border-primary/60')
  })

  it('renders persisted recommendations without calling the endpoint', async () => {
    mockCampaign(
      buildCampaign({ context_payload: { platform_recommendations: recResult } }),
    )
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="rec-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="platform-rec-summary"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="rec-score-meta"]').text()).toContain('85/100')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('falls back to the static cards with an error toast when the endpoint fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('LLM timeout'))
    const wrapper = await mountView()

    await wrapper.find('[data-testid="rec-button"]').trigger('click')
    await flushPromises()

    const toast = useToast()
    expect(toast.toasts.value.some((t) => t.type === 'error')).toBe(true)
    // Static cards remain and no recommendation UI appeared
    expect(wrapper.find('[data-testid="platform-card-meta"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="platform-rec-summary"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="platform-rec-details"]').exists()).toBe(false)
  })

  it('expands the rationale on mobile via the toggle', async () => {
    mutateAsync.mockResolvedValueOnce(recResult)
    const wrapper = await mountView()
    await wrapper.find('[data-testid="rec-button"]').trigger('click')
    await flushPromises()

    const expandBtn = wrapper.find('[data-testid="rec-expand-meta"]')
    expect(expandBtn.exists()).toBe(true)
    await expandBtn.trigger('click')
    expect(wrapper.find('[data-testid="rec-expand-meta"]').text()).toContain('Show less')
  })
})
