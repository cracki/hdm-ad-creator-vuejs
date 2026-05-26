import apiClient from '@/shared/api/client'
import type {
  ContentIntelligenceRequest,
  ContentIntelligenceRun,
  AIHooksRequest,
  AIHooksResponse,
  ContentGapsRequest,
  ContentMatrixRequest,
  TopPerformingContentRequest,
  PaginatedMarketRuns,
  MarketRunDetail,
  ContentIntelligenceResult,
  ContentGapsResponse,
  ContentMatrixResponse,
  TopPerformingContentResponse,
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

  // ── GET (history listing) ──

  listContentIntelligenceRuns(params?: { page?: number; page_size?: number }): Promise<{ data: PaginatedMarketRuns }> {
    return apiClient.get('/market/content-intelligence/', { params })
  },
  listAIHooksRuns(params?: { page?: number; page_size?: number }): Promise<{ data: PaginatedMarketRuns }> {
    return apiClient.get('/market/generate-ai-hooks/', { params })
  },
  listContentGapsRuns(params?: { page?: number; page_size?: number }): Promise<{ data: PaginatedMarketRuns }> {
    return apiClient.get('/market/content-gaps/', { params })
  },
  listContentMatrixRuns(params?: { page?: number; page_size?: number }): Promise<{ data: PaginatedMarketRuns }> {
    return apiClient.get('/market/content-matrix/', { params })
  },
  listTopPerformingRuns(params?: { page?: number; page_size?: number }): Promise<{ data: PaginatedMarketRuns }> {
    return apiClient.get('/market/top-performing-content/', { params })
  },

  // ── GET (history detail) ──

  getContentIntelligenceRun(uuid: string): Promise<{ data: MarketRunDetail<ContentIntelligenceResult> }> {
    return apiClient.get(`/market/content-intelligence/${uuid}/`)
  },
  getAIHooksRun(uuid: string): Promise<{ data: MarketRunDetail<AIHooksResponse> }> {
    return apiClient.get(`/market/generate-ai-hooks/${uuid}/`)
  },
  getContentGapsRun(uuid: string): Promise<{ data: MarketRunDetail<ContentGapsResponse> }> {
    return apiClient.get(`/market/content-gaps/${uuid}/`)
  },
  getContentMatrixRun(uuid: string): Promise<{ data: MarketRunDetail<ContentMatrixResponse> }> {
    return apiClient.get(`/market/content-matrix/${uuid}/`)
  },
  getTopPerformingRun(uuid: string): Promise<{ data: MarketRunDetail<TopPerformingContentResponse> }> {
    return apiClient.get(`/market/top-performing-content/${uuid}/`)
  },
}
