import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Step4FunnelDashboard from './Step4FunnelDashboard.vue'
import { campaignsApi } from '@/features/campaigns/api'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runFunnel: vi.fn(),
    update: vi.fn(),
    approveStep: vi.fn(),
    reviewStep: vi.fn(),
  },
}))

vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
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
    current_step: 'funnel',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
    ppc_viability_completed: true,
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

const RUN_RESPONSE = {
  data: {
    step: {
      response_payload: {
        funnel_context: {
          persona_profiles: [
            {
              persona_name: 'Budget Buyer',
              messages: {
                TOFU: { headline_angle: 'Save more', body_approach: 'Cut costs', cta: 'Download the guide', kpi: 'CTR >= 2%', budget_share: 30 },
              },
            },
          ],
        },
      },
    },
  },
} as never

async function mountStep(campaign: Campaign) {
  const wrapper = mount(Step4FunnelDashboard, {
    props: { campaign, campaignUuid: 'c1' },
    global: { plugins: [VueQueryPlugin] },
  })
  await flushPromises()
  return wrapper
}

describe('Step4FunnelDashboard — per-persona CTA / KPI / budget_share (QA round 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(campaignsApi.runFunnel).mockResolvedValue(RUN_RESPONSE)
  })

  it('renders expandable persona cards with the additive chips after a run', async () => {
    const wrapper = await mountStep(buildCampaign())

    // collapsed default: run the step, then expand the persona card
    await wrapper.findAll('button').find((b) => b.text().includes('Run Funnel'))!.trigger('click')
    await flushPromises()

    expect(wrapper.findAll('[data-testid="funnel-persona-card"]').length).toBe(1)
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)

    await wrapper.find('[data-testid="funnel-persona-toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="funnel-persona-cta"]').text()).toContain('Download the guide')
    expect(wrapper.find('[data-testid="funnel-persona-kpi"]').text()).toContain('CTR >= 2%')
    expect(wrapper.find('[data-testid="funnel-persona-budget"]').text()).toBe('30%')
  })

  it('hides the additive chips for runs without them', async () => {
    vi.mocked(campaignsApi.runFunnel).mockResolvedValue({
      data: {
        step: {
          response_payload: {
            funnel_context: {
              persona_profiles: [
                { persona_name: 'Budget Buyer', messages: { TOFU: { headline_angle: 'Save more' } } },
              ],
            },
          },
        },
      },
    } as never)
    const wrapper = await mountStep(buildCampaign())

    await wrapper.findAll('button').find((b) => b.text().includes('Run Funnel'))!.trigger('click')
    await flushPromises()
    await wrapper.find('[data-testid="funnel-persona-toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-kpi"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-budget"]').exists()).toBe(false)
  })
})
