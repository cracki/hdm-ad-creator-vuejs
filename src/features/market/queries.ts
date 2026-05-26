import { computed, type Ref } from 'vue'
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { marketApi } from './api'
import type {
  ContentIntelligenceRequest,
  AIHooksRequest,
  ContentGapsRequest,
  ContentMatrixRequest,
  TopPerformingContentRequest,
} from './types'

// ── POST mutations (run analysis) ──

export function useRunContentIntelligence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContentIntelligenceRequest) =>
      marketApi.runContentIntelligence(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'content-intelligence', 'history'] })
    },
  })
}

export function useGenerateAIHooks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AIHooksRequest) =>
      marketApi.generateAIHooks(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'ai-hooks', 'history'] })
    },
  })
}

export function useGetContentGaps() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContentGapsRequest) =>
      marketApi.getContentGaps(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'content-gaps', 'history'] })
    },
  })
}

export function useGetContentMatrix() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContentMatrixRequest) =>
      marketApi.getContentMatrix(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'content-matrix', 'history'] })
    },
  })
}

export function useGetTopPerformingContent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TopPerformingContentRequest) =>
      marketApi.getTopPerformingContent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'top-performing', 'history'] })
    },
  })
}

// ── GET queries (history listing) ──

export function useContentIntelligenceHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-intelligence', 'history', page.value]),
    queryFn: () => marketApi.listContentIntelligenceRuns({ page: page.value, page_size: 10 }).then(r => r.data),
    staleTime: 10_000,
  })
}

export function useAIHooksHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['market', 'ai-hooks', 'history', page.value]),
    queryFn: () => marketApi.listAIHooksRuns({ page: page.value, page_size: 10 }).then(r => r.data),
    staleTime: 10_000,
  })
}

export function useContentGapsHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-gaps', 'history', page.value]),
    queryFn: () => marketApi.listContentGapsRuns({ page: page.value, page_size: 10 }).then(r => r.data),
    staleTime: 10_000,
  })
}

export function useContentMatrixHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-matrix', 'history', page.value]),
    queryFn: () => marketApi.listContentMatrixRuns({ page: page.value, page_size: 10 }).then(r => r.data),
    staleTime: 10_000,
  })
}

export function useTopPerformingHistory(page: Ref<number>) {
  return useQuery({
    queryKey: computed(() => ['market', 'top-performing', 'history', page.value]),
    queryFn: () => marketApi.listTopPerformingRuns({ page: page.value, page_size: 10 }).then(r => r.data),
    staleTime: 10_000,
  })
}

// ── GET queries (history detail) ──

export function useContentIntelligenceRun(uuid: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-intelligence', 'run', uuid.value]),
    queryFn: () => marketApi.getContentIntelligenceRun(uuid.value!).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}

export function useAIHooksRun(uuid: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['market', 'ai-hooks', 'run', uuid.value]),
    queryFn: () => marketApi.getAIHooksRun(uuid.value!).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}

export function useContentGapsRun(uuid: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-gaps', 'run', uuid.value]),
    queryFn: () => marketApi.getContentGapsRun(uuid.value!).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}

export function useContentMatrixRun(uuid: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['market', 'content-matrix', 'run', uuid.value]),
    queryFn: () => marketApi.getContentMatrixRun(uuid.value!).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}

export function useTopPerformingRun(uuid: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => ['market', 'top-performing', 'run', uuid.value]),
    queryFn: () => marketApi.getTopPerformingRun(uuid.value!).then(r => r.data),
    enabled: computed(() => !!uuid.value),
    staleTime: 5_000,
  })
}
