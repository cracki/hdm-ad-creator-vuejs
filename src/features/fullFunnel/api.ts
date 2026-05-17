import apiClient from '@/shared/api/client'
import type { FullFunnelPayload, FullFunnelResult } from './types'

export const fullFunnelApi = {
  run(payload: FullFunnelPayload): Promise<{ data: FullFunnelResult }> {
    return apiClient.post('/campaigns/full-funnel/', payload)
  },
}
