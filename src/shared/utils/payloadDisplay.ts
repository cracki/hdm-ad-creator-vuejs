import { translations } from './translations'
import type { TKey } from './translations'

/**
 * Humanization layer for generic analysis payload renderers (MOM §4.4 باگ۷ /
 * QA fix 1). Raw snake_case DB keys never reach users:
 *  - known keys get localized labels (`payload.<key>` in translations.ts);
 *  - unknown keys fall back to Title-Case prettifying;
 *  - internal/debug keys and placeholder/empty values are hidden entirely.
 */

/** Translation key for a payload key when one exists ("age_range" → "payload.age_range"). */
export function payloadLabelKey(key: string): TKey | null {
  const tKey = `payload.${key}` as TKey
  return (translations as Record<string, unknown>)[tKey] ? tKey : null
}

/** snake_case / camelCase → Title Case fallback ("age_range" → "Age Range"). */
export function prettifyPayloadKey(key: string): string {
  return key
    .replace(/[_\-.]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Plain snake_case VALUE token ("trust_and_results") → Title Case
 * ("Trust And Results") — QA round 3 fix 3. Only untouched single-token
 * snake_case strings are rewritten; sentences, URLs, ids and already-human
 * strings pass through unchanged.
 */
const SNAKE_CASE_VALUE = /^[a-z0-9]+(?:_[a-z0-9]+)+$/
export function prettifyPayloadValue(value: string): string {
  return SNAKE_CASE_VALUE.test(value) ? prettifyPayloadKey(value) : value
}

/** Internal/debug keys that must never render. */
const HIDDEN_EXACT_KEYS = new Set([
  'is_real_data',
  'platforms_missing',
  'content_hash',
  'task_id',
  // Internal LLM flag leaked to the UI ("Personality Wheel Available: No").
  'personality_wheel_available',
])
const HIDDEN_KEY_PREFIXES = ['_', 'raw_', 'schema_']

export function isHiddenPayloadKey(key: string): boolean {
  if (HIDDEN_EXACT_KEYS.has(key)) return true
  return HIDDEN_KEY_PREFIXES.some((prefix) => key.startsWith(prefix))
}

/**
 * Placeholder fallback strings the backend emits instead of real data
 * ("unknown", "N/A", "Limited website content…"). Mirrors the analyzer
 * fallbacks in brand/analyzers/*.
 */
const PLACEHOLDER_EXACT = new Set([
  '',
  'unknown',
  'n/a',
  'na',
  'none',
  'null',
  'undefined',
  '-',
  'not found',
  'not available',
  'not specified',
  'not detected',
  'unspecified',
])
const PLACEHOLDER_PREFIXES = [
  'limited website content',
  'n/a -',
  'no usp identified',
]

export function isPlaceholderValue(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const v = value.trim().toLowerCase()
  if (PLACEHOLDER_EXACT.has(v)) return true
  return PLACEHOLDER_PREFIXES.some((prefix) => v.startsWith(prefix))
}

/** Nothing to show: null / undefined / "" / [] / {}. */
export function isEmptyPayloadValue(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim().length === 0
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * QA round 3 fix 3: a non-empty object whose EVERY value is a placeholder
 * string ("unknown", "N/A", …) is an unfilled LLM template — hide it whole
 * (e.g. template emotion entries rendered for brands they don't apply to).
 */
export function isPlaceholderObject(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return false
  return entries.every(([, v]) => isEmptyPayloadValue(v) || isPlaceholderValue(v))
}

/** True when a key/value pair must not render at all. */
export function shouldHidePayloadEntry(key: string, value: unknown): boolean {
  if (isHiddenPayloadKey(key)) return true
  if (isEmptyPayloadValue(value)) return true
  if (typeof value === 'string') return isPlaceholderValue(value)
  if (Array.isArray(value)) {
    const hasNonString = value.some((v) => typeof v !== 'string')
    if (!hasNonString) return value.every((v) => isPlaceholderValue(v))
  }
  if (isPlaceholderObject(value)) return true
  return false
}

/** Drop placeholder items from a string array before rendering. */
export function filterPlaceholderItems<T>(items: T[]): T[] {
  return items.filter((item) => !isPlaceholderValue(item))
}
