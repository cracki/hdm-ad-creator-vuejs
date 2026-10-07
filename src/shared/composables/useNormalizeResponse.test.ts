import { describe, it, expect } from 'vitest'
import { useNormalizeResponse } from './useNormalizeResponse'

/**
 * Contract tests for the ads-strategy normalizer, pinned down by the
 * AdsStrategyRenderer targeting fix (QA4-new4): the backend guarantees a
 * `targeting` object on every funnel_campaign, while Meta campaigns also
 * carry a legacy `audience`. The normalizer must keep `targeting` intact
 * (unknown keys pass through untouched) so the renderer can pick the
 * source with real content via `audience ?? audience_targeting ?? targeting`.
 */

const fullTargeting = {
  audience_summary: 'Urban professionals interested in wellness',
  age_range: '28-45',
  locations: ['Dubai'],
  interests: ['fitness'],
  exclusions: [],
}

describe('useNormalizeResponse — ads-strategy', () => {
  const { normalize } = useNormalizeResponse()

  it('aliases legacy audience keys onto audience_targeting', () => {
    const result = normalize(
      { funnel_campaigns: [{ audience: { type: 'Custom audience', details: ['lookalike 1%'] } }] },
      'ads-strategy',
    )
    const camp = (result.funnel_campaigns as Record<string, unknown>[])[0]
    expect(camp).toMatchObject({
      audience_targeting: { type: 'Custom audience', details: ['lookalike 1%'] },
    })
    expect(camp).not.toHaveProperty('audience')
  })

  it('passes the backend `targeting` object through untouched', () => {
    const result = normalize(
      { funnel_campaigns: [{ targeting: fullTargeting }] },
      'ads-strategy',
    )
    const camp = (result.funnel_campaigns as Record<string, unknown>[])[0]
    expect(camp).toMatchObject({ targeting: fullTargeting })
  })

  it('keeps `targeting` alongside the aliased empty `audience` (Meta-style payload)', () => {
    const result = normalize(
      { funnel_campaigns: [{ audience: {}, targeting: fullTargeting }] },
      'ads-strategy',
    )
    const camp = (result.funnel_campaigns as Record<string, unknown>[])[0]
    expect(camp).toMatchObject({
      audience_targeting: {},
      targeting: fullTargeting,
    })
    expect(camp).not.toHaveProperty('audience')
  })

  it('still applies top-level and nested aliases', () => {
    const result = normalize(
      {
        campaigns: [
          {
            name: 'Retargeting',
            bidding: 'Maximize Conversions',
            budget_allocation_percent: 40,
          },
        ],
      },
      'ads-strategy',
    )
    expect(result).toMatchObject({
      funnel_campaigns: [
        { campaign_name: 'Retargeting', bidding_strategy: 'Maximize Conversions', budget_percent: 40 },
      ],
    })
  })

  it('unwraps a nested data layer before normalizing', () => {
    const result = normalize(
      { data: { campaigns: [{ name: 'TOFU push' }] }, success: true },
      'ads-strategy',
    )
    expect(result).toMatchObject({
      success: true,
      funnel_campaigns: [{ campaign_name: 'TOFU push' }],
    })
  })
})
