import { describe, it, expect } from 'vitest'
import {
  ANALYSIS_SECTIONS,
  extractSectionStatus,
  sectionStageStates,
  firstSectionError,
} from './sectionProgress'

const fullStatus = {
  website_scrape: { status: 'completed', started_at: 't1', finished_at: 't2' },
  core_analysis: { status: 'completed' },
  quality_validation: { status: 'running' },
}

describe('extractSectionStatus', () => {
  it('extracts a validated sections_status map from the run payload', () => {
    const run = { status: 'running', sections_status: fullStatus }
    expect(extractSectionStatus(run)).toEqual({
      website_scrape: { status: 'completed', started_at: 't1', finished_at: 't2', error: null },
      core_analysis: { status: 'completed', started_at: null, finished_at: null, error: null },
      quality_validation: { status: 'running', started_at: null, finished_at: null, error: null },
    })
  })

  it('returns null when sections_status is missing (older runs)', () => {
    expect(extractSectionStatus({ status: 'running' })).toBeNull()
    expect(extractSectionStatus(null)).toBeNull()
    expect(extractSectionStatus('nope')).toBeNull()
  })

  it('returns null when sections_status is empty or carries no valid entries', () => {
    expect(extractSectionStatus({ sections_status: {} })).toBeNull()
    expect(extractSectionStatus({ sections_status: { audience: { status: 'bogus' } } })).toBeNull()
    expect(extractSectionStatus({ sections_status: { audience: 'running' } })).toBeNull()
  })
})

describe('sectionStageStates', () => {
  it('maps the seven canonical sections in backend order', () => {
    expect(ANALYSIS_SECTIONS).toEqual([
      'website_scrape',
      'core_analysis',
      'quality_validation',
      'audience',
      'social',
      'competitors',
      'recommendations',
    ])
  })

  it('derives per-stage states: completed/current/failed, missing sections upcoming', () => {
    const states = sectionStageStates({
      website_scrape: { status: 'completed' },
      core_analysis: { status: 'completed' },
      quality_validation: { status: 'running' },
      audience: { status: 'upcoming-placeholder' as never },
    })
    expect(states).toEqual([
      'completed',
      'completed',
      'current',
      'upcoming',
      'upcoming',
      'upcoming',
      'upcoming',
    ])
  })

  it('appends unknown extra sections reported by the backend', () => {
    const states = sectionStageStates({
      website_scrape: { status: 'failed' },
      brand_new_section: { status: 'completed' },
    })
    expect(states).toEqual(['failed', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'completed'])
  })
})

describe('firstSectionError', () => {
  it('returns the first failed section error in canonical order', () => {
    expect(firstSectionError({
      competitors: { status: 'failed', error: 'competitor LLM timed out' },
      website_scrape: { status: 'failed', error: 'scrape blocked' },
    })).toBe('scrape blocked')
  })

  it('ignores failed sections without an error and returns null when none failed', () => {
    expect(firstSectionError({ social: { status: 'failed' } })).toBeNull()
    expect(firstSectionError({ social: { status: 'completed' } })).toBeNull()
  })

  it('checks extra sections after the canonical ones', () => {
    expect(firstSectionError({
      extra_step: { status: 'failed', error: 'boom' },
      website_scrape: { status: 'completed' },
    })).toBe('boom')
  })
})
