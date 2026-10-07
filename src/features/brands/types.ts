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
  location: string | null
  brand_color: string | null
  /**
   * Latest analysis-run status on the list endpoint
   * ("none" | "pending" | "running" | "completed" | "failed"). Optional so
   * payloads from the old backend shape keep parsing.
   */
  analysis_status?: 'none' | 'pending' | 'running' | 'completed' | 'failed'
  /**
   * True when ANY completed analysis run exists, even if a newer run is
   * pending/failed. Optional for old payloads.
   */
  has_completed_analysis?: boolean
  /** Managed service rows exposed by BrandSerializer (QA round 3 fix 2). */
  services?: Array<{ name: string; source?: string }> | string[]
  created_at: string
  updated_at: string
}

export interface BrandCreatePayload {
  website_url: string
  company_name: string
  selected_industry_id?: string | null
  location?: string
  brand_color?: string
}

// ---------- Website auto-scan (POST /brands/scan/) ----------

export type ScanConfidence = 'high' | 'medium' | 'low'

export interface ScanDetectedField<T> {
  value: T | null
  confidence: ScanConfidence | null
  source: string | null
}

export interface ScanIndustryCandidate {
  industry_uuid: string
  name: string
  confidence: ScanConfidence
  source: string
}

export interface ScanSocialProfile {
  platform: string
  url: string
}

export interface BrandScanDetected {
  company_name: ScanDetectedField<string>
  industry: ScanDetectedField<ScanIndustryCandidate[]>
  brand_colors: ScanDetectedField<string[]>
  logo_url: ScanDetectedField<string>
  services: ScanDetectedField<string[]>
  social_profiles: ScanDetectedField<ScanSocialProfile[]>
  language: ScanDetectedField<string>
  location: ScanDetectedField<string>
}

export interface BrandScanResult {
  success: boolean
  detected: BrandScanDetected
  warnings: string[]
}

export interface BrandScanPayload {
  website_url: string
}

// ---------- Brand services (GET /brands/{uuid}/services/) ----------

export type BrandServiceSource = 'scraped' | 'brand_analysis' | 'ppc_viability'

export interface BrandService {
  name: string
  score: number | null
  classification: string | null
  recommendation: string | null
  source: BrandServiceSource
}

export interface BrandServicesResponse {
  success: boolean
  services: BrandService[]
}

// ---------- Managed brand services (/brands/{uuid}/services/manage/) ----------

export type ManagedBrandServiceSource = BrandServiceSource | 'manual'

export interface ManagedBrandService {
  service_uuid: string
  name: string
  source: ManagedBrandServiceSource
  created_at?: string
}

export interface ManagedBrandServicesResponse {
  success: boolean
  services: ManagedBrandService[]
}

export interface ManagedBrandServiceResult {
  success: boolean
  service: ManagedBrandService
}

export interface CreateManagedServicePayload {
  name: string
}

// ---------- Service relatedness check (POST /brands/{uuid}/services/check/) ----------

export interface ServiceRelatednessResult {
  related: boolean
  /** English, backend-authored explanation — never shown raw (we localize). */
  reason?: string
}

export interface UpdateManagedServicePayload {
  name: string
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
