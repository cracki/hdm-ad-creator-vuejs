import { computed, type Ref } from 'vue'
import type { Brand } from '@/features/brands/types'

export interface ScoreFactor {
  key: string
  labelKey: string
  weight: number
  score: number
  maxScore: number
}

export interface BrandScoreResult {
  total: number
  maxTotal: number
  percentage: number
  grade: 'excellent' | 'good' | 'needsWork' | 'noData'
  gradeKey: string
  factors: ScoreFactor[]
}

export function useBrandScore(
  brand: Ref<Brand | null>,
  analysisRuns: Ref<any[] | null>,
  competitors: Ref<any[] | null>,
  socialProfiles: Ref<any[] | null>,
  assets: Ref<any[] | null>,
) {
  const factors = computed<ScoreFactor[]>(() => {
    if (!brand.value) return []

    return [
      {
        key: 'analysis',
        labelKey: 'score.analysisFactor',
        weight: 35,
        score: (analysisRuns.value?.filter((r: any) => r.status === 'completed').length ?? 0) > 0 ? 35 : 0,
        maxScore: 35,
      },
      {
        key: 'competitors',
        labelKey: 'score.competitorsFactor',
        weight: 25,
        score: Math.min(25, (competitors.value?.length ?? 0) * 5),
        maxScore: 25,
      },
      {
        key: 'social',
        labelKey: 'score.socialFactor',
        weight: 20,
        score: Math.min(20, (socialProfiles.value?.length ?? 0) * 5),
        maxScore: 20,
      },
      {
        key: 'assets',
        labelKey: 'score.assetsFactor',
        weight: 20,
        score: Math.min(20, (assets.value?.length ?? 0) * 5),
        maxScore: 20,
      },
    ]
  })

  const result = computed<BrandScoreResult>(() => {
    if (!brand.value || factors.value.length === 0) {
      return { total: 0, maxTotal: 100, percentage: 0, grade: 'noData', gradeKey: 'score.noAnalysis', factors: [] }
    }

    const total = factors.value.reduce((sum, f) => sum + f.score, 0)
    const maxTotal = factors.value.reduce((sum, f) => sum + f.maxScore, 0)
    const percentage = Math.round((total / maxTotal) * 100)

    let grade: BrandScoreResult['grade']
    let gradeKey: string
    if (percentage >= 75) { grade = 'excellent'; gradeKey = 'score.excellent' }
    else if (percentage >= 45) { grade = 'good'; gradeKey = 'score.good' }
    else { grade = 'needsWork'; gradeKey = 'score.needsWork' }

    return { total, maxTotal, percentage, grade, gradeKey, factors: factors.value }
  })

  return { result, factors }
}
