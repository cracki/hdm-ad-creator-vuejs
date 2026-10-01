import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { VueQueryPlugin } from '@tanstack/vue-query'
import Step5ContentMatrix from './Step5ContentMatrix.vue'
import { campaignsApi } from '@/features/campaigns/api'
import type { Campaign } from '@/features/campaigns/types'

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runContentStrategy: vi.fn(),
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
    current_step: 'content_strategy',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: true,
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

function contentPlan(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    target_persona: i % 2 === 0 ? 'Budget Buyer' : 'Premium Seeker',
    funnel_stage: ['awareness', 'consideration', 'conversion'][i % 3],
    content_type: 'blog_post',
    content_idea: { title: `Idea ${i + 1}`, description: `Description ${i + 1}` },
  }))
}

async function mountStep(campaign: Campaign) {
  const wrapper = mount(Step5ContentMatrix, {
    props: { campaign, campaignUuid: 'c1' },
    global: { plugins: [VueQueryPlugin] },
  })
  await flushPromises()
  return wrapper
}

describe('Step5ContentMatrix — header item count (QA round 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts rendered content items from the run payload', async () => {
    vi.mocked(campaignsApi.runContentStrategy).mockResolvedValue({
      data: { step: { response_payload: { data: { content_plan: contentPlan(7) } } } },
    } as never)
    const wrapper = await mountStep(buildCampaign())

    await wrapper.findAll('button').find((b) => b.text().includes('Generate Content Strategy'))!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="content-items-count"]').text()).toBe('7 content items generated')
  })

  it('prefers the backend-computed content_pieces_count when present', async () => {
    vi.mocked(campaignsApi.runContentStrategy).mockResolvedValue({
      data: {
        step: {
          response_payload: { data: { content_pieces_count: 13, content_plan: contentPlan(4) } },
        },
      },
    } as never)
    const wrapper = await mountStep(buildCampaign())

    await wrapper.findAll('button').find((b) => b.text().includes('Generate Content Strategy'))!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="content-items-count"]').text()).toBe('13 content items generated')
  })
})
