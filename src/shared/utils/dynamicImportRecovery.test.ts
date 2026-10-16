import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDynamicImportFailure,
  shouldRecover,
  hasRecoveryAttempted,
  markRecoveryAttempt,
  clearRecoveryFlag,
} from './dynamicImportRecovery'

beforeEach(() => {
  sessionStorage.clear()
})

describe('isDynamicImportFailure / shouldRecover pattern matching (QA5 stale-chunk recovery)', () => {
  it.each([
    // Chrome / Edge
    'TypeError: Failed to fetch dynamically imported module: https://app.test/assets/BrandAnalysisView-Cp3TeQxI.js',
    // Firefox
    'Importing a module script failed: "https://app.test/assets/BrandAnalysisView-Cp3TeQxI.js"',
    // Safari
    'error loading dynamically imported module "https://app.test/assets/BrandAnalysisView-Cp3TeQxI.js"',
    // Safari, older casing
    'Error loading dynamically imported module: https://app.test/assets/x.js',
  ])('matches browser dynamic-import failure message: %s', (message) => {
    expect(isDynamicImportFailure(new Error(message))).toBe(true)
    expect(isDynamicImportFailure(message)).toBe(true)
    expect(shouldRecover(new Error(message))).toBe(true)
    expect(shouldRecover(message)).toBe(true)
  })

  it('does not match unrelated errors', () => {
    expect(isDynamicImportFailure(new Error('Network Error'))).toBe(false)
    expect(isDynamicImportFailure(new Error('Failed to fetch'))).toBe(false)
    expect(isDynamicImportFailure(new Error('NavigationDuplicated'))).toBe(false)
    expect(isDynamicImportFailure(undefined)).toBe(false)
    expect(isDynamicImportFailure(null)).toBe(false)
    expect(isDynamicImportFailure({})).toBe(false)
    expect(shouldRecover(new Error('Network Error'))).toBe(false)
    expect(shouldRecover(new Error('Failed to fetch'))).toBe(false)
  })
})

describe('mark/has/clear roundtrip — one recovery reload per session', () => {
  it('router condition (shouldRecover && !hasRecoveryAttempted) allows exactly one attempt per session', () => {
    const err = new Error('Failed to fetch dynamically imported module: https://app.test/assets/x.js')

    // Fresh session: pattern matches and no attempt recorded yet.
    expect(shouldRecover(err)).toBe(true)
    expect(hasRecoveryAttempted()).toBe(false)

    markRecoveryAttempt()

    // After the recovery reload the flag blocks a second reload (no loop),
    // even though the error pattern still matches.
    expect(shouldRecover(err)).toBe(true)
    expect(hasRecoveryAttempted()).toBe(true)

    // After a successful navigation the guard is cleared, so a future deploy
    // can self-heal again in the same session.
    clearRecoveryFlag()
    expect(hasRecoveryAttempted()).toBe(false)
  })

  it('marking a recovery attempt twice is idempotent', () => {
    markRecoveryAttempt()
    markRecoveryAttempt()
    expect(hasRecoveryAttempted()).toBe(true)
    clearRecoveryFlag()
    expect(hasRecoveryAttempted()).toBe(false)
  })

  it('clearing a flag that was never set is a no-op', () => {
    clearRecoveryFlag()
    expect(hasRecoveryAttempted()).toBe(false)
  })
})
