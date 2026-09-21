import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import Step6PlatformSelection from './Step6PlatformSelection.vue'
import { useToast } from '@/shared/composables/useToast'
import type { Campaign, PlatformRecommendationsResult } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/queries', () => ({
  useRecommendPlatforms: vi.fn(),
}))

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    update: vi.fn(),
  },
}))

import { useRecommendPlatforms } from '@/features/campaigns/queries'
import { campaignsApi } from '@/features/campaigns/api'

const recResult: PlatformRecommendationsResult = {
  success: true,
  campaign_uuid: 'c1',
  recommendations: [
    {
      platform: 'meta',
      suitability_score: 90,
      recommended: true,
      rationale: 'Strong visual product fit',
      key_strengths: ['Cheap reach'],
      risks: [],
      requirements: [],
    },
    {
      platform: 'google',
      suitability_score: 45,
      recommended: false,
      rationale: 'Moderate fit',
      key_strengths: [],
      risks: [],
      requirements: [],
    },
    {
      platform: 'linkedin',
      suitability_score: 15,
      recommended: false,
      rationale: 'B2C mismatch',
      key_strengths: [],
      risks: [],
      requirements: [],
    },
  ],
  budget_fit: null,
  channel_strategy: { summary: 'Meta-first plan', platform_roles: [], cross_platform_relationships: [] },
  warnings: [{ type: 'budget', message: 'Keep LinkedIn off the plan', platform: 'linkedin' }],
}

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    brand: null,
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

function mockRecommendMutation() {
  vi.mocked(useRecommendPlatforms).mockReturnValue({
    isPending: ref(false),
    mutateAsync,
  } as never)
}

let router: Router

async function mountStep(campaign: Campaign): Promise<VueWrapper> {
  const wrapper = mount(Step6PlatformSelection, {
    props: { campaign, campaignUuid: 'c1' },
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('Step6PlatformSelection — AI platform recommendation (F15/C5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useToast().clear()
    mutateAsync.mockReset()
    vi.mocked(campaignsApi.update).mockResolvedValue({ data: {} } as never)
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    mockRecommendMutation()
  })

  it('fetches a recommendation on click and merges it into the cards', async () => {
    mutateAsync.mockResolvedValueOnce(recResult)
    const wrapper = await mountStep(buildCampaign())

    await wrapper.find('[data-testid="rec-button"]').trigger('click')
    await flushPromises()

    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="rec-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rec-strategy-summary"]').text()).toContain('Meta-first plan')
    expect(wrapper.find('[data-testid="rec-warnings"]').text()).toContain('Keep LinkedIn off the plan')
    expect(wrapper.find('[data-testid="rec-score-meta"]').text()).toContain('90/100')
    expect(wrapper.find('[data-testid="rec-recommended-meta"]').exists()).toBe(true)
    // Nothing auto-selected
    expect(wrapper.find('[data-testid="platform-card-meta"]').classes()).not.toContain('border-primary/60')
  })

  it('renders persisted recommendations without calling the endpoint', async () => {
    const wrapper = await mountStep(
      buildCampaign({ context_payload: { platform_recommendations: recResult } }),
    )

    expect(wrapper.find('[data-testid="rec-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="rec-score-meta"]').exists()).toBe(true)
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('falls back to the static cards with an error toast on failure', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('boom'))
    const wrapper = await mountStep(buildCampaign())

    await wrapper.find('[data-testid="rec-button"]').trigger('click')
    await flushPromises()

    expect(useToast().toasts.value.some((t) => t.type === 'error')).toBe(true)
    expect(wrapper.find('[data-testid="platform-card-meta"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="platform-rec-details"]').exists()).toBe(false)
  })
})
