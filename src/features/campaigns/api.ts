import apiClient from '@/shared/api/client'
import type {
  Campaign,
  CampaignCreatePayload,
  SegmentationRunPayload,
  StepResult,
  AdsStrategyPayload,
  AdsStrategyListResponse,
  CampaignAdPlatform,
  CampaignStepType,
  GenerateAdPayload,
  GenerateVisualsPayload,
  AdGenerateResult,
  VisualGenerateResult,
  CampaignVisualsListResult,
  ClearAdsResult,
  CampaignAdsListResult,
  ReviewAdPayload,
  PatchAdPayload,
  RefineAdPayload,
  AdReviewResult,
  AdUpdateResult,
  AdRefineResult,
  StepApproveResult,
  PlatformRecommendationsResult,
  StepRefineOptions,
  StepReviewPayload,
  StepReviewResult,
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

  runPPCViability(uuid: string, payload: StepRefineOptions = {}): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}ppc-viability/`, payload)
  },

  runFunnel(uuid: string, payload: StepRefineOptions = {}): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}funnel/`, payload)
  },

  runContentStrategy(uuid: string, payload: StepRefineOptions = {}): Promise<{ data: StepResult }> {
    return apiClient.post(`${campaign(uuid)}content/`, payload)
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

  /** Read-back of every persisted visual (successes and failures), newest ads first. */
  listVisuals(uuid: string, config?: SignalConfig): Promise<{ data: CampaignVisualsListResult }> {
    return apiClient.get(`${campaign(uuid)}visuals/`, config)
  },

  completeCampaign(uuid: string): Promise<{ data: { success: boolean; campaign: Campaign } }> {
    return apiClient.post(`${campaign(uuid)}complete/`)
  },

  /** POST /campaigns/{uuid}/recommend-platforms/ — AI suitability per platform (F15/C5). */
  recommendPlatforms(uuid: string): Promise<{ data: PlatformRecommendationsResult }> {
    return apiClient.post(`${campaign(uuid)}recommend-platforms/`)
  },

  // ── Ad review / manual edit / refine / read-back (F13) ──

  listAds(uuid: string, config?: SignalConfig): Promise<{ data: CampaignAdsListResult }> {
    return apiClient.get(`${campaign(uuid)}ads/`, config)
  },

  reviewAd(uuid: string, adUuid: string, payload: ReviewAdPayload): Promise<{ data: AdReviewResult }> {
    return apiClient.post(`${campaign(uuid)}ads/${adUuid}/review/`, payload)
  },

  patchAd(uuid: string, adUuid: string, payload: PatchAdPayload): Promise<{ data: AdUpdateResult }> {
    return apiClient.patch(`${campaign(uuid)}ads/${adUuid}/`, payload)
  },

  refineAd(uuid: string, adUuid: string, payload: RefineAdPayload): Promise<{ data: AdRefineResult }> {
    return apiClient.post(`${campaign(uuid)}ads/${adUuid}/refine/`, payload)
  },

  approveStep(uuid: string, stepType: CampaignStepType): Promise<{ data: StepApproveResult }> {
    return apiClient.post(`${campaign(uuid)}steps/${stepType}/approve/`)
  },

  /** Persist a review decision on the latest run of a step (approve keeps the reason empty). */
  reviewStep(uuid: string, stepType: CampaignStepType, payload: StepReviewPayload): Promise<{ data: StepReviewResult }> {
    const body = payload.decision === 'rejected' ? payload : { decision: 'approved' }
    return apiClient.post(`${campaign(uuid)}steps/${stepType}/review/`, body)
  },
}
