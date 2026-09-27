import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'
import CampaignListView from './CampaignListView.vue'
import type { Campaign } from '../types'

vi.mock('../queries', () => ({
  useCampaigns: vi.fn(),
  useDeleteCampaign: vi.fn(() => ({ mutateAsync: vi.fn() })),
}))

vi.mock('@/shared/composables/useTourRegistration', () => ({
  useTourRegistration: () => ({ startTour: vi.fn() }),
}))

import { useCampaigns } from '../queries'

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

function mockCampaigns(campaigns: Campaign[]) {
  vi.mocked(useCampaigns).mockReturnValue({
    data: ref(campaigns),
    isLoading: ref(false),
    error: ref(null),
    refetch: vi.fn(),
  } as never)
}

async function mountView(): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { template: '<div />' } }],
  })
  const wrapper = mount(CampaignListView, {
    global: {
      plugins: [router],
      stubs: { Topbar: true, ConfirmDialog: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('CampaignListView — truthful card status (MOM باگ۶)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows Completed and the selected platforms for a completed campaign, never the raw current_step', async () => {
    mockCampaigns([
      buildCampaign({
        name: 'Done Campaign',
        status: 'completed',
        current_step: 'linkedin_ads',
        context_payload: { selected_platforms: ['meta', 'google'] },
        segmentation_completed: true,
        ppc_viability_completed: true,
        funnel_completed: true,
        content_strategy_completed: true,
        meta_ads_completed: true,
        google_ads_completed: true,
        linkedin_ads_completed: false,
      }),
    ])
    const wrapper = await mountView()

    // "Current: Completed" instead of the misleading "linkedin ads".
    expect(wrapper.find('[data-testid="campaign-card-current"]').text()).toBe('Completed')
    expect(wrapper.text()).not.toContain('linkedin ads')

    // The platforms the campaign actually runs on, localized.
    const platforms = wrapper.find('[data-testid="campaign-card-platforms"]')
    expect(platforms.exists()).toBe(true)
    expect(platforms.text()).toContain('Meta (Facebook & Instagram)')
    expect(platforms.text()).toContain('Google Ads')

    // Steps cell: completed/total (6/6), not the raw steps_count.
    expect(wrapper.find('[data-testid="campaign-card-steps"]').text()).toContain('6 / 6')
  })

  it('shows step progress as completed/total instead of the raw steps_count', async () => {
    mockCampaigns([
      buildCampaign({
        steps_count: 9,
        segmentation_completed: true,
        ppc_viability_completed: true,
        context_payload: { selected_platforms: ['meta'] },
      }),
    ])
    const wrapper = await mountView()

    // 4 base steps + meta = 5 applicable; segmentation + PPC done = 2.
    expect(wrapper.find('[data-testid="campaign-card-steps"]').text()).toContain('2 / 5')
  })

  it('falls back to the current step while platform selection has not happened', async () => {
    mockCampaigns([buildCampaign({ current_step: 'segmentation' })])
    const wrapper = await mountView()

    expect(wrapper.find('[data-testid="campaign-card-current"]').text()).toBe('segmentation')
    expect(wrapper.find('[data-testid="campaign-card-platforms"]').exists()).toBe(false)
    // All three platform flags count before selection: 0 / 7.
    expect(wrapper.find('[data-testid="campaign-card-steps"]').text()).toContain('0 / 7')
  })
})
