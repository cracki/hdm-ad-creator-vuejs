import apiClient from '@/shared/api/client'
import type {
  ContentIntelligenceRequest,
  ContentIntelligenceRun,
  AIHooksRequest,
  AIHooksResponse,
  ContentGapsRequest,
  ContentMatrixRequest,
  TopPerformingContentRequest,
} from './types'

export const marketApi = {
  runContentIntelligence(payload: ContentIntelligenceRequest): Promise<{ data: ContentIntelligenceRun }> {
    return apiClient.post('/market/content-intelligence/', payload)
  },

  generateAIHooks(payload: AIHooksRequest): Promise<{ data: AIHooksResponse }> {
    return apiClient.post('/market/generate-ai-hooks/', payload)
  },

  getContentGaps(payload: ContentGapsRequest): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post('/market/content-gaps/', payload)
  },

  getContentMatrix(payload: ContentMatrixRequest): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post('/market/content-matrix/', payload)
  },

  getTopPerformingContent(payload: TopPerformingContentRequest): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post('/market/top-performing-content/', payload)
  },
}
