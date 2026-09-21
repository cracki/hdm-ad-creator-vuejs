import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import Step2AudienceStrategy from './Step2AudienceStrategy.vue'
import { campaignsApi } from '@/features/campaigns/api'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runSegmentation: vi.fn(),
  },
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

vi.mock('@/shared/components/CountryCitySelect.vue', () => ({
  default: { name: 'CountryCitySelect', template: '<div />' },
}))

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
    segmentation_completed: false,
    ppc_viability_completed: false,
    funnel_completed: false,
    content_strategy_completed: false,
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

const SEGMENTS_RESPONSE = {
  data: {
    step: {
      response_payload: {
        segments: [{ name: 'Budget Buyer' }, { name: 'Premium Seeker' }],
      },
    },
  },
} as never

async function mountStep(campaign: Campaign) {
  const wrapper = mount(Step2AudienceStrategy, {
    props: { campaign, campaignUuid: 'c1' },
  })
  await flushPromises()
  return wrapper
}

describe('Step2AudienceStrategy — persona targeting (MOM)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runSegmentation).mockResolvedValue(SEGMENTS_RESPONSE)
  })

  it('renders persona chips from the segmentation results', async () => {
    const wrapper = await mountStep(buildCampaign())

    expect(wrapper.findAll('[data-testid="persona-chip"]').length).toBe(0)

    await wrapper.find('button').trigger('click')
    await flushPromises()

    const chips = wrapper.findAll('[data-testid="persona-chip"]')
    expect(chips.map((c) => c.text())).toEqual(['Budget Buyer', 'Premium Seeker'])
    expect(wrapper.find('[data-testid="persona-all-note"]').exists()).toBe(true)
  })

  it('includes the selected personas in the run payload (empty selection = all)', async () => {
    const wrapper = await mountStep(buildCampaign())

    // first run without a selection → personas omitted
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(vi.mocked(campaignsApi.runSegmentation).mock.calls[0][1]?.personas).toBeUndefined()

    const chips = wrapper.findAll('[data-testid="persona-chip"]')
    await chips[0].trigger('click')

    // re-run picks up the selection
    const rerun = wrapper.findAll('button').find((b) => b.text().includes('Re-run'))
    await rerun!.trigger('click')
    await flushPromises()

    expect(vi.mocked(campaignsApi.runSegmentation).mock.calls[1][1]?.personas).toEqual(['Budget Buyer'])
  })

  it('prefills the selection from context_payload.selected_personas', async () => {
    const wrapper = await mountStep(
      buildCampaign({ context_payload: { selected_personas: ['Premium Seeker'] } }),
    )

    await wrapper.find('button').trigger('click')
    await flushPromises()

    const chips = wrapper.findAll('[data-testid="persona-chip"]')
    expect(chips[0].attributes('data-selected')).toBe('false')
    expect(chips[1].attributes('data-selected')).toBe('true')
  })
})
