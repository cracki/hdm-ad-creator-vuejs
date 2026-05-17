import { z } from 'zod'

export const industrySchema = z.object({
  industry_uuid: z.string().uuid(),
  name: z.string(),
})

export const brandSchema = z.object({
  brand_uuid: z.string().uuid(),
  website_url: z.string(),
  company_name: z.string(),
  selected_industry: industrySchema.nullable(),
  selected_industry_id: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const brandCreateSchema = z.object({
  website_url: z.string().url(),
  company_name: z.string().min(1),
  selected_industry_id: z.string().uuid().nullable().optional(),
})

export const brandAssetSchema = z.object({
  asset_uuid: z.string().uuid(),
  brand: z.string(),
  file: z.string(),
  asset_type: z.string(),
  created_at: z.string(),
})

export const brandSocialMediaSchema = z.object({
  social_media_uuid: z.string().uuid(),
  brand: z.string(),
  platform: z.string(),
  url: z.string(),
  created_at: z.string(),
})

export const analysisRunSchema = z.object({
  analysis_run_uuid: z.string().uuid(),
  brand: z.string(),
  website_data: z.string().nullable(),
  core_analysis: z.string().nullable(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  task_id: z.string().nullable(),
  requested_options: z.object({
    include_social: z.boolean(),
    include_competitors: z.boolean(),
  }).nullable(),
  started_at: z.string().nullable(),
  finished_at: z.string().nullable(),
  error_message: z.string().nullable(),
  social_presence: z.record(z.string(), z.unknown()).nullable(),
  audience_insights: z.record(z.string(), z.unknown()).nullable(),
  competitive_analysis: z.record(z.string(), z.unknown()).nullable(),
  recommendations: z.record(z.string(), z.unknown()).nullable(),
  quality_report: z.record(z.string(), z.unknown()).nullable(),
  brand_memory: z.record(z.string(), z.unknown()).nullable(),
  emotion_profile: z.record(z.string(), z.unknown()).nullable(),
  brand_profile: z.record(z.string(), z.unknown()).nullable(),
  full_payload: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const analysisRunListSchema = z.array(analysisRunSchema)

export const analysisStartSchema = z.object({
  include_social: z.boolean().optional().default(true),
  include_competitors: z.boolean().optional().default(true),
})

export function parseAnalysisRun(raw: unknown) {
  const result = analysisRunSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseAnalysisPayload(data: Record<string, unknown> | null) {
  if (!data || typeof data !== 'object') return null
  return data
}

export const TERMINAL_STATUSES = new Set(['completed', 'failed'])
