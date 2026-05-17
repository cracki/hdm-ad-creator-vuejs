export interface Competitor {
  competitor_uuid: string
  brand: string
  name: string
  website_url: string
  is_direct: boolean
  analysis_record: CompetitorAnalysisRecord | null
  created_at: string
  updated_at: string
}

export interface CompetitorAnalysisRecord {
  last_analysis: Record<string, unknown> | null
  last_analysis_at: string | null
  last_analysis_status: 'success' | 'error' | null
}

export interface CompetitorCreatePayload {
  name: string
  website_url: string
  is_direct?: boolean
}

export interface CompetitorAnalysis {
  competitor_analysis_uuid: string
  brand: string
  core_analysis: string
  analysis_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface SocialMediaAnalyzeResult {
  social_media_uuid: string
  brand: Record<string, unknown>
  platform: string
  profile_url: string | null
  analysis_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
}
