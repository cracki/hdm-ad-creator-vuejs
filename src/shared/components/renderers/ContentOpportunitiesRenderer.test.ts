import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import ContentOpportunitiesRenderer from './ContentOpportunitiesRenderer.vue'
import { useCampaigns, useUpdateCampaign } from '@/features/campaigns/queries'
import type { Campaign } from '@/features/campaigns/types'

const updateMutate = vi.fn()

// The built-in per-item actions (QA4-img31) pull the campaigns list; mock the
// queries module so mounting never needs a vue-query plugin.
vi.mock('@/features/campaigns/queries', () => ({
  useCampaigns: vi.fn(),
  useUpdateCampaign: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(useCampaigns).mockReturnValue({
    data: ref([buildCampaign()]),
    isLoading: ref(false),
  } as never)
  vi.mocked(useUpdateCampaign).mockReturnValue({
    mutate: updateMutate,
    isPending: ref(false),
  } as never)
})

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'c1',
    name: 'Summer Launch',
    status: 'in_progress',
    context_payload: {},
    ...overrides,
  } as Campaign
}

describe('ContentOpportunitiesRenderer — honest empty state (QA photo 31)', () => {
  it('renders the rich layout when core opportunity fields exist', () => {
    const wrapper = mount(ContentOpportunitiesRenderer, {
      props: {
        data: {
          total_topics_found: 2,
          top_performing_content: [
            { title: 'Best serums 2026', snippet: 'A roundup', domain: 'example.com', url: 'https://example.com/a', query: 'best serums' },
          ],
          content_by_type: { guides: [{ title: 'Guide', snippet: 's', domain: 'example.com', query: 'q' }] },
          top_competing_domains: [{ domain: 'example.com', content_count: 4 }],
        },
      },
    })

    expect(wrapper.find('[data-testid="opportunities-empty-state"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Best serums 2026')
  })

  it('shows an empty state — not a payload dump — when core fields are missing but other keys exist', () => {
    const wrapper = mount(ContentOpportunitiesRenderer, {
      props: {
        // Shape QA hit: the section object exists but none of the renderer's
        // core fields do; the old generic fallback rendered it as unrelated
        // "top performing"-style content.
        data: {
          total_topics_found: 0,
          recommendation: 'Widen the topic scope and re-run.',
          queries_used: ['serums', 'facials'],
        },
      },
    })

    const empty = wrapper.find('[data-testid="opportunities-empty-state"]')
    expect(empty.exists()).toBe(true)
    // No raw payload fallback: the unrelated content must not leak through.
    expect(wrapper.text()).not.toContain('Widen the topic scope and re-run.')
    expect(wrapper.text()).not.toContain('queries_used')
    expect(wrapper.text()).not.toContain('Top Performing Content')
  })

  it('shows the same empty state for an empty payload', () => {
    const wrapper = mount(ContentOpportunitiesRenderer, {
      props: { data: {} },
    })

    expect(wrapper.find('[data-testid="opportunities-empty-state"]').exists()).toBe(true)
  })
})

describe('ContentOpportunitiesRenderer — per-item insight actions (QA4-img31)', () => {
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

  function mountRenderer() {
    return mount(ContentOpportunitiesRenderer, {
      props: {
        data: {
          total_topics_found: 3,
          top_performing_content: [
            { title: 'Best serums 2026', snippet: 'A roundup', domain: 'example.com', url: 'https://example.com/a', query: 'best serums' },
          ],
          content_by_type: {
            guides: [
              { title: 'Vitamin C guide', snippet: 'Deep dive', domain: 'example.com', query: 'vitamin c' },
              { title: 'Retinol guide', snippet: 'Basics', domain: 'example.com', query: 'retinol' },
            ],
          },
          top_competing_domains: [{ domain: 'example.com', content_count: 4 }],
        },
      },
    })
  }

  it('renders one Add to Campaign / Generate Brief action pair per opportunity row (top content + by-type topics)', () => {
    const wrapper = mountRenderer()

    // 1 top-performing row + 2 by-type topic rows in the active "guides" tab.
    expect(wrapper.findAll('[data-testid="insight-add-btn"]')).toHaveLength(3)
    expect(wrapper.findAll('[data-testid="insight-brief-btn"]')).toHaveLength(3)
  })

  it('clicking Add to Campaign opens the campaign picker and saves the item with the opportunities mapping', async () => {
    const wrapper = mountRenderer()

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
    // Opportunity items are scraped top-performing content, so they save with
    // the top_performers view and title / snippet (falling back to query).
    expect(insights[0]).toMatchObject({
      source: 'market',
      view: 'top_performers',
      title: 'Best serums 2026',
      snippet: 'A roundup',
    })
  })

  it('a parent-supplied #item-actions slot still replaces the built-in actions', () => {
    const wrapper = mount(ContentOpportunitiesRenderer, {
      props: {
        data: {
          total_topics_found: 1,
          top_performing_content: [{ title: 'Best serums 2026', snippet: 'A roundup' }],
        },
      },
      slots: { 'item-actions': `<div data-testid="custom-actions">Custom</div>` },
    })

    expect(wrapper.find('[data-testid="custom-actions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="insight-add-btn"]').exists()).toBe(false)
  })
})
