export interface FullFunnelPayload {
  brand_uuid: string
  personas: Record<string, unknown>[]
  platforms?: string[]
  budget?: number
  currency?: string
  duration_days?: number
  funnel_stages?: string[]
  ads_per_stage?: number
}

export interface FullFunnelResult {
  success: boolean
  campaign: Record<string, unknown>
}

export interface FunnelStageStrategy {
  stage: string
  objective: string
  psychology: string
  message_angle: string
  key_messages: string[]
  emotional_hooks: string[]
  creative_guidelines: { copy_style: string; visual_style: string }
  recommended_formats: string[]
  success_metrics: string[]
  budget_allocation_percent: number
}

export interface CoreStrategy {
  value_proposition: string
  brand_promise: string
  emotional_narrative: string
  content_pillars: string[]
}

export interface FunnelStrategies {
  tofu: FunnelStageStrategy
  mofu: FunnelStageStrategy
  bofu: FunnelStageStrategy
  core_strategy: CoreStrategy
  cross_platform_guidelines: Record<string, string>
}

export interface VisualConcept {
  style: string
  mood: string
  color_palette: string[]
  image_prompt: string
  video_script: string
  thumbnail_prompt: string
  format: string
  dimensions: { width: string; height: string; aspect_ratio: string }
  funnel_stage: string
  visual_psychology: string
  ad_headline: string
  platform: string
}

export interface TargetingStage {
  strategy: string
  estimated_reach: string
  exclude: string[]
}

export interface PlatformTargeting {
  platform: string
  tofu: TargetingStage
  mofu: TargetingStage
  bofu: TargetingStage
  geo_targeting: { countries: string[]; regions: string[] }
}

export interface PublishingScheduleItem {
  date: string
  time: string
  day_of_week: string
  platform: string
  funnel_stage: string
  ad_format: string
  content_id: string
  headline_preview: string
  notes: string
}

export interface FullFunnelHistoryBrand {
  brand_uuid: string
  website_url: string
  company_name: string
  selected_industry: { industry_uuid: string; name: string }
  created_at: string
  updated_at: string
}

export interface FullFunnelHistoryItem {
  full_funnel_compaign_uuid: string
  brand: FullFunnelHistoryBrand
  campaign_name: string
  brand_name: string
  objective: string
  total_budget: number
  currency: string
  duration_days: number
  start_date: string
  funnel_strategies: FunnelStrategies
  ad_copies: Record<string, unknown>[]
  visual_concepts: VisualConcept[]
  targeting_specs: Record<string, PlatformTargeting>
  publishing_schedule: PublishingScheduleItem[]
  total_ads: number
  platforms: string[]
  estimated_reach: string
  key_metrics: string[]
  status: string
  created_at: string
  updated_at: string
}
