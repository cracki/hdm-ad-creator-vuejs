import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Slot } from 'vue'
import { ref } from 'vue'
import ContentMatrixRenderer from './ContentMatrixRenderer.vue'
import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import type { Campaign } from '@/features/campaigns/types'

/**
 * QA4-img31: the matrix tab of /market/intelligence renders this renderer
 * WITHOUT a parent-supplied #item-actions slot — the built-in fallback
 * (InsightItemActions) must give every content idea the same Add to Campaign /
 * Generate Brief actions the standalone MarketMatrixView provides.
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

function makeStage(ideas: unknown[]) {
  return { stage: 'TOFU', goal: 'Build awareness', content_ideas: ideas, recommended_formats: [], total_ideas: ideas.length }
}

function mountRenderer(ideas: unknown[], slots: Record<string, Slot | string> = {}) {
  return mount(ContentMatrixRenderer, {
    props: {
      data: {
        industry: 'skincare',
        location: 'Muscat',
        content_matrix: {
          TOFU: makeStage(ideas),
          MOFU: makeStage([]),
          BOFU: makeStage([]),
        },
        total_content_ideas: ideas.length,
        priority_recommendation: 'Start with TOFU',
      },
    },
    slots,
  })
}

describe('ContentMatrixRenderer — per-idea insight actions (QA4-img31)', () => {
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

  it('renders one Add to Campaign / Generate Brief action pair per idea in the active stage', () => {
    const wrapper = mountRenderer([
      { suggested_title: 'Guide to vitamin C', title_inspiration: 'vitamin c article', topic: 'vitamin c', content_angle: 'Beginner-friendly explainer' },
      { title_inspiration: 'FAQ: retinol', topic: 'FAQ', suggested_title: '' },
    ])

    expect(wrapper.findAll('[data-testid="insight-add-btn"]')).toHaveLength(2)
    expect(wrapper.findAll('[data-testid="insight-brief-btn"]')).toHaveLength(2)
  })

  it('clicking Add to Campaign opens the campaign picker and saves the idea with the standalone-view mapping', async () => {
    const wrapper = mountRenderer([
      { suggested_title: 'Guide to vitamin C', title_inspiration: 'vitamin c article', topic: 'vitamin c', content_angle: 'Beginner-friendly explainer' },
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
    // Same mapping MarketMatrixView uses: suggested_title → title,
    // content_angle → snippet.
    expect(insights[0]).toMatchObject({
      source: 'market',
      view: 'matrix',
      title: 'Guide to vitamin C',
      snippet: 'Beginner-friendly explainer',
    })
  })

  it('falls back to title_inspiration / topic when suggested_title and content_angle are empty', async () => {
    const wrapper = mountRenderer([
      { suggested_title: '', title_inspiration: 'FAQ: retinol', topic: 'FAQ', content_angle: '' },
    ])

    await wrapper.find('[data-testid="insight-add-btn"]').trigger('click')
    await wrapper.findAll('[data-testid="insight-campaign-option"]')[0].trigger('click')

    const insights = updateMutate.mock.calls[0][0].payload.context_payload.content_insights
    expect(insights[0]).toMatchObject({ view: 'matrix', title: 'FAQ: retinol', snippet: 'FAQ' })
  })

  it('a parent-supplied #item-actions slot still replaces the built-in actions', () => {
    const wrapper = mountRenderer([{ suggested_title: 'X', topic: 'x', content_angle: '' }], {
      'item-actions': `<div data-testid="custom-actions">Custom</div>`,
    })

    expect(wrapper.find('[data-testid="custom-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-add-btn"]').exists()).toBe(false)
  })
})
