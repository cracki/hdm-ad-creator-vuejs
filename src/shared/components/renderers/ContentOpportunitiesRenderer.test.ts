import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ContentOpportunitiesRenderer from './ContentOpportunitiesRenderer.vue'

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
