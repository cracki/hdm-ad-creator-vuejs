import { z } from 'zod'

export const fullFunnelResultSchema = z.object({
  success: z.boolean(),
  campaign: z.record(z.string(), z.unknown()).optional().default({}),
})

export function parseFullFunnelResult(raw: unknown) {
  const result = fullFunnelResultSchema.safeParse(raw)
  if (!result.success) return null
  return result.data
}
