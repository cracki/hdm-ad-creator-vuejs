import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PersonalityCards from './PersonalityCards.vue'
import TakeawayCards from './TakeawayCards.vue'
import BrandRadarChart from './BrandRadarChart.vue'
import BrandWheel from './BrandWheel.vue'
import type { PersonalityData } from './personality'

// jsdom has no canvas — mock the ECharts wrapper for mount-level assertions.
vi.mock('vue-echarts', () => ({ default: { name: 'VChart', template: '<div />' } }))

const personality: PersonalityData = {
  archetype: 'Caregiver',
  tone: 'warm and clinical',
  persona: 'supportive expert',
  writingStyle: 'short, reassuring sentences',
  emojiStyle: 'minimal',
  voiceAttributes: ['reassuring', 'precise', 'calm'],
}

describe('PersonalityCards', () => {
  it('renders the archetype hero card, attribute cards and voice chips', () => {
    const wrapper = mount(PersonalityCards, { props: { data: personality } })
    expect(wrapper.find('[data-testid="personality-archetype"]').text()).toContain('Caregiver')
    expect(wrapper.findAll('[data-testid="personality-card"]').length).toBe(3)
    expect(wrapper.findAll('[data-testid="voice-attribute-chip"]').map((c) => c.text()))
      .toEqual(['reassuring', 'precise', 'calm'])
  })

  it('renders only the cards whose fields exist', () => {
    const wrapper = mount(PersonalityCards, {
      props: { data: { ...personality, persona: '', writingStyle: '', voiceAttributes: [] } },
    })
    expect(wrapper.findAll('[data-testid="personality-card"]').length).toBe(1)
    expect(wrapper.find('[data-testid="voice-attribute-chip"]').exists()).toBe(false)
  })
})

describe('TakeawayCards', () => {
  beforeEach(() => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
  })

  it('renders one card per takeaway with a copy button', () => {
    const wrapper = mount(TakeawayCards, { props: { items: ['First insight', 'Second insight'] } })
    expect(wrapper.findAll('[data-testid="takeaway-card"]').length).toBe(2)
    expect(wrapper.findAll('[data-testid="takeaway-copy"]').length).toBe(2)
  })

  it('copies the takeaway text to the clipboard', async () => {
    const wrapper = mount(TakeawayCards, { props: { items: ['First insight'] } })
    await wrapper.find('[data-testid="takeaway-copy"]').trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('First insight')
  })
})

describe('BrandRadarChart / BrandWheel', () => {
  it('mounts the radar with dimension data', () => {
    const wrapper = mount(BrandRadarChart, {
      props: {
        dimensions: [
          { name: 'warmth', value: 82 },
          { name: 'authority', value: 45 },
          { name: 'trust', value: 90 },
        ],
      },
    })
    expect(wrapper.find('[data-testid="brand-radar"]').exists()).toBe(true)
  })

  it('mounts the wheel with trait shares', () => {
    const wrapper = mount(BrandWheel, {
      props: {
        shares: [
          { name: 'Care', percent: 20 },
          { name: 'Support', percent: 20 },
          { name: 'Warmth', percent: 20 },
          { name: 'Protection', percent: 20 },
          { name: 'Generosity', percent: 20 },
        ],
      },
    })
    expect(wrapper.find('[data-testid="brand-wheel"]').exists()).toBe(true)
  })
})
