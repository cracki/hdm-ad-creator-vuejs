import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BrandContextPanel from './BrandContextPanel.vue'
import { resolveBrandContext, type BrandContext } from '@/features/campaigns/types'

// REAL backend shape (brand_services.build_brand_context / brand_core_analyzer):
// audience_summary is the full target_audience object ({primary, secondary});
// each segment has nested demographics/psychographics OBJECTS.
const primarySegment = {
  demographics: {
    age_range: '25-45',
    gender: 'mostly women',
    income_level: 'middle',
    occupation: 'Marketing managers',
  },
  psychographics: {
    interests: 'wellness and design',
    values: 'sustainability',
    buying_behavior: 'research-heavy',
  },
  pain_points: ['Choice overload', 'Greenwashing distrust'],
  motivations: ['Looking good', 'Living lighter'],
  summary: 'Trend-driven urban buyer.',
}

const context: BrandContext = {
  available: true,
  audience_summary: {
    primary: primarySegment,
    secondary: { description: 'Occasional gift buyers.' },
  },
  personas: [
    { segment: 'primary', ...primarySegment },
    { segment: 'secondary', description: 'Occasional gift buyers.' },
  ],
  services: ['Web Design', 'SEO'],
}

describe('BrandContextPanel', () => {
  it('renders persona cards with demographics/psychographics text and chips', () => {
    const wrapper = mount(BrandContextPanel, { props: { context } })

    expect(wrapper.find('[data-testid="brand-context-panel"]').exists()).toBe(true)

    const cards = wrapper.findAll('[data-testid="brand-context-personas"] > div')
    expect(cards.length).toBe(2)

    // Primary card: summary, flattened demographics/psychographics objects,
    // pain-point and motivation chips.
    expect(cards[0].text()).toContain('Trend-driven urban buyer.')
    expect(cards[0].text()).toContain('Demographics')
    expect(cards[0].text()).toContain('Age range: 25-45')
    expect(cards[0].text()).toContain('Occupation: Marketing managers')
    expect(cards[0].text()).toContain('Psychographics')
    expect(cards[0].text()).toContain('Interests: wellness and design')
    expect(cards[0].text()).toContain('Choice overload')
    expect(cards[0].text()).toContain('Looking good')
    // segment badges are localized primary/secondary labels
    expect(cards[0].text()).toContain('Primary')

    // Secondary card renders its description when it has no summary.
    expect(cards[1].text()).toContain('Secondary')
    expect(cards[1].text()).toContain('Occasional gift buyers.')

    const services = wrapper.find('[data-testid="brand-context-services"]')
    expect(services.text()).toContain('Web Design')
    expect(services.text()).toContain('SEO')
  })

  it('omits sections whose data is absent', () => {
    const wrapper = mount(BrandContextPanel, {
      props: { context: { available: true, audience_summary: null, personas: null, services: null } },
    })

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
