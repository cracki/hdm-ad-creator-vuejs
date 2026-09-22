import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin, QueryClient } from '@tanstack/vue-query'
import VisualGenerationView from './VisualGenerationView.vue'
import type { Campaign, CampaignAd, GeneratedVisual } from '../types'

vi.mock('../queries', () => ({
  useCampaign: vi.fn(),
  useCampaignAds: vi.fn(),
  useCampaignVisuals: vi.fn(),
}))

vi.mock('../api', () => ({
  campaignsApi: {
    generateVisuals: vi.fn(),
    listVisuals: vi.fn(),
  },
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { campaignsApi } from '../api'
import { useCampaign, useCampaignAds, useCampaignVisuals } from '../queries'

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
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: true,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: { selected_platforms: ['meta'] },
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
    data: { headline: 'H', body: 'B', cta: 'Shop Now' },
    review_status: null,
    reject_reason: null,
    reviewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CampaignAd
}

function buildPersistedVisual(overrides: Partial<GeneratedVisual> = {}): GeneratedVisual {
  return {
    campaign_ad_uuid: 'ad-1',
    platform: 'meta',
    persona: 'Anna',
    funnel_stage: 'TOFU',
    aspect_ratio: '1:1',
    size: '1024x1024',
    quality: 'auto',
    visual_summary: 'A serene product shot',
    success: true,
    visual_status: 'completed',
    image_url: 'http://localhost:8000/media/visuals/ad-1.png',
    revised_prompt: null,
    error: null,
    ...overrides,
  } as GeneratedVisual
}

let router: Router
let queryClient: QueryClient

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(VisualGenerationView, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: { Topbar: true, AiLoadingAnimation: true, StepExportButton: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('VisualGenerationView — persisted visuals restore (F2)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: VisualGenerationView },
        { path: '/campaigns/:campaignUuid/generate-ads', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/visuals', component: VisualGenerationView },
      ],
    })
    await router.push('/campaigns/c1/visuals')
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    })
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [buildAd()] }),
      isLoading: ref(false),
    } as never)
  })

  it('renders the grid from the persisted GET /visuals/ read-back on a cold load', async () => {
    const persisted = buildPersistedVisual()
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [persisted] }),
    } as never)

    const wrapper = await mountView()

    const img = wrapper.find('[data-testid="visual-result-image"]')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('http://localhost:8000/media/visuals/ad-1.png')
  })

  it('retries a failed persisted visual with only that ad uuid subset', async () => {
    const failed = buildPersistedVisual({
      success: false,
      visual_status: 'failed',
      image_url: null,
      error: 'render blew up',
    })
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [failed] }),
    } as never)
    vi.mocked(campaignsApi.generateVisuals).mockResolvedValue({
      data: {
        success: true,
        campaign: buildCampaign(),
        generated_count: 1,
        results: [buildPersistedVisual()],
      },
    } as never)

    const wrapper = await mountView()

    const retryBtn = wrapper.findAll('[data-loc="campaigns.visual.result-card"]')[0].find('button')
    expect(retryBtn.exists()).toBe(true)
    await retryBtn.trigger('click')
    await flushPromises()

    expect(campaignsApi.generateVisuals).toHaveBeenCalledWith('c1', {
      ad_uuids: ['ad-1'],
      aspect_ratio: '1:1',
      quality: 'auto',
    })
  })

  it('still sends only the selected ads when generating fresh visuals', async () => {
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(campaignsApi.generateVisuals).mockResolvedValue({
      data: {
        success: true,
        campaign: buildCampaign(),
        generated_count: 1,
        results: [buildPersistedVisual()],
      },
    } as never)

    const wrapper = await mountView()

    await wrapper.find('[data-loc="campaigns.visual.ad-card"]').trigger('click')
    await wrapper.find('[data-loc="campaigns.visual.generate-btn"]').trigger('click')
    await flushPromises()

    expect(campaignsApi.generateVisuals).toHaveBeenCalledWith('c1', {
      ad_uuids: ['ad-1'],
      aspect_ratio: '1:1',
      quality: 'auto',
    })
  })
})
