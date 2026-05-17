import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { competitorsApi } from './api'
import type { CompetitorCreatePayload } from './types'

export function useCompetitors(brandUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'competitors'],
    queryFn: async () => (await competitorsApi.list(brandUuid.value)).data,
    enabled: computed(() => !!brandUuid.value),
    staleTime: 10_000,
  })
}

export function useCompetitorAnalyses(brandUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'competitor-analyses'],
    queryFn: async () => (await competitorsApi.listAnalyses(brandUuid.value)).data,
    enabled: computed(() => !!brandUuid.value),
    staleTime: 30_000,
  })
}

export function useCreateCompetitor(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CompetitorCreatePayload) => competitorsApi.create(brandUuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'competitors'] })
    },
  })
}

export function useDeleteCompetitor(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (competitorUuid: string) => competitorsApi.delete(brandUuid.value, competitorUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'competitors'] })
    },
  })
}

export function useAnalyzeCompetitor(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (competitorUuid: string) => competitorsApi.analyze(brandUuid.value, competitorUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'competitors'] })
    },
  })
}

export function useIdentifyCompetitors(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => competitorsApi.identify(brandUuid.value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'competitors'] })
    },
  })
}

export function useCompetitiveInsights(brandUuid: Ref<string>) {
  return useMutation({
    mutationFn: async () => (await competitorsApi.insights(brandUuid.value)).data,
  })
}

export function useAnalyzeSocialMedia(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (socialMediaUuid: string) => competitorsApi.analyzeSocialMedia(brandUuid.value, socialMediaUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid] })
    },
  })
}

export function useSocialAudit(brandUuid: Ref<string>) {
  return useMutation({
    mutationFn: async () => (await competitorsApi.socialAudit(brandUuid.value)).data,
  })
}
