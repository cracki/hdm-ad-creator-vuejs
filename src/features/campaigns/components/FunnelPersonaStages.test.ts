import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FunnelPersonaStages from './FunnelPersonaStages.vue'

const WITH_FIELDS = [
  {
    stage: 'TOFU',
    name: 'Budget Buyer',
    title: 'Save more every day',
    description: 'Practical tips to cut costs',
    cta: 'Download the guide',
    kpi: 'CTR >= 2%',
    budget_share: 30,
  },
  {
    stage: 'BOFU',
    name: 'Budget Buyer',
    title: 'Best value',
    description: 'Compare plans side by side',
    cta: 'Start free trial',
    kpi: 'CPA <= $12',
    budget_share: 45,
  },
  {
    stage: 'TOFU',
    name: 'Premium Seeker',
    title: 'Elevate your routine',
    description: 'Premium quality without compromise',
    // older run: no additive fields
  },
]

const WITHOUT_FIELDS = [
  { stage: 'TOFU', name: 'Budget Buyer', title: 'Save more', description: 'Cut costs' },
]

function mountComponent(stages: unknown[]) {
  return mount(FunnelPersonaStages, { props: { stages } })
}

describe('FunnelPersonaStages', () => {
  it('renders one collapsed card per persona (details hidden by default)', () => {
    const wrapper = mountComponent(WITH_FIELDS)

    const cards = wrapper.findAll('[data-testid="funnel-persona-card"]')
    expect(cards.map((c) => c.find('.truncate').text())).toEqual(['Budget Buyer', 'Premium Seeker'])
    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-toggle"]').attributes('aria-expanded')).toBe('false')
  })

  it('shows the per stage CTA / KPI chips and budget_share badge after expanding', async () => {
    const wrapper = mountComponent(WITH_FIELDS)

    await wrapper.findAll('[data-testid="funnel-persona-toggle"]')[0].trigger('click')

    const details = wrapper.find('[data-testid="funnel-persona-details"]')
    expect(details.exists()).toBe(true)
    expect(wrapper.find('[data-testid="funnel-persona-toggle"]').attributes('aria-expanded')).toBe('true')

    const ctas = wrapper.findAll('[data-testid="funnel-persona-cta"]')
    const kpis = wrapper.findAll('[data-testid="funnel-persona-kpi"]')
    expect(ctas.map((c) => c.text())).toEqual([
      expect.stringContaining('Download the guide'),
      expect.stringContaining('Start free trial'),
    ])
    expect(kpis.map((c) => c.text())).toEqual([
      expect.stringContaining('CTR >= 2%'),
      expect.stringContaining('CPA <= $12'),
    ])

    const budgets = wrapper.findAll('[data-testid="funnel-persona-budget"]')
    expect(budgets.map((b) => b.text())).toEqual(['30%', '45%'])
  })

  it('sums the persona budget_share on the collapsed header badge', () => {
    const wrapper = mountComponent(WITH_FIELDS)

    const badge = wrapper.findAll('[data-testid="funnel-persona-card"]')[0].find('.bg-primary\\/10')
    expect(badge.text()).toBe('Budget share 75%')
  })

  it('hides the additive chips for personas whose run predates them', async () => {
    const wrapper = mountComponent(WITH_FIELDS)

    // expand the persona WITHOUT the additive fields
    await wrapper.findAll('[data-testid="funnel-persona-toggle"]')[1].trigger('click')

    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-kpi"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-budget"]').exists()).toBe(false)
    // the expanded persona's header shows no percent badge either
    const olderCard = wrapper.findAll('[data-testid="funnel-persona-card"]')[1]
    expect(olderCard.find('.bg-primary\\/10').exists()).toBe(false)
  })

  it('renders nothing chip-wise when no stage carries the additive fields', () => {
    const wrapper = mountComponent(WITHOUT_FIELDS)

    expect(wrapper.findAll('[data-testid="funnel-persona-card"]').length).toBe(1)
    expect(wrapper.find('[data-testid="funnel-persona-cta"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-kpi"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="funnel-persona-budget"]').exists()).toBe(false)
  })

  it('collapses an expanded card again on second toggle', async () => {
    const wrapper = mountComponent(WITH_FIELDS)

    const toggleBtn = wrapper.findAll('[data-testid="funnel-persona-toggle"]')[0]
    await toggleBtn.trigger('click')
    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(true)
    await toggleBtn.trigger('click')
    expect(wrapper.find('[data-testid="funnel-persona-details"]').exists()).toBe(false)
  })
})
