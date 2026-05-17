import { z } from 'zod'

export const ContentIntelligenceRequestSchema = z.object({
  brand_uuid: z.string().uuid().optional().nullable(),
  industry: z.string().min(1),
  location: z.string().min(1),
  brand_services: z.array(z.string()).optional(),
  content_goal: z.enum(['engagement', 'leads', 'awareness', 'sales', 'education']).optional().default('engagement'),
})

export const ContentIntelligenceRunSchema = z.object({
  content_intelligence_run_uuid: z.string().uuid(),
  brand: z.string().nullable(),
  run_type: z.string(),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  industry: z.string(),
  location: z.string(),
  content_goal: z.string(),
  request_payload: z.record(z.string(), z.unknown()).default({}),
  result_payload: z.record(z.string(), z.unknown()).default({}),
  summary: z.record(z.string(), z.unknown()).default({}),
  created_at: z.string(),
  updated_at: z.string(),
})

export const AIHooksRequestSchema = z.object({
  titles: z.array(z.string().min(1)).min(1).max(30),
  industry: z.string().min(1),
  brand_name: z.string().optional().nullable(),
  hook_count: z.number().min(1).max(50).optional().default(10),
})

export const ContentGapsRequestSchema = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  your_topics: z.array(z.string()).optional(),
})

export const ContentMatrixRequestSchema = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
  target_personas: z.array(z.string()).optional(),
})

export const TopPerformingContentRequestSchema = z.object({
  industry: z.string().min(1),
  location: z.string().min(1),
})
