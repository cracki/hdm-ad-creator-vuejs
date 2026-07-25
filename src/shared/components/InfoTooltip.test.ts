import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import InfoTooltip from './InfoTooltip.vue'

describe('InfoTooltip', () => {
  it('renders the explanatory text in the DOM', () => {
    const wrapper = mount(InfoTooltip, { props: { text: 'Why this matters' } })
    expect(wrapper.find('[data-testid="info-tooltip-text"]').text()).toBe('Why this matters')
  })

  it('renders a focusable trigger button with the provided accessible label', () => {
    const wrapper = mount(InfoTooltip, { props: { text: 'x', label: 'More info' } })
    const btn = wrapper.find('button')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('aria-label')).toBe('More info')
  })

  it('defaults the accessible label when none is provided', () => {
    const wrapper = mount(InfoTooltip, { props: { text: 'x' } })
    expect(wrapper.find('button').attributes('aria-label')).toBe('More information')
  })
})
