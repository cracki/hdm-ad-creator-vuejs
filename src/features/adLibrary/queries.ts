import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { adLibraryApi } from './api'
import type { AdLibraryGenerateRequest } from './types'

export function useAdLibraryRuns() {
  return useQuery({
    queryKey: ['ad-library', 'runs'],
    queryFn: async () => (await adLibraryApi.listRuns()).data,
    staleTime: 10_000,
  })
}

export function useAdLibraryRun(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['ad-library', 'runs', uuid],
    queryFn: async () => (await adLibraryApi.getRun(uuid.value)).data,
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}

export function useAdLibraryRunAds(runUuid: Ref<string>) {
  return useQuery({
    queryKey: ['ad-library', 'runs', runUuid, 'ads'],
    queryFn: async () => (await adLibraryApi.getRunAds(runUuid.value)).data,
    enabled: computed(() => !!runUuid.value),
    staleTime: 10_000,
  })
}

export function useCreativeAngles() {
  return useQuery({
    queryKey: ['ad-library', 'angles'],
    queryFn: async () => (await adLibraryApi.getCreativeAngles()).data,
    staleTime: 5 * 60_000,
  })
}

export function useFunnelStages() {
  return useQuery({
    queryKey: ['ad-library', 'funnel-stages'],
    queryFn: async () => (await adLibraryApi.getFunnelStages()).data,
    staleTime: 5 * 60_000,
  })
}

export function usePlatformConfigs() {
  return useQuery({
    queryKey: ['ad-library', 'platforms'],
    queryFn: async () => (await adLibraryApi.getPlatformConfigs()).data,
    staleTime: 5 * 60_000,
  })
}

export function useGenerateAdLibrary() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdLibraryGenerateRequest) =>
      adLibraryApi.generate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ad-library', 'runs'] })
    },
  })
}
