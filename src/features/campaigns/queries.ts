import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { campaignsApi } from './api'
import type { CampaignCreatePayload, SegmentationRunPayload, AdsStrategyPayload, GenerateAdPayload, GenerateVisualsPayload } from './types'

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

export function useCampaignSteps(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', uuid, 'steps'],
    queryFn: ({ signal }) => campaignsApi.listSteps(uuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 10_000,
  })
}

export function useCampaignAds(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', uuid, 'ads'],
    queryFn: ({ signal }) => campaignsApi.listAds(uuid.value, { signal }).then(r => r.data),
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
    mutationFn: () => campaignsApi.runPPCViability(uuid.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunFunnel(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => campaignsApi.runFunnel(uuid.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid] })
      queryClient.invalidateQueries({ queryKey: ['campaigns', uuid, 'steps'] })
    },
  })
}

export function useRunContentStrategy(uuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => campaignsApi.runContentStrategy(uuid.value),
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
    },
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
    },
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
