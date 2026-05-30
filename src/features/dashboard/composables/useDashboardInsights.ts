import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from '@/shared/utils/i18n'
import { useBrands } from '@/features/brands/queries'
import { useCampaigns } from '@/features/campaigns/queries'

interface Insight {
  key: string
  icon: string
}

export function useDashboardInsights() {
  const { t } = useI18n()
  const { data: brands } = useBrands()
  const { data: campaigns } = useCampaigns()

  const currentIndex = ref(0)
  let timer: ReturnType<typeof setInterval> | null = null

  const insights = computed<Insight[]>(() => {
    const list: Insight[] = []
    const brandList = brands.value ?? []
    const campaignList = campaigns.value ?? []
    const activeCampaigns = campaignList.filter(c => c.status === 'in_progress')

    if (brandList.length === 0) {
      list.push({ key: 'dashboard.insights.noBrands', icon: 'Building2' })
    }
    if (brandList.length > 0 && campaignList.length === 0) {
      list.push({ key: 'dashboard.insights.noCampaigns', icon: 'Megaphone' })
    }
    if (activeCampaigns.length > 0 && activeCampaigns.length < campaignList.length) {
      list.push({ key: 'dashboard.insights.incompleteCampaigns', icon: 'TrendingUp' })
    }
    if (brandList.length > 0 && brandList.length < 3) {
      list.push({ key: 'dashboard.insights.fewBrands', icon: 'Plus' })
    }
    if (list.length === 0) {
      list.push({ key: 'dashboard.insights.allGood', icon: 'Sparkles' })
    }
    return list
  })

  const currentInsight = computed(() => {
    if (insights.value.length === 0) return null
    return insights.value[currentIndex.value % insights.value.length]
  })

  const currentMessage = computed(() => {
    if (!currentInsight.value) return ''
    return t(currentInsight.value.key as any)
  })

  onMounted(() => {
    timer = setInterval(() => {
      currentIndex.value = (currentIndex.value + 1) % Math.max(insights.value.length, 1)
    }, 8000)
  })

  onUnmounted(() => {
    if (timer) clearInterval(timer)
  })

  return { currentInsight, currentMessage }
}
