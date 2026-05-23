export type CampaignStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
export type CampaignStepType = 'segmentation' | 'ppc_viability' | 'funnel' | 'content_strategy' | 'meta_ads' | 'google_ads' | 'linkedin_ads'
export type CampaignStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'stale'
export type CampaignAdPlatform = 'meta' | 'google' | 'linkedin'
export type FunnelStage = 'TOFU' | 'MOFU' | 'BOFU'

export interface CampaignBrand {
  brand_uuid: string
  company_name: string
  website_url: string
  selected_industry: { industry_uuid: string; name: string } | null
}

export interface Campaign {
  campaign_uuid: string
  brand: CampaignBrand | null
  brand_uuid?: string
  name: string
  status: CampaignStatus
  current_step: CampaignStepType
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
  aspect_ratio?: '1:1' | '9:16' | '16:9' | '4:5'
  quality?: 'standard' | 'hd'
  style?: 'natural' | 'vivid'
}

export interface GeneratedVisual {
  campaign_ad_uuid: string
  platform: string | null
  persona: string | null
  funnel_stage: string | null
  aspect_ratio: string
  size: string
  quality: string
  style: string
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
  const flags = [
    campaign.segmentation_completed,
    campaign.ppc_viability_completed,
    campaign.funnel_completed,
    campaign.content_strategy_completed,
    campaign.meta_ads_completed,
    campaign.google_ads_completed,
    campaign.linkedin_ads_completed,
  ]
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
