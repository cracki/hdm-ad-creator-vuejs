import apiClient from '@/shared/api/client'
import type { Brand, BrandCreatePayload, Industry, BrandAsset, BrandSocialMedia, AnalysisRun, AnalysisStartPayload, BrandScanPayload, BrandScanResult, BrandServicesResponse, ManagedBrandServicesResponse, ManagedBrandServiceResult, CreateManagedServicePayload, UpdateManagedServicePayload } from './types'

type SignalConfig = { signal?: AbortSignal }

export const brandsApi = {
  list(config?: SignalConfig): Promise<{ data: Brand[] }> {
    return apiClient.get('/brands/', config)
  },

  get(uuid: string, config?: SignalConfig): Promise<{ data: Brand }> {
    return apiClient.get(`/brands/${uuid}/`, config)
  },

  create(payload: BrandCreatePayload): Promise<{ data: Brand }> {
    return apiClient.post('/brands/', payload)
  },

  update(uuid: string, payload: Partial<BrandCreatePayload>): Promise<{ data: Brand }> {
    return apiClient.patch(`/brands/${uuid}/`, payload)
  },

  delete(uuid: string): Promise<void> {
    return apiClient.delete(`/brands/${uuid}/`)
  },

  listIndustries(config?: SignalConfig): Promise<{ data: Industry[] }> {
    return apiClient.get('/industries/', config)
  },

  scanWebsite(payload: BrandScanPayload): Promise<{ data: BrandScanResult }> {
    return apiClient.post('/brands/scan/', payload, { timeout: 120_000 })
  },

  listServices(brandUuid: string, config?: SignalConfig): Promise<{ data: BrandServicesResponse }> {
    return apiClient.get(`/brands/${brandUuid}/services/`, config)
  },

  // Managed services — parallel backend contract (QA Fix 4): the merged list is
  // read via listServices(); these manage the editable entries.
  listManagedServices(brandUuid: string, config?: SignalConfig): Promise<{ data: ManagedBrandServicesResponse }> {
    return apiClient.get(`/brands/${brandUuid}/services/manage/`, config)
  },

  createManagedService(brandUuid: string, payload: CreateManagedServicePayload): Promise<{ data: ManagedBrandServiceResult }> {
    return apiClient.post(`/brands/${brandUuid}/services/manage/`, payload)
  },

  updateManagedService(brandUuid: string, serviceUuid: string, payload: UpdateManagedServicePayload): Promise<{ data: ManagedBrandServiceResult }> {
    return apiClient.patch(`/brands/${brandUuid}/services/manage/${serviceUuid}/`, payload)
  },

  deleteManagedService(brandUuid: string, serviceUuid: string): Promise<void> {
    return apiClient.delete(`/brands/${brandUuid}/services/manage/${serviceUuid}/`)
  },

  listAssets(brandUuid: string, config?: SignalConfig): Promise<{ data: BrandAsset[] }> {
    return apiClient.get(`/brands/${brandUuid}/assets/`, config)
  },

  uploadAsset(brandUuid: string, formData: FormData, onProgress?: (pct: number) => void): Promise<{ data: any }> {
    return apiClient.post(`/brands/${brandUuid}/assets/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (e.total && onProgress) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
  },

  deleteAsset(brandUuid: string, assetUuid: string): Promise<void> {
    return apiClient.delete(`/brands/${brandUuid}/assets/${assetUuid}/`)
  },

  analyzeAsset(brandUuid: string, assetUuid: string): Promise<{ data: any }> {
    return apiClient.post(`/brands/${brandUuid}/assets/${assetUuid}/analyze/`, {}, { timeout: 120_000 })
  },

  logoAnalysis(brandUuid: string): Promise<{ data: any }> {
    return apiClient.post(`/brands/${brandUuid}/logo-analysis/`, {}, { timeout: 120_000 })
  },

  listSocialMedia(brandUuid: string, config?: SignalConfig): Promise<{ data: BrandSocialMedia[] }> {
    return apiClient.get(`/brands/${brandUuid}/social-media-profiles/`, config)
  },

  createSocialMedia(brandUuid: string, payload: { platform: string; profile_url: string }): Promise<{ data: BrandSocialMedia }> {
    return apiClient.post(`/brands/${brandUuid}/social-media-profiles/`, payload)
  },

  updateSocialMedia(brandUuid: string, uuid: string, payload: Partial<{ platform: string; profile_url: string }>): Promise<{ data: BrandSocialMedia }> {
    return apiClient.patch(`/brands/${brandUuid}/social-media-profiles/${uuid}/`, payload)
  },

  deleteSocialMedia(brandUuid: string, uuid: string): Promise<void> {
    return apiClient.delete(`/brands/${brandUuid}/social-media-profiles/${uuid}/`)
  },

  listAnalysisRuns(brandUuid: string, config?: SignalConfig): Promise<{ data: AnalysisRun[] }> {
    return apiClient.get(`/brands/${brandUuid}/analysis-runs/`, config)
  },

  getAnalysisRun(brandUuid: string, runUuid: string, config?: SignalConfig): Promise<{ data: AnalysisRun }> {
    return apiClient.get(`/brands/${brandUuid}/analysis-runs/${runUuid}/`, config)
  },

  startAnalysis(brandUuid: string, payload: AnalysisStartPayload = {}): Promise<{ data: AnalysisRun }> {
    return apiClient.post(`/brands/${brandUuid}/analysis-runs/start/`, {
      include_social: payload.include_social ?? true,
      include_competitors: payload.include_competitors ?? true,
    }, { timeout: 120_000 })
  },
}
