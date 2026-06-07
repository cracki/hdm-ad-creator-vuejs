import { z } from 'zod'

export const segmentationRunSchema = z.object({
  business_type: z.string().optional(),
  location: z.string().optional(),
  product_description: z.string().optional(),
  include_deep_research: z.boolean().optional().default(true),
})

export const campaignStepSchema = z.object({
  campaign_step_uuid: z.string(),
  step_type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'stale']),
  request_payload: z.record(z.string(), z.unknown()).optional().default({}),
  input_snapshot: z.record(z.string(), z.unknown()).optional().default({}),
  response_payload: z.record(z.string(), z.unknown()).optional().default({}),
  summary: z.record(z.string(), z.unknown()).optional().default({}),
  error_message: z.string().nullable().optional(),
})

const campaignBaseSchema = z.object({
  campaign_uuid: z.string(),
  name: z.string(),
  status: z.enum(['draft', 'in_progress', 'completed', 'archived']),
  current_step: z.string(),
  segmentation_completed: z.boolean(),
  ppc_viability_completed: z.boolean(),
  funnel_completed: z.boolean(),
  content_strategy_completed: z.boolean(),
  meta_ads_completed: z.boolean(),
  google_ads_completed: z.boolean(),
  linkedin_ads_completed: z.boolean(),
  context_payload: z.record(z.string(), z.unknown()).optional().default({}),
  summary: z.record(z.string(), z.unknown()).optional().default({}),
  steps_count: z.number().optional().default(0),
})

export const stepResultSchema = z.object({
  campaign: campaignBaseSchema.passthrough(),
  step: campaignStepSchema.passthrough(),
})

export const segmentationResponseSchema = stepResultSchema.extend({
  deep_research: z.record(z.string(), z.unknown()).optional().default({}),
})

export const ppcViabilityResponseSchema = stepResultSchema

export const funnelResponseSchema = stepResultSchema

export const contentStrategyResponseSchema = stepResultSchema

export const campaignAdSchema = z.object({
  campaign_ad_uuid: z.string(),
  campaign: z.string(),
  platform: z.enum(['meta', 'google', 'linkedin']),
  funnel_stage: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  funnel_context: z.record(z.string(), z.unknown()).optional().default({}),
  data: z.record(z.string(), z.unknown()).optional().default({}),
})

export const adGenerateResultSchema = z.object({
  success: z.boolean(),
  campaign: campaignBaseSchema.passthrough(),
  ads: z.array(campaignAdSchema.passthrough()),
})

export const generatedVisualSchema = z.object({
  campaign_ad_uuid: z.string(),
  platform: z.string().nullable().optional(),
  persona: z.string().nullable().optional(),
  funnel_stage: z.string().nullable().optional(),
  aspect_ratio: z.string().optional().default('1:1'),
  size: z.string().optional(),
  quality: z.string().optional().default('auto'),
  visual_summary: z.string().optional().default(''),
  prompt: z.string().optional().default(''),
  success: z.boolean(),
  image_url: z.string().nullable().optional(),
  revised_prompt: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
})

export const visualGenerateResultSchema = z.object({
  success: z.boolean(),
  campaign: campaignBaseSchema.passthrough(),
  generated_count: z.number(),
  results: z.array(generatedVisualSchema),
})

export function parseSegmentation(raw: unknown) {
  const result = segmentationResponseSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseStepResult(raw: unknown) {
  const result = stepResultSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseAdGenerateResult(raw: unknown) {
  const result = adGenerateResultSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseVisualGenerateResult(raw: unknown) {
  const result = visualGenerateResultSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}
