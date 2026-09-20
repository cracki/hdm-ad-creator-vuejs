import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import AdGenerationView from './AdGenerationView.vue'
import type { Campaign, CampaignAd } from '../types'

vi.mock('../queries', () => ({
  useCampaign: vi.fn(),
  useCampaignAds: vi.fn(),
  useReviewAd: vi.fn(),
  usePatchAd: vi.fn(),
  useRefineAd: vi.fn(),
}))

vi.mock('../api', () => ({
  campaignsApi: {
    generateAd: vi.fn(),
    clearAllAds: vi.fn(),
  },
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign, useCampaignAds, useReviewAd, usePatchAd, useRefineAd } from '../queries'

function fakeMutation() {
  return { isPending: ref(false), mutate: vi.fn() } as never
}

function buildCampaign(): Campaign {
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
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: true,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {
      selected_platforms: ['meta'],
      segmentation_data: { segments: [{ persona_name: 'Anna' }] },
    },
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
  } as Campaign
}

function buildAd(overrides: Partial<CampaignAd> = {}): CampaignAd {
  return {
    campaign_ad_uuid: 'ad-1',
    campaign: 'c1',
    platform: 'meta',
    funnel_stage: 'TOFU',
    persona: 'Anna',
    funnel_context: {},
    data: { headline: 'Glow up', body: 'Shine bright', cta: 'Shop Now' },
    review_status: null,
    reject_reason: null,
    reviewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CampaignAd
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(AdGenerationView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, AiLoadingAnimation: true, StepExportButton: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('AdGenerationView — ads + review state from GET /ads/ (F13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: AdGenerationView },
        { path: '/campaigns/:campaignUuid/generate-ads', component: AdGenerationView },
      ],
    })
    router.push('/campaigns/c1/generate-ads')
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    // AdReviewCard's action mutations (not exercised in these tests).
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())
  })

  it('renders ads restored from the API (no sessionStorage handoff)', async () => {
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({
        success: true,
        ads: [buildAd({ campaign_ad_uuid: 'ad-1' })],
      }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.text()).toContain('Glow up')
    // sessionStorage handoff is gone — the list is server truth now.
    expect(sessionStorage.getItem('campaign-ads:c1')).toBeNull()
  })

  it('restores review badges from the GET ads payload', async () => {
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({
        success: true,
        ads: [
          buildAd({ campaign_ad_uuid: 'ad-1', review_status: 'approved' }),
          buildAd({
            campaign_ad_uuid: 'ad-2',
            review_status: 'rejected',
            reject_reason: 'Wrong market',
          }),
        ],
      }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="ad-status-approved"]').exists()).toBe(true)
    await wrapper.find('[data-testid="ad-status-rejected"]').trigger('click')
    expect(wrapper.find('[data-testid="ad-reject-reason"]').text()).toBe('Wrong market')
  })

  it('wraps every ad card in the review action bar', async () => {
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [buildAd()] }),
    } as never)

    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="output-approve"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="output-reject"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="output-edit"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="output-refine"]').exists()).toBe(true)
  })
})
