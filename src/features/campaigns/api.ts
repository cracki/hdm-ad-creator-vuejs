import apiClient from '@/shared/api/client'
import type {
  Campaign,
  CampaignCreatePayload,
  SegmentationRunPayload,
  StepResult,
  AdsStrategyPayload,
  AdsStrategyListResponse,
  CampaignAdPlatform,
  GenerateAdPayload,
  GenerateVisualsPayload,
  AdGenerateResult,
  VisualGenerateResult,
  ClearAdsResult,
} from './types'

type SignalConfig = { signal?: AbortSignal }

const campaigns = () => '/campaigns/'
const campaign = (uuid: string) => `/campaigns/${uuid}/`

export const campaignsApi = {
  list(config?: SignalConfig): Promise<{ data: Campaign[] }> {
    return apiClient.get(campaigns(), config)
  },

  get(uuid: string, config?: SignalConfig): Promise<{ data: Campaign }> {
    return apiClient.get(campaign(uuid), config)
  },

  create(payload: CampaignCreatePayload): Promise<{ data: Campaign }> {
    return apiClient.post(campaigns(), payload)
  },

  update(uuid: string, payload: Partial<CampaignCreatePayload>): Promise<{ data: Campaign }> {
    return apiClient.patch(campaign(uuid), payload)
  },

  delete(uuid: string): Promise<void> {
    return apiClient.delete(campaign(uuid))
  },

  runSegmentation(uuid: string, payload: SegmentationRunPayload = {}): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}segmentation/`, {
      include_deep_research: true,
      ...payload,
    })
  },

  runPPCViability(uuid: string): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}ppc-viability/`)
  },

  runFunnel(uuid: string): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}funnel/`)
  },

  runContentStrategy(uuid: string): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}content/`)
  },

  runAdsStrategy(uuid: string, payload: AdsStrategyPayload): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}ads-strategy/`, payload)
  },

  getAdsStrategy(
    uuid: string,
    platform?: CampaignAdPlatform,
    config?: SignalConfig,
  ): Promise<{ data: AdsStrategyListResponse }> {
    const params = platform ? { platform } : {}
    return apiClient.get(`${campaign(uuid)}ads-strategy/`, { ...config, params })
  },

  generateAd(uuid: string, payload: GenerateAdPayload): Promise<{ data: AdGenerateResult }> {
    return apiClient.post(`${campaign(uuid)}generate-ad/`, payload)
  },

  clearAllAds(uuid: string): Promise<{ data: ClearAdsResult }> {
    return apiClient.delete(`${campaign(uuid)}ads/clear-all/`)
  },

  generateVisuals(uuid: string, payload: GenerateVisualsPayload): Promise<{ data: VisualGenerateResult }> {
    return apiClient.post(`${campaign(uuid)}generate-visuals/`, payload)
  },

  completeCampaign(uuid: string): Promise<{ data: { success: boolean; campaign: Campaign } }> {
    return apiClient.post(`${campaign(uuid)}complete/`)
  },
}
