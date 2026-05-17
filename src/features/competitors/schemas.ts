import { z } from 'zod'

export const competitorSchema = z.object({
  competitor_uuid: z.string().uuid(),
  brand: z.string(),
  name: z.string(),
  website_url: z.string(),
  is_direct: z.boolean(),
  analysis_record: z.object({
    last_analysis: z.record(z.string(), z.unknown()).nullable(),
    last_analysis_at: z.string().nullable(),
    last_analysis_status: z.enum(['success', 'error']).nullable(),
  }).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const competitorCreateSchema = z.object({
  name: z.string().min(1),
  website_url: z.string().url(),
  is_direct: z.boolean().optional().default(true),
})

export const competitorAnalysisSchema = z.object({
  competitor_analysis_uuid: z.string().uuid(),
  brand: z.string(),
  core_analysis: z.string(),
  analysis_payload: z.record(z.string(), z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export const competitorListSchema = z.array(competitorSchema)
export const competitorAnalysisListSchema = z.array(competitorAnalysisSchema)

export function parseCompetitor(raw: unknown) {
  const result = competitorSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}
