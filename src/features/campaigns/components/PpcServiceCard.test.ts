import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PpcServiceCard from './PpcServiceCard.vue'

function mountCard(svc: Record<string, unknown>, expanded = false) {
  return mount(PpcServiceCard, { props: { svc, idx: 0, expanded } })
}

describe('PpcServiceCard — budget share badge (QA4-img14)', () => {
  it('shows the budget-share badge when the service carries budget_share', () => {
    const wrapper = mountCard({ name: 'Implants', budget_share: 23, bpc_score: 72 })

    const badge = wrapper.find('[data-testid="ppc-budget-share"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('Budget share 23%')
  })

  it('accepts the budget_share_percent alias and string values', () => {
    const wrapper = mountCard({ name: 'Implants', budget_share_percent: '45.5' })

    expect(wrapper.find('[data-testid="ppc-budget-share"]').text()).toBe('Budget share 45.5%')
  })

  it('renders a 0% share instead of hiding the badge', () => {
    const wrapper = mountCard({ name: 'Consulting', budget_share: 0 })

    expect(wrapper.find('[data-testid="ppc-budget-share"]').text()).toBe('Budget share 0%')
  })

  it('omits the badge when no budget share is present', () => {
    const wrapper = mountCard({ name: 'Landing Pages', bpc_score: 40 })

    expect(wrapper.find('[data-testid="ppc-budget-share"]').exists()).toBe(false)
  })

  it('omits the badge for invalid shares outside 0-100', () => {
    const wrapper = mountCard({ name: 'Landing Pages', budget_share: 140 })

    expect(wrapper.find('[data-testid="ppc-budget-share"]').exists()).toBe(false)
  })

  it('keeps the score badge beside the budget-share badge', () => {
    const wrapper = mountCard({ name: 'Implants', budget_share: 23, bpc_score: 72 })

    expect(wrapper.find('[data-testid="ppc-budget-share"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('72')
  })
})
