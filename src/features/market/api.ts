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
  // ── POST (run analysis) ──

  runContentIntelligence(payload: ContentIntelligenceRequest): Promise<{ data: ContentIntelligenceRun }> {
    return apiClient.post('/market/content-intelligence/', payload)
  },

  async generateAIHooks(payload: AIHooksRequest): Promise<{ data: AIHooksResponse }> {
    const res = await apiClient.post('/market/generate-ai-hooks/', payload)
    return { data: res.data.result_payload }
  },

  async getContentGaps(payload: ContentGapsRequest): Promise<{ data: Record<string, unknown> }> {
    const res = await apiClient.post('/market/content-gaps/', payload)
    return { data: res.data.result_payload }
  },

  async getContentMatrix(payload: ContentMatrixRequest): Promise<{ data: Record<string, unknown> }> {
    const res = await apiClient.post('/market/content-matrix/', payload)
    return { data: res.data.result_payload }
  },

  async getTopPerformingContent(payload: TopPerformingContentRequest): Promise<{ data: Record<string, unknown> }> {
    const res = await apiClient.post('/market/top-performing-content/', payload)
    return { data: res.data.result_payload }
  },

  // ── GET (history listing — returns ContentIntelligenceRun[]) ──

  listContentIntelligenceRuns(params?: { page?: number; page_size?: number }): Promise<{ data: ContentIntelligenceRun[] }> {
    return apiClient.get('/market/content-intelligence/', { params })
  },
  listAIHooksRuns(params?: { page?: number; page_size?: number }): Promise<{ data: ContentIntelligenceRun[] }> {
    return apiClient.get('/market/generate-ai-hooks/', { params })
  },
  listContentGapsRuns(params?: { page?: number; page_size?: number }): Promise<{ data: ContentIntelligenceRun[] }> {
    return apiClient.get('/market/content-gaps/', { params })
  },
  listContentMatrixRuns(params?: { page?: number; page_size?: number }): Promise<{ data: ContentIntelligenceRun[] }> {
    return apiClient.get('/market/content-matrix/', { params })
  },
  listTopPerformingRuns(params?: { page?: number; page_size?: number }): Promise<{ data: ContentIntelligenceRun[] }> {
    return apiClient.get('/market/top-performing-content/', { params })
  },
}
