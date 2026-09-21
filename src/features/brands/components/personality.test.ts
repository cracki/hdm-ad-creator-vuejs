import { describe, it, expect } from 'vitest'
import {
  extractPersonality,
  extractRadarDimensions,
  extractWheelShares,
  extractTakeaways,
} from './personality'

/** Fixture shaped from the backend serializer's brand_profile payload. */
const fixtureProfile = {
  company_name: 'Lumen Skincare',
  industry: 'beauty',
  usp_list: ['Clean formulas', 'Dermatologist tested'],
  brand_voice: {
    tone: 'warm and clinical',
    style: 'short, reassuring sentences',
    persona: 'supportive expert',
    keywords: ['reassuring', 'precise'],
  },
  brand_personality: {
    tone: 'warm and clinical',
    voice_attributes: ['reassuring', 'precise', 'calm'],
    archetype: 'Caregiver',
    emoji_style: 'minimal',
    writing_style: 'short, reassuring sentences',
  },
  key_messages: ['Glow without the guesswork', 'Skincare backed by science'],
  competitive_advantages: ['Clinically tested formulas'],
}

describe('extractPersonality', () => {
  it('extracts archetype, tone, persona, style and voice attributes from a backend profile', () => {
    expect(extractPersonality(fixtureProfile)).toEqual({
      archetype: 'Caregiver',
      tone: 'warm and clinical',
      persona: 'supportive expert',
      writingStyle: 'short, reassuring sentences',
      emojiStyle: 'minimal',
      voiceAttributes: ['reassuring', 'precise', 'calm'],
    })
  })

  it('falls back to brand_voice tone/keywords when brand_personality omits them', () => {
    const profile = {
      brand_voice: { tone: 'bold', keywords: ['fearless'] },
    }
    expect(extractPersonality(profile)).toMatchObject({
      tone: 'bold',
      voiceAttributes: ['fearless'],
    })
  })

  it('returns null when the payload carries no personality data', () => {
    expect(extractPersonality(null)).toBeNull()
    expect(extractPersonality({})).toBeNull()
    expect(extractPersonality({ brand_personality: {}, brand_voice: {} })).toBeNull()
  })
})

describe('extractRadarDimensions', () => {
  it('extracts numeric dimension scores from a record-shaped scores field', () => {
    const profile = {
      brand_personality: {
        scores: { warmth: 82, authority: 45, playfulness: 20, trust: 90 },
      },
    }
    expect(extractRadarDimensions(profile)).toEqual([
      { name: 'warmth', value: 82 },
      { name: 'authority', value: 45 },
      { name: 'playfulness', value: 20 },
      { name: 'trust', value: 90 },
    ])
  })

  it('extracts dimensions from an array of {name, score} entries', () => {
    const profile = {
      brand_personality: {
        dimension_scores: [
          { label: 'warmth', score: 70 },
          { dimension: 'edge', value: 30 },
          { name: 'trust', score: 95 },
        ],
      },
    }
    expect(extractRadarDimensions(profile)).toEqual([
      { name: 'warmth', value: 70 },
      { name: 'edge', value: 30 },
      { name: 'trust', value: 95 },
    ])
  })

  it('returns null when the payload has no numeric scores (current backend)', () => {
    expect(extractRadarDimensions(fixtureProfile)).toBeNull()
    expect(extractRadarDimensions(null)).toBeNull()
    expect(extractRadarDimensions({ brand_personality: { scores: { a: 'high' } } })).toBeNull()
  })
})

describe('extractWheelShares', () => {
  it('splits the detected archetype defining traits evenly, summing to 100', () => {
    const shares = extractWheelShares(fixtureProfile)
    expect(shares).not.toBeNull()
    expect(shares!.every((s) => s.percent > 0)).toBe(true)
    expect(shares!.reduce((sum, s) => sum + s.percent, 0)).toBe(100)
    expect(shares!.map((s) => s.name)).toEqual(['Care', 'Support', 'Warmth', 'Protection', 'Generosity'])
  })

  it('uses explicit numeric trait shares from the payload when present', () => {
    const profile = {
      brand_personality: {
        archetype: 'Sage',
        trait_shares: { wisdom: 50, expertise: 30, authority: 20 },
      },
    }
    expect(extractWheelShares(profile)).toEqual([
      { name: 'wisdom', percent: 50 },
      { name: 'expertise', percent: 30 },
      { name: 'authority', percent: 20 },
    ])
  })

  it('returns null when there is no archetype and no shares', () => {
    expect(extractWheelShares(null)).toBeNull()
    expect(extractWheelShares({ brand_personality: {} })).toBeNull()
  })
})

describe('extractTakeaways', () => {
  it('combines key messages, competitive advantages and USPs, deduped and capped', () => {
    const takeaways = extractTakeaways(fixtureProfile)
    expect(takeaways).toEqual([
      'Glow without the guesswork',
      'Skincare backed by science',
      'Clinically tested formulas',
      'Clean formulas',
      'Dermatologist tested',
    ])
  })

  it('caps the list at the requested size', () => {
    const profile = { key_messages: ['a', 'b', 'c'], competitive_advantages: ['d', 'e', 'f'] }
    expect(extractTakeaways(profile, 4)).toHaveLength(4)
  })

  it('returns empty for missing data', () => {
    expect(extractTakeaways(null)).toEqual([])
    expect(extractTakeaways({})).toEqual([])
  })
})
