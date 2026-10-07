import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Slot } from 'vue'
import { ref } from 'vue'
import TopPerformingContentRenderer from './TopPerformingContentRenderer.vue'
import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import type { Campaign } from '@/features/campaigns/types'

/**
 * QA4-img31: the top-performers tab of /market/intelligence renders this
 * renderer WITHOUT a parent-supplied #item-actions slot — the built-in
 * fallback (InsightItemActions) must give every performer the same Add to
 * Campaign / Generate Brief actions the standalone MarketTopPerformingView
 * provides.
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

function mountRenderer(performers: unknown[], slots: Record<string, Slot | string> = {}) {
  return mount(TopPerformingContentRenderer, {
    props: {
      data: {
        industry: 'skincare',
        top_performers: performers,
        total_found: performers.length,
        common_patterns: { most_common_type: null, dominant_domains: [], average_position: 1.5 },
        action_items: [],
      },
    },
    slots,
  })
}

describe('TopPerformingContentRenderer — per-item insight actions (QA4-img31)', () => {
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

  it('renders one Add to Campaign / Generate Brief action pair per performer', () => {
    const wrapper = mountRenderer([
      { title: 'Best serums 2026', snippet: 'A roundup', why_it_ranks: 'Strong backlinks', your_opportunity: 'Outdo with a comparison', content_type: 'article' },
      { title: 'Retinol myths', snippet: 'Debunked', why_it_ranks: '', your_opportunity: '', content_type: 'guide' },
    ])

    expect(wrapper.findAll('[data-testid="insight-add-btn"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="insight-brief-btn"]')).toHaveLength(2)
  })

  it('clicking Add to Campaign opens the campaign picker and saves the performer with the standalone-view mapping', async () => {
    const wrapper = mountRenderer([
      { title: 'Best serums 2026', snippet: 'A roundup', why_it_ranks: 'Strong backlinks', your_opportunity: 'Outdo with a comparison', content_type: 'article' },
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
    // Same mapping MarketTopPerformingView uses: title → title,
    // why_it_ranks (falling back to snippet) → snippet.
    expect(insights[0]).toMatchObject({
      source: 'market',
      view: 'top_performers',
      title: 'Best serums 2026',
      snippet: 'Strong backlinks',
    })
  })

  it('falls back to snippet when why_it_ranks is missing', async () => {
    const wrapper = mountRenderer([
      { title: 'Retinol myths', snippet: 'Debunked', why_it_ranks: '', your_opportunity: '', content_type: 'guide' },
    ])

    await wrapper.find('[data-testid="insight-add-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="insight-campaign-option"]')[0].trigger('click')

    const insights = updateMutate.mock.calls[0][0].payload.context_payload.content_insights
    expect(insights[0]).toMatchObject({ view: 'top_performers', title: 'Retinol myths', snippet: 'Debunked' })
  })

  it('a parent-supplied #item-actions slot still replaces the built-in actions', () => {
    const wrapper = mountRenderer([{ title: 'X', snippet: '', why_it_ranks: '', content_type: 'article' }], {
      'item-actions': `<div data-testid="custom-actions">Custom</div>`,
    })

    expect(wrapper.find('[data-testid="custom-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-add-btn"]').exists()).toBe(false)
  })
})
