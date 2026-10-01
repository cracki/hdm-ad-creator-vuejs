import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import FunnelView from './FunnelView.vue'
import type { Campaign } from '../types'

vi.mock('@/features/campaigns/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>()
  return { ...actual, useCampaign: vi.fn() }
})

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runFunnel: vi.fn(),
    update: vi.fn(),
    reviewStep: vi.fn(),
    approveStep: vi.fn(),
  },
}))

vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign } from '../queries'
import { campaignsApi } from '../api'

const PERSONA_PROFILES = [
  {
    persona_name: 'Budget Buyer',
    messages: {
      TOFU: { headline_angle: 'Save more every day', body_approach: 'Practical tips to cut costs', cta: 'Download the guide', kpi: 'CTR >= 2%', budget_share: 30 },
      BOFU: { headline_angle: 'Best value', body_approach: 'Compare plans side by side', cta: 'Start free trial', kpi: 'CPA <= $12', budget_share: 45 },
    },
  },
  {
    persona_name: 'Premium Seeker',
    messages: {
      TOFU: { headline_angle: 'Elevate your routine', body_approach: 'Premium quality without compromise' },
    },
  },
]

function buildCampaign(funnelPayload: Record<string, unknown>): Campaign {
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
    current_step: 'funnel',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    latest_steps: {
      funnel: { status: 'completed', response_payload: funnelPayload },
    },
  } as unknown as Campaign
}

function mockCampaign(campaign: Campaign) {
  vi.mocked(useCampaign).mockReturnValue({
    data: ref(campaign),
    isLoading: ref(false),
  } as never)
}

let router: Router

async function mountView() {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/funnel', component: FunnelView },
      { path: '/campaigns/:campaignUuid/content', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/funnel')
  await router.isReady()

  const wrapper = mount(FunnelView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, StepExportButton: true, ErrorState: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('FunnelView — per-persona CTA / KPI / budget_share (QA round 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runFunnel).mockResolvedValue({
      data: { step: { response_payload: {} } },
    } as never)
  })

  it('renders expandable persona cards with the additive chips from the run payload', async () => {
    mockCampaign(buildCampaign({ funnel_context: { persona_profiles: PERSONA_PROFILES } }))
    const wrapper = await mountView()

    // section header + one collapsed card per persona
    expect(wrapper.text()).toContain('Persona breakdown')
    const cards = wrapper.findAll('[data-testid="funnel-persona-card"]')
    expect(cards.map((c) => c.find('.truncate').text())).toEqual(['Budget Buyer', 'Premium Seeker'])

    // collapsed default — chips hidden until expanded
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)

    await wrapper.findAll('[data-testid="funnel-persona-toggle"]')[0].trigger('click')

    expect(wrapper.findAll('[data-testid="funnel-persona-cta"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="funnel-persona-kpi"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="funnel-persona-budget"]').map((b) => b.text())).toEqual(['30%', '45%'])
  })

  it('hides the additive chips when the persisted run predates the new fields', async () => {
    mockCampaign(
      buildCampaign({
        funnel_context: {
          persona_profiles: [
            { persona_name: 'Budget Buyer', messages: { TOFU: { headline_angle: 'Save more', body_approach: 'Cut costs' } } },
          ],
        },
      }),
    )
    const wrapper = await mountView()

    await wrapper.find('[data-testid="funnel-persona-toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-kpi"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-budget"]').exists()).toBe(false)
  })
})
