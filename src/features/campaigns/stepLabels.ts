import type { useI18n } from '@/shared/utils/i18n'

type T = ReturnType<typeof useI18n>['t']

/**
 * Backend step slugs (as returned in completion errors' `missing` array)
 * → localized step names. Falls back to the raw slug for unknown values.
 */
export function campaignStepLabel(slug: string, t: T): string {
  const known = [
    'segmentation',
    'ppc_viability',
    'funnel',
    'content_strategy',
    'meta_ads',
    'google_ads',
    'linkedin_ads',
  ] as const
  if ((known as readonly string[]).includes(slug)) {
    return t(`steps.${slug}` as Parameters<T>[0])
  }
  return slug
}

/** Localize a list of missing step slugs for the completion-error chips. */
export function campaignStepLabels(slugs: string[], t: T): string[] {
  return slugs.map((s) => campaignStepLabel(s, t))
}
