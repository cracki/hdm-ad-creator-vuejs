/**
 * Service suggestions for the pickers (QA round 3 fix 2). The brand's MANAGED
 * services (user-confirmed rows exposed by BrandSerializer) win outright; the
 * merged scan/analysis list is only a fallback and is capped so an extraction
 * junk flood (testimonial names, credits, …) can't dominate the picker.
 */

/** Fallback suggestions shown before the user expands for more. */
export const SERVICE_SUGGESTION_CAP = 6

export interface ServiceSuggestion {
  name: string
  score?: number | null
}

/**
 * BrandSerializer now exposes managed rows on the brand object
 * (`campaign.brand?.services` / `brand.services`). Accept both the row
 * objects and plain-string shapes defensively.
 */
export function managedServiceNames(services: unknown): string[] {
  if (!Array.isArray(services)) return []
  return services
    .map((s) => (typeof s === 'string' ? s : (s as { name?: unknown } | null)?.name))
    .filter((n): n is string => typeof n === 'string' && n.trim().length > 0)
}

/** Highest score first; unscored rows keep their relative order at the end. */
function byScoreDesc(a: ServiceSuggestion, b: ServiceSuggestion): number {
  const sa = typeof a.score === 'number' ? a.score : -1
  const sb = typeof b.score === 'number' ? b.score : -1
  return sb - sa
}

export interface ServiceSuggestionsResult {
  options: ServiceSuggestion[]
  /** True when the fallback list was capped and a "show more" is warranted. */
  capped: boolean
}

/**
 * Managed-first, capped-fallback suggestions.
 *  - managed names present → exactly those (order preserved, never capped);
 *  - otherwise the detected list, best-scored first, capped at `cap`
 *    (unless `showAll`).
 */
export function selectServiceSuggestions(
  managedNames: string[],
  detected: ServiceSuggestion[],
  cap: number = SERVICE_SUGGESTION_CAP,
  showAll = false,
): ServiceSuggestionsResult {
  if (managedNames.length) {
    return { options: managedNames.map((name) => ({ name })), capped: false }
  }
  const ranked = [...detected].sort(byScoreDesc)
  if (showAll || ranked.length <= cap) {
    return { options: ranked, capped: false }
  }
  return { options: ranked.slice(0, cap), capped: true }
}
