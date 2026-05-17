import { z } from 'zod'

export const variantOptionSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string().optional().default(''),
})

export const variantFormatOptionSchema = variantOptionSchema.extend({
  specs: z.string().optional().default(''),
})

export const metaFrameworkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional().default(''),
  tone: z.string().optional().default(''),
  visual_style: z.string().optional().default(''),
  ad_copy_structure: z.string().optional().default(''),
  cta_style: z.string().optional().default(''),
})

export const variantOptionsResponseSchema = z.object({
  status: z.string(),
  industry: z.string().optional().default('default'),
  audiences: z.array(variantOptionSchema.passthrough()).optional().default([]),
  styles: z.array(variantOptionSchema.passthrough()).optional().default([]),
  formats: z.array(variantFormatOptionSchema.passthrough()).optional().default([]),
  meta_creative_frameworks: z.array(metaFrameworkSchema.passthrough()).optional().default([]),
})

export const metaFrameworksResponseSchema = z.object({
  status: z.string(),
  total_frameworks: z.number().optional().default(0),
  frameworks: z.array(metaFrameworkSchema.passthrough()),
})

export const scenarioVariantRunSchema = z.object({
  scenario_variant_run_uuid: z.string(),
  campaign: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  entrypoint_type: z.enum(['standalone', 'campaign_matrix']),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  scenario: z.string().optional().default(''),
  request_payload: z.record(z.string(), z.unknown()).optional().default({}),
  input_snapshot: z.record(z.string(), z.unknown()).optional().default({}),
  result_summary: z.record(z.string(), z.unknown()).optional().default({}),
  matrix_rows_snapshot: z.array(z.unknown()).optional().default([]),
  started_at: z.string().nullable().optional(),
  completed_at: z.string().nullable().optional(),
  error_message: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
})

export const scenarioVariantSchema = z.object({
  scenario_variant_uuid: z.string(),
  run: z.string().optional(),
  variant_type: z.enum(['regular', 'meta_creative']).optional().default('regular'),
  platform: z.string().nullable().optional(),
  audience: z.string().nullable().optional(),
  style: z.string().nullable().optional(),
  ad_format: z.string().nullable().optional(),
  framework_id: z.string().nullable().optional(),
  framework_name: z.string().nullable().optional(),
  sort_order: z.number().optional().default(0),
  data: z.record(z.string(), z.unknown()).optional().default({}),
})

export const standaloneVariantsResultSchema = z.object({
  status: z.string().optional().default(''),
  result: z.record(z.string(), z.unknown()).optional().default({}),
  run: scenarioVariantRunSchema.passthrough(),
})

export function parseVariantOptions(raw: unknown) {
  const result = variantOptionsResponseSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseMetaFrameworks(raw: unknown) {
  const result = metaFrameworksResponseSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseScenarioVariantRun(raw: unknown) {
  const result = scenarioVariantRunSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}

export function parseScenarioVariants(raw: unknown) {
  const result = z.array(scenarioVariantSchema.passthrough()).safeParse(raw)
  if (!result.success) return []
  return result.data
}
