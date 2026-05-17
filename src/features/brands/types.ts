export interface Industry {
  industry_uuid: string
  name: string
}

export interface Brand {
  brand_uuid: string
  website_url: string
  company_name: string
  selected_industry: Industry | null
  selected_industry_id: string | null
  created_at: string
  updated_at: string
}

export interface BrandCreatePayload {
  website_url: string
  company_name: string
  selected_industry_id?: string | null
}

export interface BrandAsset {
  asset_uuid: string
  brand: string
  file: string
  file_url?: string
  asset_type: string
  analysis_data?: Record<string, unknown> | null
  created_at: string
}

export interface BrandSocialMedia {
  social_media_uuid: string
  brand: string
  platform: string
  profile_url: string
  analysis_data?: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AnalysisRun {
  analysis_run_uuid: string
  brand: string
  website_data: string | null
  core_analysis: string | null
  status: 'pending' | 'running' | 'completed' | 'failed'
  task_id: string | null
  requested_options: { include_social: boolean; include_competitors: boolean } | null
  started_at: string | null
  finished_at: string | null
  error_message: string | null
  social_presence: Record<string, unknown> | null
  audience_insights: Record<string, unknown> | null
  competitive_analysis: Record<string, unknown> | null
  recommendations: Record<string, unknown> | null
  quality_report: Record<string, unknown> | null
  brand_memory: Record<string, unknown> | null
  emotion_profile: Record<string, unknown> | null
  brand_profile: Record<string, unknown> | null
  full_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface AnalysisStartPayload {
  include_social?: boolean
  include_competitors?: boolean
}
