import { describe, it, expect } from 'vitest'
import {
  getCampaignProgress,
  areAllPlatformAdsComplete,
  type Campaign,
} from './types'

function buildCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    campaign_uuid: 'test-uuid',
    brand: null,
    name: 'Test Campaign',
    status: 'in_progress',
    current_step: 'segmentation',
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
