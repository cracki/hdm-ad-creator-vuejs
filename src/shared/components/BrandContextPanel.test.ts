import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandContextPanel from './BrandContextPanel.vue'
import { resolveBrandContext, type BrandContext } from '@/features/campaigns/types'

const context: BrandContext = {
  available: true,
  audience_summary: {
    summary: 'Eco-conscious urban shoppers aged 25-40.',
    pain_points: ['High prices', 'Slow shipping'],
    motivations: ['Sustainability', 'Status'],
  },
  personas: [
    {
      segment: 'primary',
      demographics: 'Women 25-34',
      pain_points: ['Choice overload'],
      motivations: ['Looking good'],
      summary: 'Trend-driven buyer',
    },
    { segment: 'secondary', summary: 'Gift buyer' },
  ],
  services: ['Web Design', 'SEO'],
}

describe('BrandContextPanel', () => {
  it('renders audience summary, persona cards and services', () => {
    const wrapper = mount(BrandContextPanel, { props: { context } })

    expect(wrapper.find('[data-testid="brand-context-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="brand-context-audience"]').text()).toContain('Eco-conscious urban shoppers')
    expect(wrapper.text()).toContain('High prices')
    expect(wrapper.text()).toContain('Sustainability')

    const cards = wrapper.findAll('[data-testid="brand-context-personas"] > div')
    expect(cards.length).toBe(2)
    expect(cards[0].text()).toContain('Trend-driven buyer')
    // segment badges are localized primary/secondary labels
    expect(cards[0].text()).toContain('Primary')
    expect(cards[1].text()).toContain('Secondary')

    const services = wrapper.find('[data-testid="brand-context-services"]')
    expect(services.text()).toContain('Web Design')
    expect(services.text()).toContain('SEO')
  })

  it('omits sections whose data is absent', () => {
    const wrapper = mount(BrandContextPanel, {
      props: { context: { available: true, audience_summary: null, personas: null, services: null } },
    })

    expect(wrapper.find('[data-testid="brand-context-audience"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brand-context-personas"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="brand-context-services"]').exists()).toBe(false)
  })
})

describe('resolveBrandContext (M-H8 visibility gate)', () => {
  it('returns the context only when available', () => {
    expect(resolveBrandContext({ brand_context: context })).toBe(context)
    expect(resolveBrandContext({ brand_context: { ...context, available: false } })).toBeNull()
    expect(resolveBrandContext({ brand_context: null })).toBeNull()
    expect(resolveBrandContext({})).toBeNull()
  })
})
