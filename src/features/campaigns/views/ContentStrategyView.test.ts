import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { ref } from 'vue'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ContentStrategyView from './ContentStrategyView.vue'
import type { Campaign } from '../types'

vi.mock('@/features/campaigns/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../queries')>()
  return { ...actual, useCampaign: vi.fn() }
})

vi.mock('@/features/campaigns/api', () => ({
  campaignsApi: {
    runContentStrategy: vi.fn(),
    update: vi.fn(),
    reviewStep: vi.fn(),
    approveStep: vi.fn(),
  },
}))

vi.mock('@/shared/components/AiLoadingAnimation.vue', () => ({
  default: { name: 'AiLoadingAnimation', template: '<div />' },
}))

import { useCampaign } from '../queries'

const STAGES = ['awareness', 'consideration', 'conversion']

function contentPlan(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    target_persona: i % 2 === 0 ? 'Budget Buyer' : 'Premium Seeker',
    funnel_stage: STAGES[i % 3],
    content_type: 'blog_post',
    content_idea: { title: `Idea ${i + 1}`, description: `Description ${i + 1}` },
  }))
}

function buildCampaign(responsePayload: Record<string, unknown>): Campaign {
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
    ppc_viability_completed: true,
    funnel_completed: true,
    content_strategy_completed: true,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    latest_steps: {
      content_strategy: { status: 'completed', response_payload: responsePayload },
    },
  } as unknown as Campaign
}

async function mountView(campaign: Campaign) {
  vi.mocked(useCampaign).mockReturnValue({
    data: ref(campaign),
    isLoading: ref(false),
  } as never)

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/campaigns/:campaignUuid/content', component: ContentStrategyView },
      { path: '/campaigns/:campaignUuid/ads-strategy', component: { template: '<div />' } },
    ],
  })
  router.push('/campaigns/c1/content')
  await router.isReady()

  const wrapper = mount(ContentStrategyView, {
    global: {
      plugins: [router, VueQueryPlugin],
      stubs: { Topbar: true, StepExportButton: true, ErrorState: true },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ContentStrategyView — header item count (QA round 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('counts rendered CONTENT ITEMS, not persona rows', async () => {
    // 13 items across 2 personas → header must say 13 (previously 2).
    const wrapper = await mountView(buildCampaign({ data: { content_plan: contentPlan(13) } }))

    expect(wrapper.find('[data-testid="content-items-count"]').text()).toBe('13 content items generated')
    // sanity: only the 2 personas present in the (server-filtered) payload render
    expect(wrapper.findAll('tbody tr').length).toBe(2)
  })

  it('prefers the backend-computed content_pieces_count when present', async () => {
    const wrapper = await mountView(
      buildCampaign({ data: { content_pieces_count: 13, content_plan: contentPlan(5) } }),
    )

    expect(wrapper.find('[data-testid="content-items-count"]').text()).toBe('13 content items generated')
  })
})
