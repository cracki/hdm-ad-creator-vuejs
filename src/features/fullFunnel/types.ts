export interface FullFunnelPayload {
  brand_uuid: string
  personas: Record<string, unknown>[]
  platforms?: string[]
  budget?: number
  currency?: string
  duration_days?: number
  funnel_stages?: string[]
  ads_per_stage?: number
}

export interface FullFunnelResult {
  success: boolean
  campaign: Record<string, unknown>
}
