import apiClient from '@/shared/api/client'
import type {
  FullFunnelPayload,
  FullFunnelResult,
  FullFunnelHistoryItem,
  FullFunnelGenerateVisualsPayload,
  FullFunnelGenerateVisualsResult,
} from './types'

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

  /** Renders images for the run's visual_concepts; enriches them on the run. */
  generateVisuals(
    uuid: string,
    payload: FullFunnelGenerateVisualsPayload,
  ): Promise<{ data: FullFunnelGenerateVisualsResult }> {
    return apiClient.post(`/campaigns/full-funnel/${uuid}/generate-visuals/`, payload)
  },
}
