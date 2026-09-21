/**
 * Content Intelligence insight actions (MOM): helpers for saving a market
 * insight into a campaign and building the client-side print brief.
 * Pure functions — no Vue/API dependencies — so the payload merge/cap rules
 * are unit-testable.
 */

export type MarketInsightView = 'gaps' | 'hooks' | 'matrix' | 'top_performers'

/** Shape persisted under campaign.context_payload.content_insights. */
export interface ContentInsightRef {
  source: 'market'
  view: MarketInsightView
  title: string
  snippet: string
  added_at: string
}

/** Hard cap on saved insights per campaign (oldest dropped past 20). */
export const CONTENT_INSIGHTS_CAP = 20

/**
 * Merge a new insight into a campaign's context_payload without clobbering
 * any existing keys: content_insights is appended (never replaced) and capped
 * at the last CONTENT_INSIGHTS_CAP entries. `source` is always "market".
 */
export function appendContentInsight(
  contextPayload: Record<string, unknown> | null | undefined,
  insight: Omit<ContentInsightRef, 'source' | 'added_at'> & { added_at?: string },
): { context_payload: Record<string, unknown> } {
  const current = contextPayload ?? {}
  const existing = Array.isArray(current.content_insights) ? current.content_insights : []
  const next = [
    ...existing,
    {
      source: 'market' as const,
      view: insight.view,
      title: insight.title,
      snippet: insight.snippet,
      added_at: insight.added_at ?? new Date().toISOString(),
    },
  ].slice(-CONTENT_INSIGHTS_CAP)
  return { context_payload: { ...current, content_insights: next } }
}

/** True when this exact insight (view + title) is already saved. */
export function isInsightSaved(
  contextPayload: Record<string, unknown> | null | undefined,
  view: MarketInsightView,
  title: string,
): boolean {
  const list = Array.isArray(contextPayload?.content_insights) ? contextPayload!.content_insights : []
  return list.some(
    (i) => (i as ContentInsightRef).source === 'market' && (i as ContentInsightRef).view === view && (i as ContentInsightRef).title === title,
  )
}

/** Client-side print-friendly markdown brief for one insight. */
export function buildInsightBrief(input: {
  view: MarketInsightView
  title: string
  snippet: string
  campaignName?: string
  angle?: string
  generatedAt?: string
}): string {
  const when = input.generatedAt ?? new Date().toISOString()
  const lines = [
    `# ${input.title}`,
    '',
    `- ${input.view}`,
    `- ${when}`,
    ...(input.campaignName ? [`- ${input.campaignName}`] : []),
    '',
    `## Insight`,
    '',
    input.snippet || '—',
    '',
    `## Suggested angle`,
    '',
    input.angle || input.snippet || '—',
    '',
    '---',
    `Generated with HDM AI Marketing Assistant`,
  ]
  return lines.join('\n')
}

/** Safe .md filename from a title (unicode-letter friendly slug). */
export function insightBriefFilename(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `content-brief-${slug || 'insight'}.md`
}
