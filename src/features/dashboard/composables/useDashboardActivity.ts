import { computed } from 'vue'
import { useBrands } from '@/features/brands/queries'
import { useCampaigns } from '@/features/campaigns/queries'
import { useContentIntelligenceHistory } from '@/features/market/queries'
import { useFullFunnelHistory } from '@/features/fullFunnel/queries'

export interface ActivityItem {
  id: string
  type: 'brand' | 'campaign' | 'intelligence' | 'funnel'
  name: string
  subtitle: string
  date: Date
  route: string
}

export function useDashboardActivity() {
  const { data: brands } = useBrands()
  const { data: campaigns } = useCampaigns()
  const { data: intelligenceHistory } = useContentIntelligenceHistory()
  const { data: funnelHistory } = useFullFunnelHistory()

  const activities = computed<ActivityItem[]>(() => {
    const items: ActivityItem[] = []

    for (const b of brands.value ?? []) {
      items.push({
        id: `brand-${b.brand_uuid}`,
        type: 'brand',
        name: b.company_name,
        subtitle: b.selected_industry?.name ?? '',
        date: new Date(b.created_at),
        route: `/brands/${b.brand_uuid}`,
      })
    }

    for (const c of campaigns.value ?? []) {
      items.push({
        id: `campaign-${c.campaign_uuid}`,
        type: 'campaign',
        name: c.name,
        subtitle: c.brand?.company_name ?? '',
        date: new Date(c.created_at),
        route: `/campaigns/${c.campaign_uuid}`,
      })
    }

    for (const [idx, r] of (intelligenceHistory.value ?? []).entries()) {
      items.push({
        id: `intel-${idx}`,
        type: 'intelligence',
        name: 'Content Intelligence',
        subtitle: r.status ?? '',
        date: new Date(r.created_at ?? Date.now()),
        route: '/market/intelligence',
      })
    }

    for (const [idx, f] of (funnelHistory.value ?? []).entries()) {
      items.push({
        id: `funnel-${idx}`,
        type: 'funnel',
        name: 'Full Funnel',
        subtitle: f.status ?? '',
        date: new Date(f.created_at ?? Date.now()),
        route: '/campaigns/full-funnel',
      })
    }

    return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20)
  })

  return { activities }
}
