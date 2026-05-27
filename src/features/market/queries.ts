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

// ── GET queries (history listing — returns ContentIntelligenceRun[]) ──

export function useContentIntelligenceHistory() {
  return useQuery({
    queryKey: ['market', 'content-intelligence', 'history'],
    queryFn: () => marketApi.listContentIntelligenceRuns().then(r => r.data),
    staleTime: 10_000,
  })
}

export function useAIHooksHistory() {
  return useQuery({
    queryKey: ['market', 'ai-hooks', 'history'],
    queryFn: () => marketApi.listAIHooksRuns().then(r => r.data),
    staleTime: 10_000,
  })
}

export function useContentGapsHistory() {
  return useQuery({
    queryKey: ['market', 'content-gaps', 'history'],
    queryFn: () => marketApi.listContentGapsRuns().then(r => r.data),
    staleTime: 10_000,
  })
}

export function useContentMatrixHistory() {
  return useQuery({
    queryKey: ['market', 'content-matrix', 'history'],
    queryFn: () => marketApi.listContentMatrixRuns().then(r => r.data),
    staleTime: 10_000,
  })
}

export function useTopPerformingHistory() {
  return useQuery({
    queryKey: ['market', 'top-performing', 'history'],
    queryFn: () => marketApi.listTopPerformingRuns().then(r => r.data),
    staleTime: 10_000,
  })
}
