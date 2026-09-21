import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import SegmentationView from './SegmentationView.vue'
import type { Campaign } from '../types'

// Keep the real queries (StepReviewActions' mutations) and only stub useCampaign.
vi.mock('@/features/campaigns/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>()
  return { ...actual, useCampaign: vi.fn() }
})

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runSegmentation: vi.fn(),
    update: vi.fn(),
    reviewStep: vi.fn(),
    approveStep: vi.fn(),
  },
}))

// lottie-web crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign } from '../queries'
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

function mockCampaign(campaign: Campaign) {
  vi.mocked(useCampaign).mockReturnValue({
    data: ref(campaign),
    isLoading: ref(false),
  } as never)
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/segmentation', component: SegmentationView },
      { path: '/campaigns/:campaignUuid/ppc-viability', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/segmentation')
  await router.isReady()

  const wrapper = mount(SegmentationView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, StepExportButton: true, ErrorState: true, SegmentDeepResearchRenderer: true },
    },
  })
  await flushPromises()
  return wrapper
}

async function selectCountry(wrapper: VueWrapper, query: string) {
  await wrapper.find('[data-testid="country-input"]').setValue(query)
  const suggestions = wrapper.findAll('[data-testid="country-suggestion"]')
  expect(suggestions.length).toBeGreaterThan(0)
  await suggestions[0].trigger('click')
}

describe('SegmentationView — structured target market (F19)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runSegmentation).mockResolvedValue({
      data: { step: { response_payload: {} } },
    } as never)
    vi.mocked(campaignsApi.update).mockResolvedValue({ data: {} } as never)
  })

  it('renders CountryCitySelect instead of a free-text location input', async () => {
    mockCampaign(buildCampaign())
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="country-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="city-input"]').exists()).toBe(true)
    expect(wrapper.find('[data-loc="campaigns.segmentation.location-input"]').exists()).toBe(false)
  })

  it('sends structured country/city plus the composed legacy location', async () => {
    mockCampaign(buildCampaign())
    const wrapper = await mountView()

    await selectCountry(wrapper, 'Oman')
    await wrapper.find('[data-testid="city-input"]').setValue('Muscat')

    await wrapper.find('[data-loc="campaigns.segmentation.run-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.runSegmentation).toHaveBeenCalledTimes(1)
    const [uuid, payload] = vi.mocked(campaignsApi.runSegmentation).mock.calls[0]
    expect(uuid).toBe('c1')
    expect(payload?.country).toBe('Oman')
    expect(payload?.city).toBe('Muscat')
    expect(payload?.location).toBe('Muscat, Oman')
  })

  it('prefills from context_payload.target_market (restore after reload)', async () => {
    mockCampaign(
      buildCampaign({
        context_payload: { target_market: { country: 'Iran', city: 'Tehran' } },
      }),
    )
    const wrapper = await mountView()

    expect((wrapper.find('[data-testid="country-input"]').element as HTMLInputElement).value).toBe('Iran')
    expect((wrapper.find('[data-testid="city-input"]').element as HTMLInputElement).value).toBe('Tehran')
  })

  it('seeds the country from the brand free-text location when no target market exists', async () => {
    mockCampaign(
      buildCampaign({
        brand: {
          brand_uuid: 'b1',
          company_name: 'Lumen',
          website_url: 'https://lumen.test',
          location: 'Dubai, United Arab Emirates',
          selected_industry: null,
        },
      }),
    )
    const wrapper = await mountView()

    expect((wrapper.find('[data-testid="country-input"]').element as HTMLInputElement).value).toBe(
      'United Arab Emirates',
    )
    expect((wrapper.find('[data-testid="city-input"]').element as HTMLInputElement).value).toBe('')
  })
})

// ── Step reject / refine (review actions on the step output) ──

describe('SegmentationView — step review actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runSegmentation).mockResolvedValue({
      data: { step: { response_payload: {} } },
    } as never)
    vi.mocked(campaignsApi.update).mockResolvedValue({ data: {} } as never)
  })

  function mockCompletedCampaign(reviewStatus = '', rejectReason: string | null = null) {
    mockCampaign(
      buildCampaign({
        segmentation_completed: true,
        context_payload: {
          target_market: { country: 'Oman', city: 'Muscat' },
        },
        // latest_steps restore — the step view reads results from here.
        latest_steps: {
          segmentation: {
            status: 'completed',
            review_status: reviewStatus,
            reject_reason: rejectReason,
            response_payload: {
              segments: [{ name: 'Budget Shoppers' }],
            },
          },
        },
      } as Partial<Campaign>),
    )
  }

  it('restores review state from latest_steps and rejects with a required reason', async () => {
    mockCompletedCampaign('rejected', 'Too broad')
    const wrapper = await mountView()

    // Results render from latest_steps; the rejected badge is restored.
    expect(wrapper.find('[data-testid="step-status-rejected"]').exists()).toBe(true)
    await wrapper.find('[data-testid="step-status-rejected"]').trigger('click')
    expect(wrapper.find('[data-testid="step-reject-reason"]').text()).toBe('Too broad')

    // Reject flow: the reason is mandatory.
    await wrapper.find('[data-testid="step-reject"]').trigger('click')
    expect(wrapper.find('[data-testid="reject-modal"]').exists()).toBe(true)

    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    expect(wrapper.find('[data-testid="reject-reason-error"]').exists()).toBe(true)
    expect(campaignsApi.reviewStep).not.toHaveBeenCalled()

    await wrapper.find('[data-testid="reject-category-audience"]').trigger('click')
    await wrapper.find('[data-testid="reject-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.reviewStep).toHaveBeenCalledWith('c1', 'segmentation', {
      decision: 'rejected',
      reject_reason: 'Wrong audience',
    })
  })

  it('refine re-POSTs segmentation with refinement_feedback plus the form values', async () => {
    mockCompletedCampaign()
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="step-refine"]').exists()).toBe(true)
    await wrapper.find('[data-testid="step-refine"]').trigger('click')
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(true)

    await wrapper.find('[data-testid="refine-feedback-input"]').setValue('Focus on Gen Z commuters')
    await wrapper.find('[data-testid="refine-confirm-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.runSegmentation).toHaveBeenCalledTimes(1)
    const [uuid, payload] = vi.mocked(campaignsApi.runSegmentation).mock.calls[0]
    expect(uuid).toBe('c1')
    expect(payload?.refinement_feedback).toBe('Focus on Gen Z commuters')
    // Existing form values are re-sent alongside the feedback.
    expect(payload?.country).toBe('Oman')
    expect(payload?.city).toBe('Muscat')
    expect(wrapper.find('[data-testid="refine-modal"]').exists()).toBe(false)
  })

  it('an approved step shows the approved badge', async () => {
    mockCompletedCampaign('approved')
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="step-status-approved"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="step-status-rejected"]').exists()).toBe(false)
  })
})
