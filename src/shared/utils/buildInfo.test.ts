import { describe, it, expect, vi, afterEach } from 'vitest'
import { getBuildInfo, getBuildLabel } from './buildInfo'

/**
 * QA4-E0: build-version badge. `__BUILD_INFO__` is normally injected by the
 * `define` in vite.config.ts; tests stub the global instead.
 */

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('buildInfo', () => {
  it('returns the injected commit string when __BUILD_INFO__ is defined', () => {
    vi.stubGlobal('__BUILD_INFO__', { commit: '2ebf850', builtAt: '2026-10-07T10:00:00.000Z' })
    expect(getBuildInfo().commit).toBe('2ebf850')
    expect(getBuildInfo().builtAt).toBe('2026-10-07T10:00:00.000Z')
  })

  it('falls back to the "dev" commit when __BUILD_INFO__ is not injected (test environment)', () => {
    expect(getBuildInfo().commit).toBe('dev')
    expect(getBuildInfo().builtAt).toBe('')
  })

  it('badge label contains the commit and the "commit · date" separator', () => {
    vi.stubGlobal('__BUILD_INFO__', { commit: '2ebf850', builtAt: '2026-10-07T10:00:00.000Z' })
    const label = getBuildLabel()
    expect(label).toContain('2ebf850')
    expect(label).toMatch(/·/)
  })

  it('badge label is just the commit when builtAt is missing or unparsable', () => {
    vi.stubGlobal('__BUILD_INFO__', { commit: '2ebf850', builtAt: '' })
    expect(getBuildLabel()).toBe('2ebf850')

    vi.stubGlobal('__BUILD_INFO__', { commit: 'dev', builtAt: 'not-a-date' })
    expect(getBuildLabel()).toBe('dev')
  })
})
