/**
 * Live per-section progress for brand analysis runs.
 *
 * The backend adds `sections_status` to the analysis-run payload:
 *   { [section]: { status: 'running' | 'completed' | 'failed', started_at, finished_at, error? } }
 * Sections (canonical order): website_scrape, core_analysis, quality_validation,
 * audience, social, competitors, recommendations.
 *
 * Older runs lack the field (or it is empty) — callers must fall back to the
 * poll-count-derived progress. `extractSectionStatus` returns null in that case.
 */

export const ANALYSIS_SECTIONS = [
  'website_scrape',
  'core_analysis',
  'quality_validation',
  'audience',
  'social',
  'competitors',
  'recommendations',
] as const

export type AnalysisSection = (typeof ANALYSIS_SECTIONS)[number]

export type SectionState = 'completed' | 'current' | 'upcoming' | 'failed'

export interface SectionStatus {
  status: 'running' | 'completed' | 'failed'
  started_at?: string | null
  finished_at?: string | null
  error?: string | null
}

/** Section key → status. Extra/unknown section keys from the backend are allowed. */
export type SectionStatusMap = Record<string, SectionStatus>

const VALID_SECTION_STATUSES = new Set(['running', 'completed', 'failed'])

/**
 * Extract a validated sections_status map from a run payload.
 * Returns null when the field is missing, empty, or carries no valid entries
 * (older runs) so callers keep their poll-count fallback.
 */
export function extractSectionStatus(run: unknown): SectionStatusMap | null {
  if (!run || typeof run !== 'object') return null
  const raw = (run as Record<string, unknown>).sections_status
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const map: SectionStatusMap = {}
  for (const [section, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue
    const status = (value as Record<string, unknown>).status
    if (typeof status !== 'string' || !VALID_SECTION_STATUSES.has(status)) continue
    const entry = value as Record<string, unknown>
    map[section as AnalysisSection] = {
      status: status as SectionStatus['status'],
      started_at: typeof entry.started_at === 'string' ? entry.started_at : null,
      finished_at: typeof entry.finished_at === 'string' ? entry.finished_at : null,
      error: typeof entry.error === 'string' ? entry.error : null,
    }
  }

  return Object.keys(map).length > 0 ? map : null
}

/**
 * Per-stage states (ProgressIndicator compatible) for the canonical section
 * order. Sections without an entry yet show as 'upcoming'; unknown extra
 * sections reported by the backend are appended at the end.
 */
export function sectionStageStates(statuses: SectionStatusMap): SectionState[] {
  const known = ANALYSIS_SECTIONS.map((section) => {
    const status = statuses[section]?.status
    if (status === 'completed') return 'completed' as const
    if (status === 'failed') return 'failed' as const
    if (status === 'running') return 'current' as const
    return 'upcoming' as const
  })
  const extras = Object.keys(statuses)
    .filter((s) => !(ANALYSIS_SECTIONS as readonly string[]).includes(s))
    .map((section) => {
      const status = statuses[section as AnalysisSection]?.status
      if (status === 'completed') return 'completed' as const
      if (status === 'failed') return 'failed' as const
      if (status === 'running') return 'current' as const
      return 'upcoming' as const
    })
  return [...known, ...extras]
}

/** First failed section (canonical order) that carries an error message. */
export function firstSectionError(statuses: SectionStatusMap): string | null {
  for (const section of ANALYSIS_SECTIONS) {
    const entry = statuses[section]
    if (entry?.status === 'failed' && entry.error) return entry.error
  }
  const extras = Object.keys(statuses).filter((s) => !(ANALYSIS_SECTIONS as readonly string[]).includes(s))
  for (const section of extras) {
    const entry = statuses[section as AnalysisSection]
    if (entry?.status === 'failed' && entry.error) return entry.error
  }
  return null
}
