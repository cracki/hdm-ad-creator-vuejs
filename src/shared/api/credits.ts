import apiClient from '@/shared/api/client'

/** Response of GET /api/v1/credits/summary/ — quota is null when unlimited. */
export interface CreditsSummary {
  used_month: number
  quota_month: number | null
}

export const creditsApi = {
  summary(): Promise<{ data: CreditsSummary }> {
    return apiClient.get('/credits/summary/')
  },
}

/** Fetch the real AI-credits usage for the current month (QA4-img5). */
export async function getCreditsSummary(): Promise<CreditsSummary> {
  const { data } = await creditsApi.summary()
  return data
}
