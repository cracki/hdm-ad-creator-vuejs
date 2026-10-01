import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import CampaignReviewView from './CampaignReviewView.vue'
import type { Campaign } from '../types'

vi.mock('@/features/campaigns/queries', () => ({
  useCampaign: vi.fn(),
  useCampaignAds: vi.fn(),
  useCampaignVisuals: vi.fn(),
  useCompleteCampaign: vi.fn(),
  useAdsStrategy: vi.fn(),
  useReviewAd: vi.fn(),
  usePatchAd: vi.fn(),
  useRefineAd: vi.fn(),
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign, useCampaignAds, useCampaignVisuals, useCompleteCampaign, useAdsStrategy, useReviewAd, usePatchAd, useRefineAd } from '../queries'
import type { CampaignAd, GeneratedVisual } from '../types'

function fakeMutation() {
  return { isPending: ref(false), mutate: vi.fn() } as never
}

const mutateAsync = vi.fn()

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

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    brand: {
      brand_uuid: 'b1',
      company_name: 'Lumen',
      website_url: 'https://lumen.test',
      location: null,
      selected_industry: { industry_uuid: 'i1', name: 'Skincare' },
    },
    name: 'Summer Launch',
    status: 'in_progress',
    current_step: 'review',
    language: 'en',
    total_budget: 1000,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: true,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: { selected_platforms: ['meta'] },
    summary: {
      funnel: {
        tofu_budget_percentage: 40,
        mofu_budget_percentage: 35,
        bofu_budget_percentage: 25,
      },
    },
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

let router: Router

async function mountView(): Promise<VueWrapper> {
  const wrapper = mount(CampaignReviewView, {
    global: {
      plugins: [router],
      stubs: { Topbar: true, StepExportButton: true, AiLoadingAnimation: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('CampaignReviewView — total budget + funnel split (F16)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignReviewView },
        { path: '/campaigns', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/review', component: CampaignReviewView },
      ],
    })
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [] }),
    } as never)
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [] }),
    } as never)
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())
  })

  it('shows the total budget with currency', async () => {
    const wrapper = await mountView()
    // Amount formatting is locale-dependent; assert on the currency code and
    // that some digits render.
    const text = wrapper.find('[data-testid="total-budget-value"]').text()
    expect(text).toContain('USD')
    expect(text).toMatch(/\d/)
  })

  it('shows the per-stage split as percent and computed amounts (total × %)', async () => {
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="funnel-budget-split"]').exists()).toBe(true)
    // 1000 × 40% / 35% / 25% — chosen so no locale grouping separators appear
    expect(wrapper.find('[data-testid="budget-split-tofu"]').text()).toBe('40% · 400')
    expect(wrapper.find('[data-testid="budget-split-mofu"]').text()).toBe('35% · 350')
    expect(wrapper.find('[data-testid="budget-split-bofu"]').text()).toBe('25% · 250')
  })

  it('hides the budget row and split card when no budget/summary exists', async () => {
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(
        buildCampaign({ total_budget: null, summary: {} }),
      ),
      isLoading: ref(false),
    } as never)
    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="total-budget-value"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-budget-split"]').exists()).toBe(false)
  })

  it('renders the campaign language as a badge with its native name (F22)', async () => {
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign({ language: 'fa' })),
      isLoading: ref(false),
    } as never)
    const wrapper = await mountView()
    const badge = wrapper.find('[data-testid="campaign-language-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('فارسی')
  })
})

describe('CampaignReviewView — complete error surfacing (F17)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignReviewView },
        { path: '/campaigns', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/review', component: CampaignReviewView },
      ],
    })
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [] }),
    } as never)
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [] }),
    } as never)
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())
  })

  it('renders the backend detail string when completion is rejected with 400 {detail, missing}', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          detail: 'Campaign completion requirements not met: segmentation step is missing.',
          missing: ['segmentation'],
        },
      },
    })
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="complete-error"]').exists()).toBe(false)
    await wrapper.find('[data-loc="campaigns.review.complete-btn"]').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[data-testid="complete-error"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain(
      'Campaign completion requirements not met: segmentation step is missing.',
    )
  })

  it('renders the missing step slugs as localized chips (F17)', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: {
        status: 400,
        data: {
          detail: 'Campaign completion requirements not met.',
          missing: ['segmentation', 'meta_ads'],
        },
      },
    })
    const wrapper = await mountView()

    await wrapper.find('[data-loc="campaigns.review.complete-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="complete-missing"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="missing-chip-segmentation"]').text()).toBe('Brand Intelligence')
    expect(wrapper.find('[data-testid="missing-chip-meta_ads"]').text()).toBe('Meta Ads')
  })

  it('does not render missing chips when the error has no missing array', async () => {
    mutateAsync.mockRejectedValueOnce({
      response: { status: 400, data: { detail: 'Nope' } },
    })
    const wrapper = await mountView()

    await wrapper.find('[data-loc="campaigns.review.complete-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="complete-missing"]').exists()).toBe(false)
  })

  it('falls back to a generic message when the error has no detail', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Network failure'))
    const wrapper = await mountView()

    await wrapper.find('[data-loc="campaigns.review.complete-btn"]').trigger('click')
    await flushPromises()

    const banner = wrapper.find('[data-testid="complete-error"]')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('Network failure')
  })
})

