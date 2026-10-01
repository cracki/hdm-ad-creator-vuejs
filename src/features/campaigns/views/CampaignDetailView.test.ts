import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref, type Ref } from 'vue'
import CampaignDetailView from './CampaignDetailView.vue'
import type { Campaign, CampaignAd } from '../types'

/**
 * QA round 3: the detail view must open at the REAL current step. Ad/visual
 * step completion is server truth (persisted records), so a campaign whose ad
 * flags are set but has no ads opens at the ads step — not one past it
 * ("No ads yet").
 */

vi.mock('../queries', () => ({
  useCampaign: vi.fn(),
  useCampaignAds: vi.fn(),
  useCampaignVisuals: vi.fn(),
}))

import { useCampaign, useCampaignAds, useCampaignVisuals } from '../queries'

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
    current_step: 'linkedin_ads',
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
    context_payload: { selected_platforms: ['meta'] },
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

function buildAd(overrides: Partial<CampaignAd> = {}): CampaignAd {
  return {
    campaign_ad_uuid: 'ad-1',
    campaign: 'c1',
    platform: 'meta',
    funnel_stage: 'TOFU',
    persona: null,
    funnel_context: {},
    data: {},
    review_status: null,
    reject_reason: null,
    reviewed_at: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as CampaignAd
}

/** Campaign data ref the test controls — resolves async like the real query. */
let campaignRef: Ref<Campaign | null>

function mockQueries(campaign: Campaign, ads: CampaignAd[], visuals: unknown[]) {
  campaignRef = ref<Campaign | null>(null)
  vi.mocked(useCampaign).mockReturnValue({
    data: campaignRef,
    isLoading: ref(false),
  } as never)
  vi.mocked(useCampaignAds).mockReturnValue({
    data: ref({ success: true, ads }),
    isLoading: ref(false),
  } as never)
  vi.mocked(useCampaignVisuals).mockReturnValue({
    data: ref({ success: true, results: visuals }),
    isLoading: ref(false),
  } as never)
}

const DUMMY = { template: '<div />' }

async function mountDetail(campaign: Campaign): Promise<{ path: string }> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid', component: CampaignDetailView },
      { path: '/campaigns/:campaignUuid/:step', component: DUMMY },
    ],
  })
  router.push('/campaigns/c1')
  await router.isReady()

  const wrapper = mount(CampaignDetailView, {
    global: {
      plugins: [router],
      stubs: {
        Topbar: true,
        Breadcrumb: true,
        BrandContextPanel: true,
        ImageLightbox: true,
      },
    },
  })
  await flushPromises()
  // The campaign query resolves — triggers the auto-redirect watch.
  campaignRef.value = campaign
  await flushPromises()
  await flushPromises()
  // Read the route before unmounting — vue-router resets state on app unmount.
  const path = router.currentRoute.value.path
  wrapper.unmount()
  return { path }
}

describe('CampaignDetailView — opens at the real current step (QA3)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('ad flags true but no ads → opens at the ads step', async () => {
    const campaign = buildCampaign()
    mockQueries(campaign, [], [])
    const { path } = await mountDetail(campaign)
    expect(path).toBe('/campaigns/c1/generate-ads')
  })

  it('ads exist → ads step counts done, opens at the next incomplete step', async () => {
    const campaign = buildCampaign()
    mockQueries(campaign, [buildAd()], [])
    const { path } = await mountDetail(campaign)
    expect(path).toBe('/campaigns/c1/visuals')
  })

  it('ads and visuals exist and status completed → no redirect', async () => {
    const campaign = buildCampaign({ status: 'completed' })
    mockQueries(
      campaign,
      [buildAd()],
      [
        {
          campaign_ad_uuid: 'ad-1',
          success: true,
          image_url: 'https://img.test/v.png',
          visual_summary: null,
          revised_prompt: null,
          error: null,
        },
      ],
    )
    const { path } = await mountDetail(campaign)
    expect(path).toBe('/campaigns/c1')
  })
})
