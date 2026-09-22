/**
 * Extractors for brand personality visuals (MOM §4.3) from the analysis-run
 * `brand_profile` payload.
 *
 * Backend shape (brand/services/builder.py → BrandProfile):
 * {
 *   brand_voice:      { tone, style, persona, keywords: string[] },
 *   brand_personality:{ tone, voice_attributes: string[], archetype,
 *                       emoji_style, writing_style },
 *   key_messages: string[], competitive_advantages: string[], ...
 * }
 *
 * Numeric personality dimension scores are not produced by the current
 * backend — when present (future payload versions emit e.g.
 * `brand_personality.scores`), the radar renders them; otherwise it stays
 * hidden. Nothing here invents scores.
 */

export interface PersonalityData {
  archetype: string
  tone: string
  persona: string
  writingStyle: string
  emojiStyle: string
  voiceAttributes: string[]
}

export interface DimensionScore {
  name: string
  value: number
}

export interface TraitShare {
  name: string
  percent: number
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).map((v) => v.trim())
    : []
}

/** Personality summary from brand_personality + brand_voice. Null when absent. */
export function extractPersonality(
  profile: Record<string, unknown> | null | undefined,
): PersonalityData | null {
  if (!profile || typeof profile !== 'object') return null
  const bp = asRecord(profile.brand_personality)
  const bv = asRecord(profile.brand_voice)

  const data: PersonalityData = {
    archetype: asString(bp.archetype),
    tone: asString(bp.tone) || asString(bv.tone),
    persona: asString(bv.persona),
    writingStyle: asString(bp.writing_style),
    emojiStyle: asString(bp.emoji_style),
    voiceAttributes: asStringList(bp.voice_attributes).length
      ? asStringList(bp.voice_attributes)
      : asStringList(bv.keywords),
  }

  const hasAnything =
    data.archetype || data.tone || data.persona || data.writingStyle || data.voiceAttributes.length > 0
  return hasAnything ? data : null
}

/**
 * Numeric personality/voice dimension scores for the radar chart. Renders only
 * from real numbers in the payload — supported shapes:
 *   scores/dimension_scores/trait_scores: { "dim": 0..100, ... }
 *   scores/dimension_scores/trait_scores: [{ name|label|dimension, score|value }]
 * Returns null when the payload carries no numeric dimensions.
 */
export function extractRadarDimensions(
  profile: Record<string, unknown> | null | undefined,
): DimensionScore[] | null {
  if (!profile || typeof profile !== 'object') return null
  const bp = asRecord(profile.brand_personality)

  for (const key of ['scores', 'dimension_scores', 'trait_scores']) {
    const raw = bp[key] ?? asRecord(profile.brand_voice)[key]
    if (raw === undefined || raw === null) continue

    if (Array.isArray(raw)) {
      const dims = raw
        .map((entry): DimensionScore | null => {
          const obj = asRecord(entry)
          const name =
            asString(obj.name) || asString(obj.label) || asString(obj.dimension) || asString(obj.trait)
          const value = typeof obj.score === 'number' ? obj.score : typeof obj.value === 'number' ? obj.value : NaN
          return name && Number.isFinite(value) ? { name, value } : null
        })
        .filter((d): d is DimensionScore => d !== null)
      return dims.length >= 3 ? dims : null
    }

    if (typeof raw === 'object') {
      const dims = Object.entries(raw as Record<string, unknown>)
        .filter(([, v]) => typeof v === 'number' && Number.isFinite(v))
        .map(([name, v]) => ({ name, value: v as number }))
      return dims.length >= 3 ? dims : null
    }
  }
  return null
}

/**
 * Defining traits per brand archetype (mirrors brand/services/builder.py).
 * A definitional decomposition of the detected archetype — not measured scores.
 */
const ARCHETYPE_TRAITS: Record<string, string[]> = {
  Sage: ['Wisdom', 'Expertise', 'Insight', 'Education', 'Authority'],
  Hero: ['Courage', 'Achievement', 'Mastery', 'Boldness', 'Discipline'],
  Creator: ['Innovation', 'Craft', 'Originality', 'Vision', 'Expression'],
  Ruler: ['Prestige', 'Excellence', 'Control', 'Sophistication', 'Status'],
  Caregiver: ['Care', 'Support', 'Warmth', 'Protection', 'Generosity'],
  Everyman: ['Reliability', 'Honesty', 'Friendliness', 'Accessibility', 'Belonging'],
  Lover: ['Passion', 'Elegance', 'Intimacy', 'Beauty', 'Indulgence'],
  Jester: ['Fun', 'Playfulness', 'Humor', 'Spontaneity', 'Joy'],
  Magician: ['Transformation', 'Vision', 'Inspiration', 'Wonder', 'Change'],
  Innocent: ['Simplicity', 'Purity', 'Optimism', 'Honesty', 'Safety'],
  Rebel: ['Disruption', 'Unconventionality', 'Edge', 'Freedom', 'Defiance'],
  Explorer: ['Adventure', 'Discovery', 'Independence', 'Freedom', 'Pioneering'],
}

/**
 * Trait shares for the brand wheel. Explicit numeric shares win when the
 * payload provides them; otherwise the detected archetype's defining traits
 * split evenly. Null when nothing to draw (no archetype, no shares).
 */
export function extractWheelShares(
  profile: Record<string, unknown> | null | undefined,
): TraitShare[] | null {
  if (!profile || typeof profile !== 'object') return null
  const bp = asRecord(profile.brand_personality)

  // Explicit numeric shares from the payload, when present.
  const rawShares = bp.trait_shares
  if (typeof rawShares === 'object' && rawShares !== null && !Array.isArray(rawShares)) {
    const entries = Object.entries(rawShares as Record<string, unknown>).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v) && (v as number) > 0,
    )
    return normalizeShares(entries.map(([name, v]) => ({ name, value: v as number })))
  }

  const archetype = asString(bp.archetype)
  const traits = ARCHETYPE_TRAITS[archetype]
  if (!traits) return null
  return normalizeShares(traits.map((name) => ({ name, value: 1 })))
}

function normalizeShares(entries: { name: string; value: number }[]): TraitShare[] | null {
  if (entries.length < 2) return null
  const total = entries.reduce((sum, e) => sum + e.value, 0)
  if (total <= 0) return null

  // Round to whole percentages, adjusting the largest slice so it sums to 100.
  const raw = entries.map((e) => ({ name: e.name, percent: (e.value / total) * 100 }))
  const rounded = raw.map((e) => ({ name: e.name, percent: Math.round(e.percent) }))
  const drift = 100 - rounded.reduce((sum, e) => sum + e.percent, 0)
  if (drift !== 0) {
    const largest = rounded.reduce((a, b) => (b.percent > a.percent ? b : a))
    largest.percent += drift
  }
  return rounded
}

/** Key takeaways: key messages + competitive advantages (deduped, capped). */
export function extractTakeaways(
  profile: Record<string, unknown> | null | undefined,
  cap = 6,
): string[] {
  if (!profile || typeof profile !== 'object') return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const source of ['key_messages', 'competitive_advantages', 'usp_list']) {
    for (const message of asStringList(profile[source])) {
      const dedupeKey = message.toLowerCase()
      if (seen.has(dedupeKey)) continue
      seen.add(dedupeKey)
      out.push(message)
      if (out.length >= cap) return out
    }
  }
  return out
}
