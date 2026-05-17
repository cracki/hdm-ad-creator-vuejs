export interface CreativeAngle {
  id: string
  name: string
  name_fa: string
  description: string
  approach: string
  best_for_funnel: string[]
  best_for_platforms: string[]
  emotional_triggers: string[]
  hook_style: string
  example_hooks: string[]
  visual_direction: Record<string, unknown>
}

export interface FunnelStage {
  name: string
  goal: string
  audience_state: string
  messaging_focus: string
  cta_types: string[]
  recommended_angles: string[]
}

export interface PlatformConfig {
  name: string
  headline_limit: number
  primary_text_limit: number
  description_limit: number
  tone_guidelines: string
  best_practices: string[]
  cta_options: string[]
  visual_specs: Record<string, unknown>
}

export interface AdLibraryRun {
  ad_library_run_uuid: string
  brand: {
    brand_uuid: string
    company_name: string
    website_url: string
  } | null
  run_type: 'generate' | 'quick_variations'
  status: 'pending' | 'running' | 'completed' | 'failed'
  request_payload: Record<string, unknown>
  input_snapshot: Record<string, unknown>
  response_payload: Record<string, unknown>
  result_summary: Record<string, unknown>
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  ads_count?: number
}

export interface AdLibraryAd {
  ad_library_ad_uuid: string
  run: string
  ad_id: string | null
  angle_id: string | null
  angle_name: string | null
  funnel_stage: string | null
  platform: string | null
  persona: string | null
  sort_order: number
  data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AdLibraryGenerateRequest {
  brand_uuid?: string
  personas?: Record<string, unknown>[]
  selected_angles?: string[]
  funnel_stages?: string[]
  platforms?: string[]
  ads_per_combination?: number
}

export interface AdLibraryGenerateResult {
  success: boolean
  run: AdLibraryRun
  ad_library: Record<string, unknown>
}

export interface CreativeAnglesResponse {
  success: boolean
  angles: Record<string, CreativeAngle>
  total: number
}

export interface FunnelStagesResponse {
  success: boolean
  funnel_stages: Record<string, FunnelStage>
}

export interface PlatformsResponse {
  success: boolean
  platforms: Record<string, PlatformConfig>
}
