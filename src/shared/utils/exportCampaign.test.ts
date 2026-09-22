import { describe, it, expect } from 'vitest'
import { formatBudgetAllocation } from './exportCampaign'

describe('formatBudgetAllocation (F16)', () => {
  it('renders a structured platform→percent dict sorted by share', () => {
    expect(
      formatBudgetAllocation({ meta: 40, google: 40, linkedin: 20 }),
    ).toBe('Google 40% · Meta 40% · LinkedIn 20%')
  })

  it('capitalizes unknown platform keys', () => {
    expect(formatBudgetAllocation({ tiktok: 100 })).toBe('Tiktok 100%')
  })

  it('passes legacy string values through unchanged', () => {
    expect(formatBudgetAllocation('60% search / 40% social')).toBe('60% search / 40% social')
  })

  it('returns an empty string for missing or non-numeric junk', () => {
    expect(formatBudgetAllocation(undefined)).toBe('')
    expect(formatBudgetAllocation(null)).toBe('')
    expect(formatBudgetAllocation({})).toBe('')
    expect(formatBudgetAllocation({ google: 'n/a' })).toBe('')
    expect(formatBudgetAllocation([40, 40])).toBe('')
  })
})
