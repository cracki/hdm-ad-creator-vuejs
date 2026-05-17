import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { marketApi } from './api'
import type {
  ContentIntelligenceRequest,
  AIHooksRequest,
  ContentGapsRequest,
  ContentMatrixRequest,
  TopPerformingContentRequest,
} from './types'

export function useRunContentIntelligence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContentIntelligenceRequest) =>
      marketApi.runContentIntelligence(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['market', 'intelligence'] })
    },
  })
}

export function useGenerateAIHooks() {
  return useMutation({
    mutationFn: (payload: AIHooksRequest) =>
      marketApi.generateAIHooks(payload),
  })
}

export function useGetContentGaps() {
  return useMutation({
    mutationFn: (payload: ContentGapsRequest) =>
      marketApi.getContentGaps(payload),
  })
}

export function useGetContentMatrix() {
  return useMutation({
    mutationFn: (payload: ContentMatrixRequest) =>
      marketApi.getContentMatrix(payload),
  })
}

export function useGetTopPerformingContent() {
  return useMutation({
    mutationFn: (payload: TopPerformingContentRequest) =>
      marketApi.getTopPerformingContent(payload),
  })
}
