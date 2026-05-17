import apiClient from '@/shared/api/client'
import type { Competitor, CompetitorCreatePayload, CompetitorAnalysis } from './types'

export const competitorsApi = {
  list(brandUuid: string): Promise<{ data: Competitor[] }> {
    return apiClient.get(`/brands/${brandUuid}/competitors/`)
  },

  create(brandUuid: string, payload: CompetitorCreatePayload): Promise<{ data: Competitor }> {
    return apiClient.post(`/brands/${brandUuid}/competitors/`, payload)
  },

  update(brandUuid: string, competitorUuid: string, payload: Partial<CompetitorCreatePayload>): Promise<{ data: Competitor }> {
    return apiClient.patch(`/brands/${brandUuid}/competitors/${competitorUuid}/`, payload)
  },

  delete(brandUuid: string, competitorUuid: string): Promise<void> {
    return apiClient.delete(`/brands/${brandUuid}/competitors/${competitorUuid}/`)
  },

  analyze(brandUuid: string, competitorUuid: string): Promise<{ data: Competitor }> {
    return apiClient.post(`/brands/${brandUuid}/competitors/${competitorUuid}/analyze/`, {}, { timeout: 120_000 })
  },

  identify(brandUuid: string): Promise<{ data: Competitor[] }> {
    return apiClient.post(`/brands/${brandUuid}/competitors/identify/`, {}, { timeout: 120_000 })
  },

  insights(brandUuid: string): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post(`/brands/${brandUuid}/competitors/insights/`, {}, { timeout: 120_000 })
  },

  listAnalyses(brandUuid: string): Promise<{ data: CompetitorAnalysis[] }> {
    return apiClient.get(`/brands/${brandUuid}/competitor-analyses/`)
  },

  getAnalysis(brandUuid: string, analysisUuid: string): Promise<{ data: CompetitorAnalysis }> {
    return apiClient.get(`/brands/${brandUuid}/competitor-analyses/${analysisUuid}/`)
  },

  analyzeSocialMedia(brandUuid: string, socialMediaUuid: string): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post(`/brands/${brandUuid}/social-media-profiles/${socialMediaUuid}/analyze/`)
  },

  socialAudit(brandUuid: string): Promise<{ data: Record<string, unknown> }> {
    return apiClient.post(`/brands/${brandUuid}/social-media-audit/`)
  },
}
