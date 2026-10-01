import { describe, it, expect } from 'vitest'
import {
  isPlaceholderValue,
  isHiddenPayloadKey,
  isEmptyPayloadValue,
  shouldHidePayloadEntry,
  prettifyPayloadKey,
  prettifyPayloadValue,
  payloadLabelKey,
  filterPlaceholderItems,
  isPlaceholderObject,
} from './payloadDisplay'

describe('isPlaceholderValue', () => {
  it('matches the fallback strings the backend emits', () => {
    expect(isPlaceholderValue('unknown')).toBe(true)
    expect(isPlaceholderValue('Unknown')).toBe(true)
    expect(isPlaceholderValue('N/A')).toBe(true)
    expect(isPlaceholderValue('n/a')).toBe(true)
    expect(isPlaceholderValue('Not found')).toBe(true)
    expect(isPlaceholderValue('Limited website content - unable to extract specific USPs')).toBe(true)
    expect(isPlaceholderValue('N/A - No USP identified')).toBe(true)
    expect(isPlaceholderValue('  ')).toBe(true)
  })

  it('keeps real values', () => {
    expect(isPlaceholderValue('Lumen Skincare')).toBe(false)
    expect(isPlaceholderValue('Clean formulas')).toBe(false)
    expect(isPlaceholderValue(0)).toBe(false)
    expect(isPlaceholderValue(null)).toBe(false)
  })
})

describe('isHiddenPayloadKey', () => {
  it('hides internal/debug keys', () => {
    expect(isHiddenPayloadKey('is_real_data')).toBe(true)
    expect(isHiddenPayloadKey('platforms_missing')).toBe(true)
    expect(isHiddenPayloadKey('content_hash')).toBe(true)
    expect(isHiddenPayloadKey('task_id')).toBe(true)
    expect(isHiddenPayloadKey('_internal')).toBe(true)
    expect(isHiddenPayloadKey('raw_html')).toBe(true)
    expect(isHiddenPayloadKey('schema_version')).toBe(true)
  })

  it('keeps user-facing keys', () => {
    expect(isHiddenPayloadKey('usp_list')).toBe(false)
    expect(isHiddenPayloadKey('brand_voice')).toBe(false)
    expect(isHiddenPayloadKey('data_source')).toBe(false)
  })
})

describe('isEmptyPayloadValue', () => {
  it('treats null, blank, [] and {} as empty but keeps real falsy values', () => {
    expect(isEmptyPayloadValue(null)).toBe(true)
    expect(isEmptyPayloadValue(undefined)).toBe(true)
    expect(isEmptyPayloadValue('')).toBe(true)
    expect(isEmptyPayloadValue('   ')).toBe(true)
    expect(isEmptyPayloadValue([])).toBe(true)
    expect(isEmptyPayloadValue({})).toBe(true)
    expect(isEmptyPayloadValue(0)).toBe(false)
    expect(isEmptyPayloadValue(false)).toBe(false)
    expect(isEmptyPayloadValue('0')).toBe(false)
  })
})

describe('shouldHidePayloadEntry', () => {
  it('hides internal keys, empty and placeholder values', () => {
    expect(shouldHidePayloadEntry('is_real_data', false)).toBe(true)
    expect(shouldHidePayloadEntry('industry', 'Unknown')).toBe(true)
    expect(shouldHidePayloadEntry('notes', '')).toBe(true)
    expect(shouldHidePayloadEntry('extras', {})).toBe(true)
  })

  it('hides string arrays whose every item is a placeholder', () => {
    expect(shouldHidePayloadEntry('usp_list', ['N/A - No USP identified'])).toBe(true)
    expect(shouldHidePayloadEntry('usp_list', ['unknown', 'n/a'])).toBe(true)
    expect(shouldHidePayloadEntry('usp_list', ['Clean formulas'])).toBe(false)
    expect(shouldHidePayloadEntry('cards', [{ name: 'x' }])).toBe(false)
  })
})

describe('prettifyPayloadKey', () => {
  it('turns snake_case into Title Case', () => {
    expect(prettifyPayloadKey('age_range')).toBe('Age Range')
    expect(prettifyPayloadKey('buying_behavior')).toBe('Buying Behavior')
    expect(prettifyPayloadKey('someVeryLongKey')).toBe('Some Very Long Key')
  })
})

describe('payloadLabelKey', () => {
  it('resolves known keys to a translation key and null for unknown ones', () => {
    expect(payloadLabelKey('usp_list')).toBe('payload.usp_list')
    expect(payloadLabelKey('target_audience')).toBe('payload.target_audience')
    expect(payloadLabelKey('definitely_not_mapped')).toBeNull()
  })
})

describe('filterPlaceholderItems', () => {
  it('drops placeholder items but keeps real ones', () => {
    expect(filterPlaceholderItems(['relax', 'unknown', 'licensed', 'N/A'])).toEqual(['relax', 'licensed'])
    expect(filterPlaceholderItems([1, 2])).toEqual([1, 2])
  })
})

// ── QA round 3 fix 3 ──

describe('personality_wheel_available (QA r3 fix 3)', () => {
  it('is an internal flag that must never render', () => {
    expect(isHiddenPayloadKey('personality_wheel_available')).toBe(true)
    expect(shouldHidePayloadEntry('personality_wheel_available', false)).toBe(true)
    expect(shouldHidePayloadEntry('personality_wheel_available', true)).toBe(true)
  })
})

describe('prettifyPayloadValue (QA r3 fix 3)', () => {
  it('renders plain snake_case values as Title Case', () => {
    expect(prettifyPayloadValue('trust_and_results')).toBe('Trust And Results')
    expect(prettifyPayloadValue('emotional_connection')).toBe('Emotional Connection')
  })

  it('leaves human text, ids and single words untouched', () => {
    expect(prettifyPayloadValue('Clean formulas')).toBe('Clean formulas')
    expect(prettifyPayloadValue('https://example.com/a_b')).toBe('https://example.com/a_b')
    expect(prettifyPayloadValue('modern')).toBe('modern')
    expect(prettifyPayloadValue('user_123')).toBe('User 123')
  })
})

describe('isPlaceholderObject (QA r3 fix 3)', () => {
  it('detects unfilled template-like entries', () => {
    expect(isPlaceholderObject({ trust: 'unknown', tone: 'N/A' })).toBe(true)
    expect(isPlaceholderObject({ trust: '', tone: null })).toBe(true)
    expect(isPlaceholderObject({ trust: 'high', tone: 'unknown' })).toBe(false)
    expect(isPlaceholderObject({})).toBe(false)
    expect(isPlaceholderObject(['unknown'])).toBe(false)
    expect(isPlaceholderObject(null)).toBe(false)
  })

  it('shouldHidePayloadEntry hides whole placeholder objects', () => {
    expect(shouldHidePayloadEntry('emotions', { trust: 'unknown', tone: 'N/A' })).toBe(true)
    expect(shouldHidePayloadEntry('emotions', { trust: 'high', tone: 'unknown' })).toBe(false)
  })
})
