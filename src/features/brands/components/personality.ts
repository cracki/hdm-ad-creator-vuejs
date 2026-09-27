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
 * Trait shares for the brand wheel. QA fix 2: the wheel renders ONLY from
 * real numeric trait weights in the payload — the previous equal-split
 * fallback (every trait exactly 20%) fabricated data and is removed.
 *
 * Backends can also flag availability explicitly (brand_personality
 * .wheel_available / brand_profile.personality_wheel_available): an explicit
 * `false` hides the wheel even when numeric shares exist; anything other
 * than `false` is ignored (unknown/missing = decide by the data itself).
 * Returns null when there is nothing real to draw.
 */
export function extractWheelShares(
  profile: Record<string, unknown> | null | undefined,
): TraitShare[] | null {
  if (!profile || typeof profile !== 'object') return null
  const bp = asRecord(profile.brand_personality)

  // Explicit opt-out from the backend wins over any data.
  if (
    bp.wheel_available === false ||
    profile.wheel_available === false ||
    profile.personality_wheel_available === false
  ) {
    return null
  }

  // Real numeric shares from the payload — record or array shaped.
  const rawShares = bp.trait_shares
  if (rawShares === null || rawShares === undefined) return null

  if (Array.isArray(rawShares)) {
    const entries = rawShares
      .map((entry): { name: string; value: number } | null => {
        const obj = asRecord(entry)
        const name = asString(obj.name) || asString(obj.label) || asString(obj.trait)
        const value = [obj.value, obj.percent, obj.share, obj.score].find(
          (v) => typeof v === 'number' && Number.isFinite(v),
        ) as number | undefined
        return name && value !== undefined && value > 0 ? { name, value } : null
      })
      .filter((e): e is { name: string; value: number } => e !== null)
    return normalizeShares(entries)
  }

  if (typeof rawShares === 'object') {
    const entries = Object.entries(rawShares as Record<string, unknown>).filter(
      ([, v]) => typeof v === 'number' && Number.isFinite(v) && (v as number) > 0,
    )
    return normalizeShares(entries.map(([name, v]) => ({ name, value: v as number })))
  }
  return null
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
