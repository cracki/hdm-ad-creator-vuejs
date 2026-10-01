import { describe, it, expect } from 'vitest'
import {
  getCampaignProgress,
  areAllPlatformAdsComplete,
  formatCampaignBudget,
  getFunnelBudgetSplit,
  resolveTargetMarket,
  composeLocation,
  type Campaign,
} from './types'

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'test-uuid',
    brand: null,
    name: 'Test Campaign',
    status: 'in_progress',
    current_step: 'segmentation',
    language: 'en',
    total_budget: null,
    currency: 'USD',
    segmentation_completed: false,
    ppc_viability_completed: false,
    funnel_completed: false,
    content_strategy_completed: false,
    meta_ads_completed: false,
    google_ads_completed: false,
    linkedin_ads_completed: false,
    context_payload: {},
    summary: {},
    steps_count: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Campaign
}

describe('getCampaignProgress', () => {
  it('returns 0 when no steps are completed', () => {
    expect(getCampaignProgress(buildCampaign())).toBe(0)
  })

  it('returns 100 when every step flag is completed', () => {
    expect(
      getCampaignProgress(
        buildCampaign({
          segmentation_completed: true,
          ppc_viability_completed: true,
          funnel_completed: true,
          content_strategy_completed: true,
          meta_ads_completed: true,
          google_ads_completed: true,
          linkedin_ads_completed: true,
        }),
      ),
    ).toBe(100)
  })

  it('returns 100 for a partial-platform campaign whose selected platforms are all done', () => {
    expect(
      getCampaignProgress(
        buildCampaign({
          segmentation_completed: true,
          ppc_viability_completed: true,
          funnel_completed: true,
          content_strategy_completed: true,
          context_payload: { selected_platforms: ['meta'] },
          meta_ads_completed: true,
        }),
      ),
    ).toBe(100)
  })

  it('caps below 100 when a selected platform ad is not completed', () => {
    const result = getCampaignProgress(
      buildCampaign({
        segmentation_completed: true,
        ppc_viability_completed: true,
        funnel_completed: true,
        content_strategy_completed: true,
        context_payload: { selected_platforms: ['meta', 'google'] },
        meta_ads_completed: true,
        google_ads_completed: false,
      }),
    )
    // 5 of 6 required steps (4 base + meta) done
    expect(result).toBe(83)
  })

  it('falls back to all platform flags when none are selected', () => {
    expect(
      getCampaignProgress(
        buildCampaign({
          segmentation_completed: true,
          ppc_viability_completed: true,
          funnel_completed: true,
          content_strategy_completed: true,
          meta_ads_completed: true,
        }),
      ),
    ).toBe(71) // 5 of 7
  })
})

describe('areAllPlatformAdsComplete', () => {
  it('returns false when no platforms are selected', () => {
    expect(areAllPlatformAdsComplete(buildCampaign())).toBe(false)
  })

  it('returns true when every selected platform is completed', () => {
    expect(
      areAllPlatformAdsComplete(
        buildCampaign({
          context_payload: { selected_platforms: ['meta'] },
          meta_ads_completed: true,
        }),
      ),
    ).toBe(true)
  })

  it('returns false when a selected platform is not completed', () => {
    expect(
      areAllPlatformAdsComplete(
        buildCampaign({
          context_payload: { selected_platforms: ['meta', 'google'] },
          meta_ads_completed: true,
          google_ads_completed: false,
        }),
      ),
    ).toBe(false)
  })
})

describe('formatCampaignBudget (F16)', () => {
  it('returns null when no budget is set', () => {
    expect(formatCampaignBudget(buildCampaign())).toBeNull()
    expect(formatCampaignBudget(buildCampaign({ total_budget: 'not-a-number' }))).toBeNull()
  })

  it('formats amount and currency for numeric and string decimals', () => {
    expect(formatCampaignBudget(buildCampaign({ total_budget: 250 }))).toBe('USD 250')
    expect(formatCampaignBudget(buildCampaign({ total_budget: '250', currency: 'AED' }))).toBe('AED 250')
  })

  it('falls back to USD when currency is blank', () => {
    expect(formatCampaignBudget(buildCampaign({ total_budget: 250, currency: '' }))).toBe('USD 250')
  })
})

