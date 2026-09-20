import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import CampaignReviewView from './CampaignReviewView.vue'
import type { Campaign } from '../types'

vi.mock('@/features/campaigns/queries', () => ({
  useCampaign: vi.fn(),
  useCompleteCampaign: vi.fn(),
}))

// AiLoadingAnimation pulls in lottie-web, which crashes at import time in jsdom
vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign, useCompleteCampaign } from '../queries'

const mutateAsync = vi.fn()

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
