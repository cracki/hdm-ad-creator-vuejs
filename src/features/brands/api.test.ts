import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '@/shared/api/client'
import { brandsApi } from './api'

describe('brandsApi.listManagedServices — backend shape normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('normalizes the bare-array backend response to the wrapper + service_uuid shape', async () => {
    // The DRF ModelViewSet returns a plain array of {brand_service_uuid, ...}.
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [
        { brand_service_uuid: 'bs-1', name: 'Facials', source: 'scraped', created_at: '2026-01-01' },
        { brand_service_uuid: 'bs-2', name: 'Consultation', source: 'manual', created_at: '2026-01-02' },
      ],
    } as never)

    const res = await brandsApi.listManagedServices('b1')

    expect(res.data.success).toBe(true)
    expect(res.data.services).toHaveLength(2)
    expect(res.data.services[0]).toMatchObject({ service_uuid: 'bs-1', name: 'Facials', source: 'scraped' })
    expect(res.data.services[1].service_uuid).toBe('bs-2')
  })

  it('keeps an already-wrapped response and an existing service_uuid intact', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { success: true, services: [{ service_uuid: 'svc-9', name: 'X', source: 'campaign' }] },
    } as never)

    const res = await brandsApi.listManagedServices('b1')

    expect(res.data.services[0].service_uuid).toBe('svc-9')
  })

  it('returns an empty list for empty backend responses', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] } as never)

    const res = await brandsApi.listManagedServices('b1')

    expect(res.data.services).toEqual([])
    expect(res.data.success).toBe(true)
  })
})
