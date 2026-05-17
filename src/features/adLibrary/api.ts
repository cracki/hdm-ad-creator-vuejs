import apiClient from '@/shared/api/client'
import type {
  AdLibraryRun,
  AdLibraryAd,
  AdLibraryGenerateRequest,
  AdLibraryGenerateResult,
  CreativeAnglesResponse,
  FunnelStagesResponse,
  PlatformsResponse,
} from './types'

export const adLibraryApi = {
  listRuns(): Promise<{ data: AdLibraryRun[] }> {
    return apiClient.get('/ad-library/runs/')
  },

  getRun(uuid: string): Promise<{ data: AdLibraryRun }> {
    return apiClient.get(`/ad-library/runs/${uuid}/`)
  },

  getRunAds(runUuid: string): Promise<{ data: AdLibraryAd[] }> {
    return apiClient.get(`/ad-library/runs/${runUuid}/ads/`)
  },

  generate(payload: AdLibraryGenerateRequest): Promise<{ data: AdLibraryGenerateResult }> {
    return apiClient.post('/ad-library/generate/', payload)
  },

  getCreativeAngles(): Promise<{ data: CreativeAnglesResponse }> {
    return apiClient.get('/ad-library/angles/')
  },

  getFunnelStages(): Promise<{ data: FunnelStagesResponse }> {
    return apiClient.get('/ad-library/funnel-stages/')
  },

  getPlatformConfigs(): Promise<{ data: PlatformsResponse }> {
    return apiClient.get('/ad-library/platforms/')
  },
}
