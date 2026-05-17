import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { brandsApi } from './api'
import type { BrandCreatePayload, AnalysisStartPayload, BrandSocialMedia } from './types'
import { parseAnalysisRun, analysisRunListSchema } from './schemas'

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: ({ signal }) => brandsApi.list({ signal }).then(r => r.data),
    staleTime: 30_000,
  })
}

export function useBrand(uuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', uuid],
    queryFn: ({ signal }) => brandsApi.get(uuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 30_000,
  })
}

export function useIndustries() {
  return useQuery({
    queryKey: ['industries'],
    queryFn: ({ signal }) => brandsApi.listIndustries({ signal }).then(r => r.data),
    staleTime: 5 * 60_000,
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BrandCreatePayload) => brandsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: Partial<BrandCreatePayload> }) =>
      brandsApi.update(uuid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => brandsApi.delete(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })
}

export function useAnalysisRuns(brandUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'analysis-runs'],
    queryFn: async ({ signal }) => {
      const res = (await brandsApi.listAnalysisRuns(brandUuid.value, { signal })).data
      const parsed = analysisRunListSchema.safeParse(res)
      return parsed.success ? parsed.data : res
    },
    enabled: computed(() => !!brandUuid.value),
    staleTime: 10_000,
  })
}

export function useAnalysisRun(brandUuid: Ref<string>, runUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'analysis-runs', runUuid],
    queryFn: async ({ signal }) => {
      const res = (await brandsApi.getAnalysisRun(brandUuid.value, runUuid.value, { signal })).data
      return parseAnalysisRun(res) ?? res
    },
    enabled: computed(() => !!brandUuid.value && !!runUuid.value),
    staleTime: 5_000,
  })
}

export function useStartAnalysis(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AnalysisStartPayload = {}) =>
      brandsApi.startAnalysis(brandUuid.value, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'analysis-runs'] })
    },
  })
}

export function useBrandAssets(brandUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'assets'],
    queryFn: ({ signal }) => brandsApi.listAssets(brandUuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!brandUuid.value),
    staleTime: 10_000,
  })
}

export function useBrandSocialMedia(brandUuid: Ref<string>) {
  return useQuery({
    queryKey: ['brands', brandUuid, 'social-media'],
    queryFn: ({ signal }) => brandsApi.listSocialMedia(brandUuid.value, { signal }).then(r => r.data),
    enabled: computed(() => !!brandUuid.value),
    staleTime: 10_000,
  })
}

export function useAnalyzeAsset(brandUuid: Ref<string>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (assetUuid: string) =>
      brandsApi.analyzeAsset(brandUuid.value, assetUuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands', brandUuid, 'assets'] })
    },
  })
}

export function useLogoAnalysis(brandUuid: Ref<string>) {
  return useMutation({
    mutationFn: () => brandsApi.logoAnalysis(brandUuid.value),
  })
}
