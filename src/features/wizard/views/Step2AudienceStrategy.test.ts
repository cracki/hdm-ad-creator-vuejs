import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Step2AudienceStrategy from './Step2AudienceStrategy.vue'
import { campaignsApi } from '@/features/campaigns/api'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runSegmentation: vi.fn(),
    update: vi.fn(),
    approveStep: vi.fn(),
    reviewStep: vi.fn(),
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
  // StepReviewActions (review/refine footer) uses vue-query hooks, so the
  // plugin must be provided just like in the real app.
  const wrapper = mount(Step2AudienceStrategy, {
    props: { campaign, campaignUuid: 'c1' },
    global: { plugins: [VueQueryPlugin] },
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

    // Unmount so the debounced persist timer is cancelled (onBeforeUnmount)
    // and cannot fire mid-way through a later test.
    wrapper.unmount()
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

  it('sends an explicit empty personas list when the user clears a persisted selection', async () => {
    const wrapper = await mountStep(
      buildCampaign({ context_payload: { selected_personas: ['Premium Seeker'] } }),
    )

    // First run with the restored selection → sent as-is.
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(vi.mocked(campaignsApi.runSegmentation).mock.calls[0][1]?.personas).toEqual(['Premium Seeker'])

    // Deselect the only persisted persona → explicit [] so the backend clears
    // the stale selected_personas ("nothing selected = all personas").
    const chips = wrapper.findAll('[data-testid="persona-chip"]')
    await chips[1].trigger('click')

    const rerun = wrapper.findAll('button').find((b) => b.text().includes('Re-run'))
    await rerun!.trigger('click')
    await flushPromises()
    expect(vi.mocked(campaignsApi.runSegmentation).mock.calls[1][1]?.personas).toEqual([])

    // Unmount so the debounced persist timer is cancelled (onBeforeUnmount)
    // and cannot fire mid-way through a later test.
    wrapper.unmount()
  })
})

describe('Step2AudienceStrategy — immediate persona persistence (QA round 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runSegmentation).mockResolvedValue(SEGMENTS_RESPONSE)
    vi.mocked(campaignsApi.update).mockResolvedValue({ data: {} } as never)
  })

  it('PATCHes context_payload with the merged selection as soon as a persona is toggled', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountStep(
        buildCampaign({ context_payload: { target_market: { country: 'Oman', city: 'Muscat' } } }),
      )

      // Produce segmentation results so the picker (and persistence) is live.
      await wrapper.find('button').trigger('click')
      await flushPromises()

      const chips = wrapper.findAll('[data-testid="persona-chip"]')
      const baseline = vi.mocked(campaignsApi.update).mock.calls.length
      await chips[1].trigger('click')

      // Debounced: nothing is sent synchronously.
      expect(vi.mocked(campaignsApi.update).mock.calls.length).toBe(baseline)

      await vi.advanceTimersByTimeAsync(500)
      expect(vi.mocked(campaignsApi.update).mock.calls.length).toBe(baseline + 1)
      const [uuid, payload] = vi.mocked(campaignsApi.update).mock.calls[baseline]
      expect(uuid).toBe('c1')
      // Sibling keys stay intact and the selection is persisted immediately.
      expect(payload?.context_payload).toEqual({
        target_market: { country: 'Oman', city: 'Muscat' },
        selected_personas: ['Premium Seeker'],
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('coalesces rapid toggles into a single debounced PATCH with the final selection', async () => {
    vi.useFakeTimers()
    try {
      const wrapper = await mountStep(buildCampaign())
      await wrapper.find('button').trigger('click')
      await flushPromises()

      const chips = wrapper.findAll('[data-testid="persona-chip"]')
      const baseline = vi.mocked(campaignsApi.update).mock.calls.length
      await chips[0].trigger('click')
      await chips[1].trigger('click')
      await chips[0].trigger('click') // deselect again → final selection: Premium Seeker

      await vi.advanceTimersByTimeAsync(500)
      expect(vi.mocked(campaignsApi.update).mock.calls.length).toBe(baseline + 1)
      expect(vi.mocked(campaignsApi.update).mock.calls[baseline][1]?.context_payload).toEqual({
        selected_personas: ['Premium Seeker'],
      })
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('Step2AudienceStrategy — prefill from brand analysis (MOM 10.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runSegmentation).mockResolvedValue(SEGMENTS_RESPONSE)
  })

  const analyzedCampaign = () =>
    buildCampaign({
      brand: {
        brand_uuid: 'b1',
        company_name: 'Lumen Dental',
        website_url: 'https://lumen.test',
        location: null,
        selected_industry: { industry_uuid: 'i1', name: 'Dental Care' },
      },
      brand_context: { available: true, services: ['Implants', 'Whitening', 'Orthodontics', 'Surgery'] },
    })

  it('prefills business type and product description once the campaign has analysis data', async () => {
    const wrapper = await mountStep(analyzedCampaign())

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Dental Care')
    const productDesc = wrapper.find('textarea').element as HTMLTextAreaElement
    expect(productDesc.value).toBe('Implants, Whitening, Orthodontics')
    expect(wrapper.find('[data-testid="business-type-analysis-hint"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="product-desc-analysis-hint"]').exists()).toBe(true)
  })

  it('keeps user-typed values when the campaign prop refreshes with analysis data', async () => {
    const wrapper = await mountStep(buildCampaign())

    await wrapper.find('input').setValue('My own type')
    await wrapper.find('textarea').setValue('My own description')

    await wrapper.setProps({ campaign: analyzedCampaign() })
    await flushPromises()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('My own type')
    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('My own description')
    expect(wrapper.find('[data-testid="business-type-analysis-hint"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="product-desc-analysis-hint"]').exists()).toBe(false)
  })
})
