import { describe, it, expect } from 'vitest'
import { translations } from './translations'
import { LANGS } from './i18n'

/**
 * i18n completeness guard: every key must provide a non-empty string for ALL
 * three locales (en/ar/fa) and nothing else. Catches future drift — a key
 * added with only English, or a locale accidentally dropped/emptied, fails
 * here instead of rendering blank in Arabic/Farsi.
 */
describe('translations completeness', () => {
  const localeCodes = LANGS.map((l) => l.code).sort()
  const entries = Object.entries(translations)

  it('has the three expected locales (en, ar, fa)', () => {
    expect(localeCodes).toEqual(['ar', 'en', 'fa'])
  })

  it('every key defines exactly the three LANGS locales', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const [key, entry] of entries) {
      expect.soft(Object.keys(entry).sort(), `locale set of "${key}"`).toEqual(localeCodes)
    }
  })

  it('every key provides a non-empty string for every locale', () => {
    for (const [key, entry] of entries) {
      for (const code of LANGS.map((l) => l.code)) {
        const value = (entry as Record<string, unknown>)[code]
        expect.soft(
          typeof value === 'string' && value.trim().length > 0,
          `${key}.${code} is missing or empty`,
        ).toBe(true)
      }
    }
  })
})
