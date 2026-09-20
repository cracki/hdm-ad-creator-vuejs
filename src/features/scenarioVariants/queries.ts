import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { scenarioVariantsApi } from './api'
import { parseVariantOptions, parseMetaFrameworks } from './schemas'
import type {
  StandaloneVariantsPayload,
  CampaignMatrixPayload,
  ScenarioVariantsGenerateVisualsPayload,
} from './types'

export function useVariantOptions(industry: Ref<string>) {
  return useQuery({
    queryKey: ['variant-options', industry],
    queryFn: async () => {
      const { data } = await scenarioVariantsApi.getVariantOptions(industry.value || undefined)
      return parseVariantOptions(data) ?? data
    },
    staleTime: 60_000,
  })
}

export function useMetaFrameworks() {
  return useQuery({
    queryKey: ['meta-frameworks'],
    queryFn: async () => {
      const { data } = await scenarioVariantsApi.getMetaFrameworks()
      return parseMetaFrameworks(data) ?? data
    },
    staleTime: 300_000,
  })
}

export function useMatrixRunState(campaignUuid: Ref<string>, runUuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', campaignUuid, 'scenario-matrix', runUuid],
    queryFn: async () => {
      const { data } = await scenarioVariantsApi.getMatrixRunState(campaignUuid.value, runUuid.value)
      return data
    },
    enabled: computed(() => !!campaignUuid.value && !!runUuid.value),
    staleTime: 2_000,
  })
}

export function useMatrixRunVariants(campaignUuid: Ref<string>, runUuid: Ref<string>) {
  return useQuery({
    queryKey: ['campaigns', campaignUuid, 'scenario-matrix', runUuid, 'variants'],
    queryFn: async () => {
      const { data } = await scenarioVariantsApi.getMatrixRunVariants(campaignUuid.value, runUuid.value)
      return data
    },
    enabled: computed(() => !!campaignUuid.value && !!runUuid.value),
    staleTime: 5_000,
  })
}

export function useRunStandaloneVariants() {
  return useMutation({
    mutationFn: (payload: StandaloneVariantsPayload) =>
      scenarioVariantsApi.runStandaloneVariants(payload),
  })
}

export function useStartCampaignMatrix(campaignUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CampaignMatrixPayload) =>
      scenarioVariantsApi.startCampaignMatrix(campaignUuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid] })
    },
  })
}

/** POST …/scenario-variants-matrix/{run}/generate-visuals/ — image rendering (F2). */
export function useGenerateMatrixRunVisuals(campaignUuid: Ref<string>, runUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ScenarioVariantsGenerateVisualsPayload) =>
      scenarioVariantsApi.generateMatrixRunVisuals(campaignUuid.value, runUuid.value, payload),
    onSuccess: () => {
      // Variant data.image_url/visual_status persist on the variants read-back.
      queryClient.invalidateQueries({ queryKey: ['campaigns', campaignUuid, 'scenario-matrix', runUuid] })
    },
  })
}
