import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import Step10Export from './Step10Export.vue'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/queries', () => ({
  useCompleteCampaign: vi.fn(),
}))

import { useCompleteCampaign } from '@/features/campaigns/queries'

const mutateAsync = vi.fn()

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
    meta_ads_completed: true,
    google_ads_completed: true,
    linkedin_ads_completed: true,
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

let router: Router

async function mountStep(campaign: Campaign): Promise<VueWrapper> {
  const wrapper = mount(Step10Export, {
    props: { campaign, campaignUuid: 'c1' },
    global: { plugins: [router] },
  })
  await flushPromises()
  return wrapper
}

describe('Step10Export — completion error missing-steps chips (F17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { template: '<div />' } }],
    })
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
  })

  it('renders the missing slugs as localized chips under the error banner', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: {
        status: 400,
        data: { detail: 'Campaign completion requirements not met.', missing: ['funnel', 'google_ads'] },
      },
    })
    const wrapper = await mountStep(buildCampaign())

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="complete-error"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="complete-missing"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="missing-chip-funnel"]').text()).toBe('Funnel Dashboard')
    expect(wrapper.find('[data-testid="missing-chip-google_ads"]').text()).toBe('Google Ads')
  })

  it('shows no chips when the error payload has no missing array', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Network failure'))
    const wrapper = await mountStep(buildCampaign())

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="complete-error"]').text()).toContain('Network failure')
    expect(wrapper.find('[data-testid="complete-missing"]').exists()).toBe(false)
  })
})
