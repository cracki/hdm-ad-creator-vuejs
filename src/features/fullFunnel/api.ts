import apiClient from '@/shared/api/client'
import type { FullFunnelPayload, FullFunnelResult, FullFunnelHistoryItem } from './types'

export const fullFunnelApi = {
  run(payload: FullFunnelPayload): Promise<{ data: FullFunnelResult }> {
    return apiClient.post('/campaigns/full-funnel/', payload)
  },

  history(): Promise<{ data: FullFunnelHistoryItem[] }> {
    return apiClient.get('/campaigns/full-funnel/')
  },

  historyDetail(uuid: string): Promise<{ data: FullFunnelHistoryItem }> {
    return apiClient.get(`/campaigns/full-funnel/${uuid}/`)
  },
}
