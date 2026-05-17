export type VariantRunStatus = 'pending' | 'running' | 'completed' | 'failed'
export type VariantRunEntrypoint = 'standalone' | 'campaign_matrix'
export type VariantType = 'regular' | 'meta_creative'

export interface VariantOption {
  id: string
  name: string
  description: string
}

export interface VariantFormatOption extends VariantOption {
  specs?: string
}

export interface MetaCreativeFramework {
  id: string
  name: string
  description: string
  tone: string
  visual_style: string
  ad_copy_structure: string
  cta_style: string
}

export interface VariantOptionsResponse {
  status: string
  industry: string
  audiences: VariantOption[]
  styles: VariantOption[]
  formats: VariantFormatOption[]
  meta_creative_frameworks: MetaCreativeFramework[]
}

export interface MetaFrameworksResponse {
  status: string
  total_frameworks: number
  frameworks: MetaCreativeFramework[]
}

export interface ScenarioVariantRun {
  scenario_variant_run_uuid: string
  campaign: string | null
  brand: string | null
  entrypoint_type: VariantRunEntrypoint
  status: VariantRunStatus
  scenario: string
  request_payload: Record<string, unknown>
  input_snapshot: Record<string, unknown>
  result_summary: Record<string, unknown>
  matrix_rows_snapshot: Record<string, unknown>[]
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface ScenarioVariant {
  scenario_variant_uuid: string
  run: string
  variant_type: VariantType
  platform: string | null
  audience: string | null
  style: string | null
  ad_format: string | null
  framework_id: string | null
  framework_name: string | null
  sort_order: number
  data: Record<string, unknown>
  created_at?: string
  updated_at?: string
}

export interface StandaloneVariantsPayload {
  brand_uuid: string
  scenario: string
  scenario_details?: Record<string, unknown>
  platforms?: string[]
  selected_audiences?: string[]
  selected_styles?: string[]
  selected_formats?: string[]
  selected_meta_frameworks?: string[]
  campaign_tone?: string
  additional_notes?: string
  selection_notes?: Record<string, unknown>
}

export interface StandaloneVariantsResult {
  status: string
  result: Record<string, unknown>
  run: ScenarioVariantRun
}

export interface CampaignMatrixPayload {
  scenario?: string
  scenario_details?: Record<string, unknown>
  platforms?: string[]
  selected_audiences?: string[]
  selected_styles?: string[]
  selected_formats?: string[]
  selected_meta_frameworks?: string[]
  selection_notes?: Record<string, unknown>
  deadline?: string
  priority?: string
}

export interface CampaignMatrixResult {
  run: ScenarioVariantRun
  variants: ScenarioVariant[]
}
