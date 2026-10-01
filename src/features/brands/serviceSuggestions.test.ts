import { describe, it, expect } from 'vitest'
import {
  managedServiceNames,
  selectServiceSuggestions,
  SERVICE_SUGGESTION_CAP,
} from './serviceSuggestions'

describe('managedServiceNames', () => {
  it('reads names from BrandSerializer managed rows', () => {
    expect(managedServiceNames([{ name: 'Coaching' }, { name: 'Mentorship', source: 'manual' }]))
      .toEqual(['Coaching', 'Mentorship'])
  })

  it('accepts plain-string shapes and drops blanks/non-strings', () => {
    expect(managedServiceNames(['Coaching', '', null, { name: 'Yoga' }, 42]))
      .toEqual(['Coaching', 'Yoga'])
  })

  it('returns [] for non-array input', () => {
    expect(managedServiceNames(undefined)).toEqual([])
    expect(managedServiceNames(null)).toEqual([])
    expect(managedServiceNames({})).toEqual([])
  })
})

describe('selectServiceSuggestions — managed-first, capped fallback (QA r3 fix 2)', () => {
  const detected = [
    { name: 'Junk A', score: 10 },
    { name: 'Web Design', score: 90 },
    { name: 'Unscored' },
    { name: 'SEO', score: 50 },
    { name: 'Workshops', score: 70 },
    { name: 'Retreats', score: 60 },
    { name: 'Junk B', score: 5 },
    { name: 'Consulting', score: 40 },
  ]

  it('returns ONLY the managed services when present (never capped)', () => {
    const res = selectServiceSuggestions(['Coaching', 'Mentorship'], detected)
    expect(res.options.map((o) => o.name)).toEqual(['Coaching', 'Mentorship'])
    expect(res.capped).toBe(false)
  })

  it('falls back to the detected list capped at 6, best score first', () => {
    const res = selectServiceSuggestions([], detected)
    expect(res.capped).toBe(true)
    expect(res.options).toHaveLength(SERVICE_SUGGESTION_CAP)
    // 90, 70, 60, 50, 40, 10 — unscored last, the lowest junk pushed out
    expect(res.options.map((o) => o.name)).toEqual([
      'Web Design', 'Workshops', 'Retreats', 'SEO', 'Consulting', 'Junk A',
    ])
  })

  it('shows everything when showAll is set', () => {
    const res = selectServiceSuggestions([], detected, SERVICE_SUGGESTION_CAP, true)
    expect(res.options).toHaveLength(detected.length)
    expect(res.capped).toBe(false)
  })

  it('does not cap short fallback lists', () => {
    const res = selectServiceSuggestions([], [{ name: 'A' }, { name: 'B' }])
    expect(res.options.map((o) => o.name)).toEqual(['A', 'B'])
    expect(res.capped).toBe(false)
  })
})
