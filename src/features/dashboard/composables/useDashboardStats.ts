import { computed } from 'vue'
import { useBrands } from '@/features/brands/queries'
import { useCampaigns } from '@/features/campaigns/queries'
import type { DashboardStats } from '../types'

export function useDashboardStats() {
  const { data: brands } = useBrands()
  const { data: campaigns } = useCampaigns()

  const stats = computed<DashboardStats>(() => {
    const now = Date.now()
    const day7 = 7 * 24 * 60 * 60 * 1000
    const brandList = brands.value ?? []
    const campaignList = campaigns.value ?? []

    const brandGrowthLast7d = brandList.filter(b => now - new Date(b.created_at).getTime() < day7).length
    const brandGrowthPrev7d = brandList.filter(b => {
      const diff = now - new Date(b.created_at).getTime()
      return diff >= day7 && diff < day7 * 2
    }).length

    const activeCampaigns = campaignList.filter(c => c.status === 'in_progress').length
    const completedCampaigns = campaignList.filter(c => c.status === 'completed').length

    return {
      brands: brandList.length,
      activeCampaigns,
      completedCampaigns,
      totalCampaigns: campaignList.length,
      brandGrowthLast7d,
      brandGrowthPrev7d,
      avgBrandScore: 0,
      brandScoreGrade: 'noData' as const,
    }
  })

  return { stats }
}
