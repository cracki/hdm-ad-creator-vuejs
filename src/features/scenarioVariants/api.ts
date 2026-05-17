import apiClient from '@/shared/api/client'
import type {
  VariantOptionsResponse,
  MetaFrameworksResponse,
  StandaloneVariantsPayload,
  StandaloneVariantsResult,
  CampaignMatrixPayload,
  ScenarioVariantRun,
  ScenarioVariant,
} from './types'

export const scenarioVariantsApi = {
  getVariantOptions(industry?: string): Promise<{ data: VariantOptionsResponse }> {
    const params = industry ? { industry } : {}
    return apiClient.get('/campaigns/variant-options/', { params })
  },

  getMetaFrameworks(): Promise<{ data: MetaFrameworksResponse }> {
    return apiClient.get('/campaigns/meta-creative-frameworks/')
  },

  runStandaloneVariants(payload: StandaloneVariantsPayload): Promise<{ data: StandaloneVariantsResult }> {
    return apiClient.post('/campaigns/scenario-variants/', payload)
  },

  startCampaignMatrix(campaignUuid: string, payload: CampaignMatrixPayload): Promise<{ data: ScenarioVariantRun }> {
    return apiClient.post(`/campaigns/${campaignUuid}/scenario-variants-matrix/`, payload)
  },

  getMatrixRunState(campaignUuid: string, runUuid: string): Promise<{ data: ScenarioVariantRun }> {
    return apiClient.get(`/campaigns/${campaignUuid}/scenario-variants-matrix/${runUuid}/`)
  },

  getMatrixRunVariants(campaignUuid: string, runUuid: string): Promise<{ data: ScenarioVariant[] }> {
    return apiClient.get(`/campaigns/${campaignUuid}/scenario-variants-matrix/${runUuid}/variants/`)
  },
}