describe('CampaignReviewView — generated ads with review actions (F13)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignReviewView },
        { path: '/campaigns', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/review', component: CampaignReviewView },
      ],
    })
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [] }),
    } as never)
  })

  it('renders the ads section with review state restored from GET /ads/', async () => {
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({
        success: true,
        ads: [
          buildAd({ campaign_ad_uuid: 'ad-1', review_status: 'approved' }),
          buildAd({
            campaign_ad_uuid: 'ad-2',
            review_status: 'rejected',
            reject_reason: 'Wrong tone',
          }),
        ],
      }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="review-ads-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ad-status-approved"]').exists()).toBe(true)

    await wrapper.find('[data-testid="ad-status-rejected"]').trigger('click')
    expect(wrapper.find('[data-testid="ad-reject-reason"]').text()).toBe('Wrong tone')
  })

  it('hides the ads section when the campaign has no ads', async () => {
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [] }),
    } as never)
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())

    const wrapper = await mountView()
    expect(wrapper.find('[data-testid="review-ads-section"]').exists()).toBe(false)
  })
})

function buildVisual(overrides: Partial<GeneratedVisual> = {}): GeneratedVisual {
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
    generated_at: '2026-01-01T10:00:00Z',
    ...overrides,
  } as GeneratedVisual
}

