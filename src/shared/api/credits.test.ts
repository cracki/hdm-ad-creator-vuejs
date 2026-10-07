import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/shared/api/client', () => ({
  default: { get: vi.fn() },
}))

import apiClient from '@/shared/api/client'
import { creditsApi, getCreditsSummary } from './credits'

describe('creditsApi — GET /credits/summary/ (QA4-img5)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches the summary from /credits/summary/ and unwraps the data', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { used_month: 1234, quota_month: 25000 },
    })

    const summary = await getCreditsSummary()

    expect(apiClient.get).toHaveBeenCalledWith('/credits/summary/')
    expect(summary).toEqual({ used_month: 1234, quota_month: 25000 })
  })

  it('passes through a null (unlimited) quota untouched', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { used_month: 500, quota_month: null },
    })

    const summary = await getCreditsSummary()

    expect(summary.quota_month).toBeNull()
    expect(creditsApi.summary).toBeDefined()
  })
})
