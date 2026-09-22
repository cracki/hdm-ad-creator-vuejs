import apiClient from '@/shared/api/client'
import type {
  VariantOptionsResponse,
  MetaFrameworksResponse,
  StandaloneVariantsPayload,
  StandaloneVariantsResult,
  CampaignMatrixPayload,
  ScenarioVariantRun,
  ScenarioVariant,
  ScenarioVariantsGenerateVisualsPayload,
  ScenarioVariantsGenerateVisualsResult,
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

  /** Renders images for a campaign's scenario-variants-matrix run (F2). */
  generateMatrixRunVisuals(
    campaignUuid: string,
    runUuid: string,
    payload: ScenarioVariantsGenerateVisualsPayload,
  ): Promise<{ data: ScenarioVariantsGenerateVisualsResult }> {
    return apiClient.post(`/campaigns/${campaignUuid}/scenario-variants-matrix/${runUuid}/generate-visuals/`, payload)
  },

  /** Renders images for a standalone (no-campaign) variants run (F2). */
  generateStandaloneRunVisuals(
    runUuid: string,
    payload: ScenarioVariantsGenerateVisualsPayload,
  ): Promise<{ data: ScenarioVariantsGenerateVisualsResult }> {
    return apiClient.post(`/campaigns/scenario-variants/${runUuid}/generate-visuals/`, payload)
  },

  /** Standalone run variants read-back (data.image_url persists after rendering). */
  getStandaloneRunVariants(
    runUuid: string,
  ): Promise<{ data: { run: ScenarioVariantRun; variants: ScenarioVariant[] } }> {
    return apiClient.get(`/campaigns/scenario-variants/${runUuid}/variants/`)
  },
}