describe('CampaignReviewView — ad visuals on review (QA photo 28)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignReviewView },
        { path: '/campaigns', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/review', component: CampaignReviewView },
      ],
    })
    await router.push('/campaigns/c1/review')
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({
        success: true,
        ads: [buildAd({ campaign_ad_uuid: 'ad-1' }), buildAd({ campaign_ad_uuid: 'ad-2' })],
      }),
    } as never)
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())
  })

  it('renders each ad generated image next to its copy', async () => {
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({
        success: true,
        results: [
          buildVisual({ campaign_ad_uuid: 'ad-1', image_url: 'http://localhost:8000/media/visuals/ad-1.png' }),
          buildVisual({ campaign_ad_uuid: 'ad-2', image_url: 'http://localhost:8000/media/visuals/ad-2.png' }),
        ],
      }),
    } as never)

    const wrapper = await mountView()

    const thumbs = wrapper.findAll('[data-testid="review-ad-visual"]')
    expect(thumbs.length).toBe(2)
    expect((thumbs[0].find('img').element as HTMLImageElement).getAttribute('src')).toBe(
      'http://localhost:8000/media/visuals/ad-1.png',
    )
    expect((thumbs[1].find('img').element as HTMLImageElement).getAttribute('src')).toBe(
      'http://localhost:8000/media/visuals/ad-2.png',
    )
    wrapper.unmount()
  })

  it('picks the latest successful visual per ad and ignores failed ones', async () => {
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({
        success: true,
        results: [
          buildVisual({ image_url: 'http://localhost:8000/media/old.png', generated_at: '2026-01-01T10:00:00Z' }),
          buildVisual({
            success: false,
            visual_status: 'failed',
            image_url: null,
            error: 'boom',
            generated_at: '2026-01-02T10:00:00Z',
          }),
          buildVisual({ image_url: 'http://localhost:8000/media/new.png', generated_at: '2026-01-03T10:00:00Z' }),
        ],
      }),
    } as never)

    const wrapper = await mountView()

    const thumb = wrapper.find('[data-testid="review-ad-visual"]')
    expect(thumb.exists()).toBe(true)
    expect((thumb.find('img').element as HTMLImageElement).getAttribute('src')).toBe(
      'http://localhost:8000/media/new.png',
    )
    wrapper.unmount()
  })

  it('opens the lightbox when a review thumbnail is clicked', async () => {
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [buildVisual()] }),
    } as never)

    const wrapper = await mountView()

    await wrapper.find('[data-testid="review-ad-visual"]').trigger('click')
    await flushPromises()

    const img = document.querySelector('[data-testid="image-lightbox-img"]') as HTMLImageElement
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('http://localhost:8000/media/visuals/ad-1.png')
    wrapper.unmount()
  })

  it('keeps the ad card text-only when no visual exists for the ad', async () => {
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [] }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="review-ads-section"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="review-ad-visual"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

// ── Unified split from the actual ads strategies (QA round 3, MOM §12.4) ──

const STRATEGY_META = {
  campaign_step_uuid: 's1',
  step_type: 'meta_ads' as const,
  platform: 'meta' as const,
  status: 'completed' as const,
  request_payload: {},
  response_payload: {
    funnel_campaigns: [
      { funnel_stage: 'ToFu', campaign_type: 'Traffic', budget_percent: 50 },
      { funnel_stage: 'BoFu', campaign_type: 'Conversions', budget_percent: 50 },
    ],
  },
  summary: {},
  started_at: null,
  completed_at: null,
  error_message: null,
  created_at: '',
  updated_at: '',
}

const STRATEGY_GOOGLE = {
  ...STRATEGY_META,
  campaign_step_uuid: 's2',
  step_type: 'google_ads' as const,
  platform: 'google' as const,
  response_payload: {
    funnel_campaigns: [
      { funnel_stage: 'ToFu', campaign_type: 'Display', budget_percent: 30 },
      { funnel_stage: 'MoFu', campaign_type: 'Demand Gen', budget_percent: 30 },
      { funnel_stage: 'BoFu', campaign_type: 'Search', budget_percent: 40 },
    ],
  },
}

describe('CampaignReviewView — unified budget split from strategies (QA3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: CampaignReviewView },
        { path: '/campaigns', component: { template: '<div />' } },
        { path: '/campaigns/:campaignUuid/review', component: CampaignReviewView },
      ],
    })
    vi.mocked(useCampaignAds).mockReturnValue({
      data: ref({ success: true, ads: [] }),
    } as never)
    vi.mocked(useCampaignVisuals).mockReturnValue({
      data: ref({ success: true, results: [] }),
    } as never)
    vi.mocked(useCompleteCampaign).mockReturnValue({ mutateAsync } as never)
    vi.mocked(useReviewAd).mockReturnValue(fakeMutation())
    vi.mocked(usePatchAd).mockReturnValue(fakeMutation())
    vi.mocked(useRefineAd).mockReturnValue(fakeMutation())
  })

  it('aggregates the funnel-stage split from the strategies, weighted by recommended platform shares', async () => {
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(
        buildCampaign({
          context_payload: {
            selected_platforms: ['meta', 'google'],
            platform_recommendations: { budget_share: { meta: 60, google: 40 } },
          },
        }),
      ),
      isLoading: ref(false),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [STRATEGY_META, STRATEGY_GOOGLE] }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="strategy-budget-split"]').exists()).toBe(true)
    // No funnel-step fallback when strategies exist.
    expect(wrapper.find('[data-testid="funnel-budget-split"]').exists()).toBe(false)

    // Platform shares come from the recommendation's budget_share.
    expect(wrapper.find('[data-testid="budget-split-platform-meta"]').text()).toBe('60%')
    expect(wrapper.find('[data-testid="budget-split-platform-google"]').text()).toBe('40%')

    // Stage split: 0.6×meta + 0.4×google → tofu 42, mofu 12, bofu 46 (×1000 budget).
    expect(wrapper.find('[data-testid="budget-split-tofu"]').text()).toBe('42% · 420')
    expect(wrapper.find('[data-testid="budget-split-mofu"]').text()).toBe('12% · 120')
    expect(wrapper.find('[data-testid="budget-split-bofu"]').text()).toBe('46% · 460')
  })

  it('weights platforms equally when no recommendation shares exist', async () => {
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(
        buildCampaign({ context_payload: { selected_platforms: ['meta', 'google'] } }),
      ),
      isLoading: ref(false),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [STRATEGY_META, STRATEGY_GOOGLE] }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="budget-split-platform-meta"]').text()).toBe('50%')
    expect(wrapper.find('[data-testid="budget-split-platform-google"]').text()).toBe('50%')
    // 0.5×meta(tofu 50) + 0.5×google(tofu 30) = 40; mofu 15; bofu 45.
    expect(wrapper.find('[data-testid="budget-split-tofu"]').text()).toBe('40% · 400')
    expect(wrapper.find('[data-testid="budget-split-mofu"]').text()).toBe('15% · 150')
    expect(wrapper.find('[data-testid="budget-split-bofu"]').text()).toBe('45% · 450')
  })

  it('falls back to the funnel-step split when no strategies exist', async () => {
    vi.mocked(useCampaign).mockReturnValue({
      data: ref(buildCampaign()),
      isLoading: ref(false),
    } as never)
    vi.mocked(useAdsStrategy).mockReturnValue({
      data: ref({ success: true, strategies: [] }),
    } as never)

    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="strategy-budget-split"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-budget-split"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="budget-split-tofu"]').text()).toBe('40% · 400')
  })
})
