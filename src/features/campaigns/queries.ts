import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { campaignsApi } from './api'
import type { CampaignCreatePayload, SegmentationRunPayload, AdsStrategyPayload, CampaignAdPlatform, CampaignStepType, GenerateAdPayload, GenerateVisualsPayload, ReviewAdPayload, PatchAdPayload, RefineAdPayload, StepRefineOptions, StepReviewPayload } from './types'

export function useCampaigns() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: ({ signal }) => campaignsApi.list({ signal }).then(r => r.data),
    staleTime: 15_000,
  })
}

export function useCampaign(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', uuid],
    queryFn: ({ signal }) => campaignsApi.get(uuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 10_000,
  })
}

export function useCreateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CampaignCreatePayload) => campaignsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => campaignsApi.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

export function useRunSegmentation(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: SegmentationRunPayload = {}) =>
      campaignsApi.runSegmentation(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunPPCViability(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StepRefineOptions = {}) => campaignsApi.runPPCViability(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunFunnel(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StepRefineOptions = {}) => campaignsApi.runFunnel(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunContentStrategy(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: StepRefineOptions = {}) => campaignsApi.runContentStrategy(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunAdsStrategy(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdsStrategyPayload) =>
      campaignsApi.runAdsStrategy(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads-strategy'] })
    },
  })
}

export function useAdsStrategy(uuid: Ref<string>, platform?: Ref<CampaignAdPlatform | undefined>) {
  return useQuery({
    queryKey: ['campaigns', uuid, 'ads-strategy', platform],
    queryFn: ({ signal }) =>
      campaignsApi.getAdsStrategy(uuid.value, platform?.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 10_000,
  })
}

export function useGenerateAd(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateAdPayload) =>
      campaignsApi.generateAd(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
    },
  })
}

export function useClearAllAds(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => campaignsApi.clearAllAds(uuid.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
    },
  })
}

export function useGenerateVisuals(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateVisualsPayload) =>
      campaignsApi.generateVisuals(uuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'visuals'] })
    },
  })
}

/** GET /campaigns/{uuid}/visuals/ — persisted visuals restore (F2). */
export function useCampaignVisuals(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', uuid, 'visuals'],
    queryFn: ({ signal }) => campaignsApi.listVisuals(uuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 10_000,
  })
}

export function useCompleteCampaign(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => campaignsApi.completeCampaign(uuid.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}

// ── Ad review / manual edit / refine / read-back (F13) ──

/** GET /campaigns/{uuid}/ads/ — server truth incl. review_status restore. */
export function useCampaignAds(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', uuid, 'ads'],
    queryFn: ({ signal }) => campaignsApi.listAds(uuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 10_000,
  })
}

export function useReviewAd(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adUuid, payload }: { adUuid: string; payload: ReviewAdPayload }) =>
      campaignsApi.reviewAd(uuid.value, adUuid, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
    },
  })
}

export function usePatchAd(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adUuid, payload }: { adUuid: string; payload: PatchAdPayload }) =>
      campaignsApi.patchAd(uuid.value, adUuid, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
    },
  })
}

export function useRefineAd(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ adUuid, payload }: { adUuid: string; payload: RefineAdPayload }) =>
      campaignsApi.refineAd(uuid.value, adUuid, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'ads'] })
    },
  })
}

export function useApproveStep(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (stepType: CampaignStepType) =>
      campaignsApi.approveStep(uuid.value, stepType).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

/** POST /campaigns/{uuid}/steps/{step_type}/review/ — persist approved/rejected. */
export function useReviewStep(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ stepType, payload }: { stepType: CampaignStepType; payload: StepReviewPayload }) =>
      campaignsApi.reviewStep(uuid.value, stepType, payload).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

/** PATCH /campaigns/{uuid}/ — partial update (used to persist content insights). */
export function useUpdateCampaign() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: Partial<CampaignCreatePayload> }) =>
      campaignsApi.update(uuid, payload).then(r => r.data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', vars.uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns'] })
    },
  })
}
