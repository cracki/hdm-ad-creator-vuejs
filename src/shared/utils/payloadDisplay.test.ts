import { describe, it, expect } from 'vitest'
import {
  isPlaceholderValue,
  isHiddenPayloadKey,
  isEmptyPayloadValue,
  shouldHidePayloadEntry,
  prettifyPayloadKey,
  payloadLabelKey,
  filterPlaceholderItems,
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
