import { COUNTRIES } from '@/shared/data/countries'

export type CampaignStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type CampaignStepType = 'segmentation' | 'ppc_viability' | 'funnel' | 'content_strategy' | 'meta_ads' | 'google_ads' | 'linkedin_ads'
export type CampaignStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale'
export type CampaignAdPlatform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU'

export interface CampaignBrand {
  brand_uuid: string
  company_name: string
  website_url: string
  location: string | null
  selected_industry: { industry_uuid: string; name: string } | null
}

export interface Campaign {
  campaign_uuid: string
  brand: CampaignBrand | null
  brand_uuid?: string
  name: string
  status: CampaignStatus
  current_step: CampaignStepType
  total_budget: number | string | null
  currency: string
  segmentation_completed: boolean
  ppc_viability_completed: boolean
  funnel_completed: boolean
  content_strategy_completed: boolean
  meta_ads_completed: boolean
  google_ads_completed: boolean
  linkedin_ads_completed: boolean
  context_payload: Record<string, unknown>
  summary: Record<string, unknown>
  steps_count: number
  created_at: string
  updated_at: string
}

export interface CampaignCreatePayload {
  brand_uuid: string
  name?: string
  total_budget?: number
  currency?: string
  context_payload?: Record<string, unknown>
}

export interface CampaignStep {
  campaign_step_uuid: string
  campaign: string
  step_type: CampaignStepType
  status: CampaignStepStatus
  request_payload: Record<string, unknown>
  input_snapshot: Record<string, unknown>
  response_payload: Record<string, unknown>
  summary: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface CampaignAd {
  campaign_ad_uuid: string
  campaign: string
  platform: CampaignAdPlatform
  funnel_stage: string | null
  persona: string | null
  funnel_context: Record<string, unknown>
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AdsStrategyPayload {
  platform: CampaignAdPlatform
}

export interface GenerateAdPayload {
  persona_name: string
  funnel_stage: FunnelStage
  platform: CampaignAdPlatform
  quantity?: number
}

export interface GenerateVisualsPayload {
  ad_uuids: string[]
  aspect_ratio?: '1:1' | '2:3' | '3:2' | '4:7' | '7:4'
  quality?: 'auto' | 'low' | 'medium' | 'high'
}

export interface GeneratedVisual {
  campaign_ad_uuid: string
  platform: string | null
  persona: string | null
  funnel_stage: string | null
  aspect_ratio: string
  size: string
  quality: string
  visual_summary: string
  prompt: string
  success: boolean
  image_url: string | null
  revised_prompt: string | null
  error: string | null
}

export interface AdGenerateResult {
  success: boolean
  campaign: Campaign
  ads: CampaignAd[]
}

export interface VisualGenerateResult {
  success: boolean
  campaign: Campaign
  generated_count: number
  results: GeneratedVisual[]
}

export interface ClearAdsResult {
  success: boolean
  deleted_count: number
  campaign: Campaign
}

export interface SegmentationRunPayload {
  business_type?: string
  location?: string
  country?: string
  city?: string
  product_description?: string
  include_deep_research?: boolean
}

export interface StepResult {
  campaign: Campaign
  step: CampaignStep
}

export interface AdsStrategyRun {
  campaign_step_uuid: string
  step_type: 'meta_ads' | 'google_ads' | 'linkedin_ads'
  platform: CampaignAdPlatform
  status: CampaignStepStatus
  request_payload: Record<string, unknown>
  response_payload: Record<string, unknown>
  summary: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface AdsStrategyListResponse {
  success: boolean
  strategies: AdsStrategyRun[]
}

export function getCampaignProgress(campaign: Campaign): number {
  const baseFlags = [
    campaign.segmentation_completed,
    campaign.ppc_viability_completed,
    campaign.funnel_completed,
    campaign.content_strategy_completed,
  ]
  const ctx = campaign.context_payload as { selected_platforms?: string[] } | undefined
  const selectedPlatforms = ctx?.selected_platforms ?? []
  // Only count the platforms the user actually selected. If platform selection
  // hasn't happened yet, fall back to all platform flags so early-campaign
  // progress is unchanged (a partial-platform campaign can now reach 100%).
  const platformFlags = selectedPlatforms.length
    ? selectedPlatforms.map((p) => campaign[`${p}_ads_completed` as keyof Campaign])
    : [
        campaign.meta_ads_completed,
        campaign.google_ads_completed,
        campaign.linkedin_ads_completed,
      ]
  const flags = [...baseFlags, ...platformFlags]
  const completed = flags.filter(Boolean).length
  return Math.round((completed / flags.length) * 100)
}

export function areAllPlatformAdsComplete(campaign: Campaign): boolean {
  const ctx = campaign.context_payload as any
  const platforms: string[] = ctx?.selected_platforms ?? []
  if (platforms.length === 0) return false
  return platforms.every((p) => {
    const flag = `${p}_ads_completed` as keyof Campaign
    return campaign[flag]
  })
}

export function getCampaignStepStatuses(campaign: Campaign): Record<CampaignStepType, 'completed' | 'pending'> {
  return {
    segmentation: campaign.segmentation_completed ? 'completed' : 'pending',
    ppc_viability: campaign.ppc_viability_completed ? 'completed' : 'pending',
    funnel: campaign.funnel_completed ? 'completed' : 'pending',
    content_strategy: campaign.content_strategy_completed ? 'completed' : 'pending',
    meta_ads: campaign.meta_ads_completed ? 'completed' : 'pending',
    google_ads: campaign.google_ads_completed ? 'completed' : 'pending',
    linkedin_ads: campaign.linkedin_ads_completed ? 'completed' : 'pending',
  }
}

// ── Total budget + funnel split (F16) ─────────────────────

/** "USD 1,000" style display for a campaign's total budget; null when unset. */
export function formatCampaignBudget(campaign: Pick<Campaign, 'total_budget' | 'currency'>): string | null {
  const amount = Number(campaign.total_budget)
  if (campaign.total_budget == null || !Number.isFinite(amount)) return null
  return `${campaign.currency || 'USD'} ${amount.toLocaleString()}`
}

export interface FunnelBudgetSplitEntry {
  percent: number
  /** total_budget × percent / 100 — null when the campaign has no budget set. */
  amount: number | null
}

/**
 * Funnel-stage budget split from campaign.summary.funnel percentages
 * (tofu/mofu/bofu_budget_percentage). Null when the funnel step hasn't
 * produced a split yet.
 */
export function getFunnelBudgetSplit(
  campaign: Pick<Campaign, 'summary' | 'total_budget' | 'currency'>,
): Record<'tofu' | 'mofu' | 'bofu', FunnelBudgetSplitEntry> | null {
  const funnel = (campaign.summary as { funnel?: Record<string, unknown> } | undefined)?.funnel
  if (!funnel) return null
  const read = (key: string): number | null => {
    const raw = funnel[`${key}_budget_percentage`]
    const n = Number(raw)
    return raw != null && Number.isFinite(n) ? n : null
  }
  const tofu = read('tofu')
  const mofu = read('mofu')
  const bofu = read('bofu')
  if (tofu == null && mofu == null && bofu == null) return null
  const total = Number(campaign.total_budget)
  const hasTotal = campaign.total_budget != null && Number.isFinite(total)
  const entry = (percent: number | null): FunnelBudgetSplitEntry => ({
    percent: percent ?? 0,
    // A missing stage percent is treated as a 0% share; round to 2 decimals
    amount: hasTotal ? Math.round(total * (percent ?? 0)) / 100 : null,
  })
  return { tofu: entry(tofu), mofu: entry(mofu), bofu: entry(bofu) }
}

// ── Target market (country/city, F19) ─────────────────────

export interface TargetMarket {
  country: string
  city: string
}

/**
 * Initial country/city for the segmentation form: prefer the structured
 * target_market persisted by a previous run; otherwise best-effort seed the
 * country from the brand's free-text location.
 */
export function resolveTargetMarket(campaign: Pick<Campaign, 'context_payload' | 'brand'> | null | undefined): TargetMarket {
  const tm = (campaign?.context_payload as { target_market?: { country?: unknown; city?: unknown } } | undefined)?.target_market
  if (tm && typeof tm === 'object') {
    return {
      country: typeof tm.country === 'string' ? tm.country : '',
      city: typeof tm.city === 'string' ? tm.city : '',
    }
  }
  const brandLocation = campaign?.brand?.location
  if (brandLocation) {
    const match = COUNTRIES.find((c) => brandLocation.toLowerCase().includes(c.toLowerCase()))
    if (match) return { country: match, city: '' }
  }
  return { country: '', city: '' }
}

/** Compose the legacy free-text location ("City, Country") kept for display. */
export function composeLocation(tm: TargetMarket): string {
  const city = tm.city.trim()
  const country = tm.country.trim()
  if (city && country) return `${city}, ${country}`
  return city || country
}