describe('getFunnelBudgetSplit (F16)', () => {
  const funnelSummary = {
    tofu_budget_percentage: 40,
    mofu_budget_percentage: 35,
    bofu_budget_percentage: 25,
  }

  it('returns null when the funnel step produced no split', () => {
    expect(getFunnelBudgetSplit(buildCampaign())).toBeNull()
    expect(getFunnelBudgetSplit(buildCampaign({ summary: { funnel: {} } }))).toBeNull()
  })

  it('computes per-stage amounts from total_budget × percent', () => {
    const split = getFunnelBudgetSplit(
      buildCampaign({ total_budget: 1000, summary: { funnel: funnelSummary } }),
    )
    expect(split).not.toBeNull()
    expect(split!.tofu).toEqual({ percent: 40, amount: 400 })
    expect(split!.mofu).toEqual({ percent: 35, amount: 350 })
    expect(split!.bofu).toEqual({ percent: 25, amount: 250 })
  })

  it('returns percents with null amounts when no budget is set', () => {
    const split = getFunnelBudgetSplit(buildCampaign({ summary: { funnel: funnelSummary } }))
    expect(split!.tofu).toEqual({ percent: 40, amount: null })
    expect(split!.bofu).toEqual({ percent: 25, amount: null })
  })

  it('treats a missing stage percent as 0', () => {
    const split = getFunnelBudgetSplit(
      buildCampaign({
        total_budget: 200,
        summary: { funnel: { tofu_budget_percentage: 50, mofu_budget_percentage: 50 } },
      }),
    )
    expect(split!.bofu).toEqual({ percent: 0, amount: 0 })
  })
})

describe('resolveTargetMarket (F19)', () => {
  it('returns empty strings when nothing is known', () => {
    expect(resolveTargetMarket(buildCampaign())).toEqual({ country: '', city: '' })
    expect(resolveTargetMarket(null)).toEqual({ country: '', city: '' })
  })

  it('prefers the persisted context_payload.target_market', () => {
    expect(
      resolveTargetMarket(
        buildCampaign({
          brand: { brand_uuid: 'b1', company_name: 'L', website_url: '', location: 'Germany', selected_industry: null },
          context_payload: { target_market: { country: 'Oman', city: 'Muscat' } },
        }),
      ),
    ).toEqual({ country: 'Oman', city: 'Muscat' })
  })

  it('best-effort seeds the country from the brand free-text location', () => {
    expect(
      resolveTargetMarket(
        buildCampaign({
          brand: { brand_uuid: 'b1', company_name: 'L', website_url: '', location: 'Dubai, United Arab Emirates', selected_industry: null },
        }),
      ),
    ).toEqual({ country: 'United Arab Emirates', city: '' })
  })

  it('leaves the country empty when the brand location matches no known country', () => {
    expect(
      resolveTargetMarket(
        buildCampaign({
          brand: { brand_uuid: 'b1', company_name: 'L', website_url: '', location: 'Narnia', selected_industry: null },
        }),
      ),
    ).toEqual({ country: '', city: '' })
  })
})

describe('composeLocation (F19)', () => {
  it('composes "City, Country" when both are set', () => {
    expect(composeLocation({ country: 'Oman', city: 'Muscat' })).toBe('Muscat, Oman')
  })

  it('falls back to whichever part exists', () => {
    expect(composeLocation({ country: 'Oman', city: '' })).toBe('Oman')
    expect(composeLocation({ country: '', city: 'Muscat' })).toBe('Muscat')
    expect(composeLocation({ country: '', city: '' })).toBe('')
  })
})

describe('funnel additive field readers (QA round 3)', () => {
  it('readFunnelTextField accepts strings and { text } objects, null otherwise', async () => {
    const { readFunnelTextField } = await import('./types')
    expect(readFunnelTextField('Start free trial')).toBe('Start free trial')
    expect(readFunnelTextField({ text: 'Book a demo' })).toBe('Book a demo')
    expect(readFunnelTextField({ value: 'Book a demo' })).toBe('Book a demo')
    expect(readFunnelTextField('')).toBeNull()
    expect(readFunnelTextField('   ')).toBeNull()
    expect(readFunnelTextField(undefined)).toBeNull()
    expect(readFunnelTextField({ other: 1 })).toBeNull()
    expect(readFunnelTextField(42)).toBeNull()
  })

  it('readFunnelBudgetShare accepts 0-100 numbers/strings, null otherwise', async () => {
    const { readFunnelBudgetShare } = await import('./types')
    expect(readFunnelBudgetShare(30)).toBe(30)
    expect(readFunnelBudgetShare(0)).toBe(0)
    expect(readFunnelBudgetShare('45')).toBe(45)
    expect(readFunnelBudgetShare(-1)).toBeNull()
    expect(readFunnelBudgetShare(101)).toBeNull()
    expect(readFunnelBudgetShare('abc')).toBeNull()
    expect(readFunnelBudgetShare(null)).toBeNull()
    expect(readFunnelBudgetShare(undefined)).toBeNull()
  })
})
