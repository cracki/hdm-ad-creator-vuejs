import { describe, it, expect } from 'vitest'
import {
  getCampaignProgress,
  getCampaignStepCounts,
  areAllPlatformAdsComplete,
  formatCampaignBudget,
  getFunnelBudgetSplit,
  getPlatformBudgetShares,
  getStrategyBudgetSplit,
  ppcServiceList,
  ppcServiceDetailRows,
  resolveTargetMarket,
  composeLocation,
  type Campaign,
  campaignSelectedServices,
  splitPpcServicesBySelected,
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

// ── Selected-only primary service cards (QA round 3 fix 4) ──
describe('campaignSelectedServices + splitPpcServicesBySelected (QA r3 fix 4)', () => {
  const rows = [
    { service: 'Implants', bpc_score: 72 },
    { service: 'Landing Pages', bpc_score: 40 },
    { service: 'Consulting', bpc_score: 55 },
  ]
  it('reads the trimmed selected_services list from context_payload', () => {
    expect(campaignSelectedServices({ context_payload: { selected_services: [' Implants ', 'Consulting', 42, null] } }))
      .toEqual(['Implants', 'Consulting'])
    expect(campaignSelectedServices({ context_payload: {} })).toEqual([])
    expect(campaignSelectedServices(null)).toEqual([])
  })
  it('makes the selected services the primary cards, case-insensitive on name', () => {
    const { primary, others } = splitPpcServicesBySelected(rows, ['implants', 'Consulting'])
    expect(primary.map((r) => r.service)).toEqual(['Implants', 'Consulting'])
    expect(others.map((r) => r.service)).toEqual(['Landing Pages'])
  })
  it('keeps unmatched selections as name-only primary cards', () => {
    const { primary, others } = splitPpcServicesBySelected(rows, ['Whitening'])
    expect(primary).toEqual([{ name: 'Whitening' }])
    expect(others).toHaveLength(3)
  })
  it('returns everything as primary (nothing collapsed) with no selection', () => {
    const { primary, others } = splitPpcServicesBySelected(rows, [])
    expect(primary).toBe(rows)
    expect(others).toEqual([])
  })
})

// ── PPC service budget share (QA4-img14) ──
describe('ppcServiceList budget share (QA4-img14)', () => {
  it('attaches the normalized budgetShare from budget_share and the budget_share_percent alias', () => {
    const rows = ppcServiceList({
      brand_trust_analysis: {
        services_bpc_scores: [
          { service: 'Implants', bpc_score: 72, budget_share: 23 },
          { service: 'Whitening', bpc_score: 55, budget_share_percent: '45.5' },
        ],
      },
    })
    expect(rows.map((r) => r.budgetShare)).toEqual([23, 45.5])
  })

  it('omits budgetShare when no share key is present or the value is invalid', () => {
    const rows = ppcServiceList({
      brand_trust_analysis: {
        services_bpc_scores: [{ service: 'A' }, { service: 'B', budget_share: 140 }],
      },
    })
    expect(rows.map((r) => r.budgetShare)).toEqual([undefined, undefined])
  })

  it('keeps a blueprint budget_share after merging and still shows a 0 share', () => {
    const rows = ppcServiceList({
      brand_trust_analysis: {
        services_bpc_scores: [{ service: 'Implants' }, { service: 'Consulting', budget_share: 0 }],
      },
      strategic_prioritization: {
        ppc_blueprints: [{ service: 'Implants', budget_share: 30, key_risk: 'High CPC' }],
      },
    })
    expect(rows.map((r) => r.budgetShare)).toEqual([30, 0])
  })
})

describe('ppcServiceDetailRows budget share (QA4-img14)', () => {
  it('adds a localized budget-share row right after the budget row', () => {
    const rows = ppcServiceDetailRows({ budget_allocation: '60% of budget', budget_share: 23 })
    const labels = rows.map((r) => r.labelKey)
    expect(labels).toContain('ppc.budgetShareRow')
    expect(labels.indexOf('ppc.budgetShareRow')).toBe(labels.indexOf('ppc.detail.budget') + 1)
    expect(rows[labels.indexOf('ppc.budgetShareRow')].text).toBe('23%')
  })

  it('adds no budget-share row when the service has no share', () => {
    const rows = ppcServiceDetailRows({ budget_allocation: '60%' })
    expect(rows.map((r) => r.labelKey)).not.toContain('ppc.budgetShareRow')
  })
})

// ── Strategy budget split payload tolerance (QA4-img27) ──
describe('getStrategyBudgetSplit payload tolerance (QA4-img27)', () => {
  const funnel = [
    { funnel_stage: 'TOFU', budget_percent: 40 },
    { funnel_stage: 'MOFU', budget_percent: 35 },
    { funnel_stage: 'BOFU', budget_percent: 25 },
  ]
  const expected = {
    byStage: { tofu: 40, mofu: 35, bofu: 25 },
    byPlatform: [{ platform: 'meta', share: 100 }],
  }

  it('reads funnel_campaigns directly off response_payload', () => {
    expect(
      getStrategyBudgetSplit([{ platform: 'meta', response_payload: { funnel_campaigns: funnel } }], null),
    ).toEqual(expected)
  })

  it('reads funnel_campaigns nested under response_payload.data', () => {
    expect(
      getStrategyBudgetSplit([{ platform: 'meta', response_payload: { data: { funnel_campaigns: funnel } } }], null),
    ).toEqual(expected)
  })

  it('weights stages by the recommended budget_share map (casing-tolerant stages)', () => {
    const campaign = buildCampaign({
      context_payload: { platform_recommendations: { budget_share: { meta: 60, google: 40 } } },
    })
    const split = getStrategyBudgetSplit(
      [
        {
          platform: 'meta',
          response_payload: {
            funnel_campaigns: [
              { funnel_stage: 'TOFU', budget_percent: 20 },
              { funnel_stage: 'MOFU', budget_percent: 17 },
              { funnel_stage: 'BoFu', budget_percent: 63 },
            ],
          },
        },
        {
          platform: 'google',
          response_payload: {
            data: {
              funnel_campaigns: [
                { funnel_stage: 'TOFU', budget_percent: 15 },
                { funnel_stage: 'MOFU', budget_percent: 20 },
                { funnel_stage: 'BoFu', budget_percent: 65 },
              ],
            },
          },
        },
      ],
      getPlatformBudgetShares(campaign),
    )
    expect(split).not.toBeNull()
    expect(split!.byStage.bofu).toBe(63.8) // 0.6 × 63 + 0.4 × 65
    expect(split!.byPlatform).toHaveLength(2)
    expect(split!.byPlatform).toEqual([
      { platform: 'meta', share: 60 },
      { platform: 'google', share: 40 },
    ])
  })

  it('returns null when no strategy carries funnel data', () => {
    expect(getStrategyBudgetSplit([], null)).toBeNull()
    expect(getStrategyBudgetSplit([{ platform: 'meta', response_payload: {} }], null)).toBeNull()
    expect(
      getStrategyBudgetSplit([{ platform: 'meta', response_payload: { data: { campaign_overview: {} } } }], null),
    ).toBeNull()
  })
})

// ── Optional review-flow flags (QA4-img29/new5) ──
describe('getCampaignStepCounts optional flags (QA4-img29/new5)', () => {
  it('counts the ad_generation/visual/review flags when the serializer exposes them (9 total mid-work)', () => {
    const counts = getCampaignStepCounts(
      buildCampaign({
        context_payload: { selected_platforms: ['meta', 'google'] },
        ad_generation_completed: true,
        visual_completed: false,
        review_completed: false,
      }),
    )
    // 4 base + 2 selected platforms + 3 new flags = 9; only ad_generation done → 1
    expect(counts).toEqual({ completed: 1, total: 9 })
  })

  it('includes all three flags as soon as any one of them is defined', () => {
    const counts = getCampaignStepCounts(
      buildCampaign({
        context_payload: { selected_platforms: ['meta', 'google'] },
        ad_generation_completed: false,
      }),
    )
    expect(counts.total).toBe(9)
  })

  it('keeps the backward-compatible total when the flags are absent', () => {
    const counts = getCampaignStepCounts(
      buildCampaign({ context_payload: { selected_platforms: ['meta', 'google'] } }),
    )
    expect(counts).toEqual({ completed: 0, total: 6 })
  })

  it('still reaches 100% progress when every counted flag (including the new ones) is done', () => {
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
          ad_generation_completed: true,
          visual_completed: true,
          review_completed: true,
        }),
      ),
    ).toBe(100)
  })
})
