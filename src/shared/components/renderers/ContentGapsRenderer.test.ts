import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Slot } from 'vue'
import { ref } from 'vue'
import ContentGapsRenderer from './ContentGapsRenderer.vue'
import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import type { Campaign } from '@/features/campaigns/types'

/**
 * QA4-img31: the gaps tab of /market/intelligence renders this renderer
 * WITHOUT a parent-supplied #item-actions slot — the built-in fallback
 * (InsightItemActions) must give every gap the same Add to Campaign /
 * Generate Brief actions the standalone MarketGapsView provides.
 */

const updateMutate = vi.fn()

vi.mock('@/features/campaigns/queries', () => ({
  useCampaigns: vi.fn(),
  useUpdateCampaign: vi.fn(),
}))

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    name: 'Summer Launch',
    status: 'in_progress',
    context_payload: {},
    ...overrides,
  } as Campaign
}

function mountRenderer(gaps: unknown[] = [], slots: Record<string, Slot | string> = {}) {
  return mount(ContentGapsRenderer, {
    props: {
      data: {
        industry: 'skincare',
        content_gaps: gaps,
        total_gaps_found: gaps.length,
        recommendation: 'Prioritize the top two gaps.',
      },
    },
    slots,
  })
}

describe('ContentGapsRenderer — per-item insight actions (QA4-img31)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useCampaigns).mockReturnValue({
      data: ref([buildCampaign()]),
      isLoading: ref(false),
    } as never)
    vi.mocked(useUpdateCampaign).mockReturnValue({
      mutate: updateMutate,
      isPending: ref(false),
    } as never)
  })

  it('renders one Add to Campaign / Generate Brief action pair per gap', () => {
    const wrapper = mountRenderer([
      { topic: 'AI tutors', opportunity_score: 7, reason: 'Underserved topic' },
      { topic: 'Pricing transparency', opportunity_score: 4, reason: 'No competitor publishes prices' },
    ])

    expect(wrapper.findAll('[data-testid="insight-add-btn"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="insight-brief-btn"]')).toHaveLength(2)
  })

  it('clicking Add to Campaign opens the campaign picker and saves the gap with the standalone-view mapping', async () => {
    const wrapper = mountRenderer([
      { topic: 'AI tutors', opportunity_score: 7, reason: 'Underserved topic', suggested_content_type: 'comparison_article' },
    ])

    await wrapper.find('[data-testid="insight-add-btn"]').trigger('click')
    const modal = wrapper.find('[data-testid="insight-campaign-modal"]')
    expect(modal.exists()).toBe(true)

    const options = wrapper.findAll('[data-testid="insight-campaign-option"]')
    expect(options).toHaveLength(1)
    await options[0].trigger('click')

    expect(updateMutate).toHaveBeenCalledTimes(1)
    const call = updateMutate.mock.calls[0][0]
    expect(call.uuid).toBe('c1')
    const insights = call.payload.context_payload.content_insights
    expect(insights).toHaveLength(1)
    // Same mapping MarketGapsView uses: topic → title, reason → snippet.
    expect(insights[0]).toMatchObject({
      source: 'market',
      view: 'gaps',
      title: 'AI tutors',
      snippet: 'Underserved topic',
    })
  })

  it('a parent-supplied #item-actions slot still replaces the built-in actions', () => {
    const wrapper = mountRenderer([{ topic: 'AI tutors', opportunity_score: 7, reason: 'Underserved topic' }], {
      'item-actions': `<div data-testid="custom-actions">Custom</div>`,
    })

    expect(wrapper.find('[data-testid="custom-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-add-btn"]').exists()).toBe(false)
  })
})
