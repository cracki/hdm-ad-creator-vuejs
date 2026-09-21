import { COUNTRIES } from '@/shared/data/countries'

export type CampaignStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type CampaignStepType = 'segmentation' | 'ppc_viability' | 'funnel' | 'content_strategy' | 'meta_ads' | 'google_ads' | 'linkedin_ads'
export type CampaignStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale'
export type CampaignAdPlatform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU'
/** Output language for all campaign-generated content (B9/M-M28). */
export type CampaignLanguage = 'en' | 'fa' | 'ar'

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
  /** Output language echoed everywhere by the backend (default 'en'). */
  language: CampaignLanguage
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
  language?: CampaignLanguage
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
  /** Review decision persisted on the latest run ('' = not reviewed yet). */
  review_status?: 'approved' | 'rejected' | ''
  reject_reason?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}

export type CampaignAdReviewStatus = 'approved' | 'rejected'

export interface CampaignAd {
  campaign_ad_uuid: string
  campaign: string
  platform: CampaignAdPlatform
  funnel_stage: string | null
  persona: string | null
  funnel_context: Record<string, unknown>
  data: Record<string, unknown>
  /** Review decision persisted server-side on data; null = not reviewed yet. */
  review_status: CampaignAdReviewStatus | null
  reject_reason: string | null
  reviewed_at: string | null
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

export type VisualAspectRatio = '1:1' | '2:3' | '3:2' | '4:7' | '7:4'
export type VisualQuality = 'auto' | 'low' | 'medium' | 'high'
export type VisualStatus = 'completed' | 'failed'

export interface GenerateVisualsPayload {
  ad_uuids: string[]
  aspect_ratio?: VisualAspectRatio
  quality?: VisualQuality
}

export interface GeneratedVisual {
  campaign_ad_uuid: string
  platform: string | null
  persona: string | null
  funnel_stage: string | null
  visual_id?: string
  aspect_ratio: string
  size: string
  quality: string
  visual_summary: string
  prompt?: string
  success: boolean
  visual_status: VisualStatus
  image_url: string | null
  content_type?: string | null
  file_size?: number
  generated_at?: string | null
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

/** GET /campaigns/{uuid}/visuals/ — every persisted visual (success + failure). */
export interface CampaignVisualsListResult {
  success: boolean
  results: GeneratedVisual[]
}

export interface ClearAdsResult {
  success: boolean
  deleted_count: number
  campaign: Campaign
}

// ── Ad review / manual edit / refine (F13) ────────────────

export interface ReviewAdPayload {
  decision: 'approved' | 'rejected'
  /** Required when decision is "rejected"; must be absent when "approved". */
  reject_reason?: string
}

/** Manual copy edit (AdCopyEditor) — any subset, values must be non-blank. */
export interface PatchAdPayload {
  headline?: string
  primary_text?: string
  description?: string
  cta?: string
}

export interface RefineAdPayload {
  feedback: string
}

export interface CampaignAdsListResult {
  success: boolean
  ads: CampaignAd[]
}

export interface AdReviewResult {
  success: boolean
  ad: CampaignAd
}

export interface AdUpdateResult {
  success: boolean
  ad: CampaignAd
}

export interface AdRefineResult {
  success: boolean
  campaign: Campaign
  ad: CampaignAd
  ads: CampaignAd[]
}

export interface StepApproveResult {
  success: boolean
  campaign: Campaign
  step: CampaignStep
}

// ── Step review / refine (reject + feedback re-run) ────────

/** Body of POST /campaigns/{uuid}/steps/{step_type}/review/. */
export interface StepReviewPayload {
  decision: 'approved' | 'rejected'
  /** Required when decision is "rejected"; must be absent/empty when "approved". */
  reject_reason?: string
}

export interface StepReviewResult {
  success: boolean
  step: CampaignStep
}

/** Optional refinement feedback accepted by every step run endpoint (≤1000 chars). */
export interface StepRefineOptions {
  refinement_feedback?: string
}

export interface SegmentationRunPayload {
  business_type?: string
  location?: string
  country?: string
  city?: string
  product_description?: string
  include_deep_research?: boolean
  refinement_feedback?: string
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

// ── Ad copy reading (F13) ─────────────────────────────────

export interface AdCopyView {
  headline: string
  body: string
  description: string
  cta: string
  framework: string
  score: number
}

/**
 * Read displayable copy off a CampaignAd's data. Key aliases across the LLM
 * providers (headline|title, body|primary_text, cta|call_to_action) are
 * resolved with the manual-edit keys FIRST: once an ad is PATCHed, its
 * primary_text key holds the newest copy while a stale body lingers.
 */
export function getAdCopy(ad: Pick<CampaignAd, 'data'>): AdCopyView {
  const d = (ad.data ?? {}) as Record<string, unknown>
  const str = (v: unknown): string => (typeof v === 'string' ? v : '')
  return {
    headline: str(d.headline) || str(d.title),
    body: str(d.primary_text) || str(d.body) || str(d.description),
    description: str(d.description),
    cta: str(d.cta) || str(d.call_to_action),
    framework: str(d.framework) || str(d.creative_framework),
    score: Number(d.score ?? d.quality_score ?? 0) || 0,
  }
}
