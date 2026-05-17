import { z } from 'zod'

export const AdLibraryRunSchema = z.object({
  ad_library_run_uuid: z.string().uuid(),
  brand: z.any().nullable(),
  run_type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  request_payload: z.record(z.string(), z.unknown()).default({}),
  input_snapshot: z.record(z.string(), z.unknown()).default({}),
  response_payload: z.record(z.string(), z.unknown()).default({}),
  result_summary: z.record(z.string(), z.unknown()).default({}),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
  error_message: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  ads_count: z.number().optional(),
})

export const AdLibraryAdSchema = z.object({
  ad_library_ad_uuid: z.string().uuid(),
  run: z.string(),
  ad_id: z.string().nullable(),
  angle_id: z.string().nullable(),
  angle_name: z.string().nullable(),
  funnel_stage: z.string().nullable(),
  platform: z.string().nullable(),
  persona: z.string().nullable(),
  sort_order: z.number(),
  data: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
})

export const AdLibraryGenerateRequestSchema = z.object({
  brand_uuid: z.string().uuid().optional(),
  personas: z.array(z.record(z.string(), z.unknown())).optional(),
  selected_angles: z.array(z.string()).optional(),
  funnel_stages: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  ads_per_combination: z.number().min(1).max(10).optional().default(2),
})

const CreativeAngleSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_fa: z.string().default(''),
  description: z.string(),
  approach: z.string().default(''),
  best_for_funnel: z.array(z.string()).default([]),
  best_for_platforms: z.array(z.string()).default([]),
  emotional_triggers: z.array(z.string()).default([]),
  hook_style: z.string().default(''),
  example_hooks: z.array(z.string()).default([]),
  visual_direction: z.record(z.string(), z.unknown()).default({}),
}).passthrough()

export const CreativeAnglesResponseSchema = z.object({
  success: z.boolean(),
  angles: z.record(z.string(), CreativeAngleSchema),
  total: z.number(),
})

const FunnelStageSchema = z.object({
  name: z.string(),
  goal: z.string(),
  audience_state: z.string().default(''),
  messaging_focus: z.string().default(''),
  cta_types: z.array(z.string()).default([]),
  recommended_angles: z.array(z.string()).default([]),
}).passthrough()

export const FunnelStagesResponseSchema = z.object({
  success: z.boolean(),
  funnel_stages: z.record(z.string(), FunnelStageSchema),
})

const PlatformConfigSchema = z.object({
  name: z.string(),
  headline_limit: z.number().default(40),
  primary_text_limit: z.number().default(125),
  description_limit: z.number().default(30),
  tone_guidelines: z.string().default(''),
  best_practices: z.array(z.string()).default([]),
  cta_options: z.array(z.string()).default([]),
  visual_specs: z.record(z.string(), z.unknown()).default({}),
}).passthrough()

export const PlatformsResponseSchema = z.object({
  success: z.boolean(),
  platforms: z.record(z.string(), PlatformConfigSchema),
})
