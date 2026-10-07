import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PlatformRecommendationSummary from './PlatformRecommendationSummary.vue'
import { useI18n } from '@/shared/utils/i18n'
import type { PlatformRecommendationsResult } from '../types'

/**
 * QA4-img18: warning platform slugs must render as a human-label chip
 * (e.g. "LinkedIn"), never as raw "[linkedin]" bracket text.
 */

function buildResult(overrides: Partial<PlatformRecommendationsResult> = {}): PlatformRecommendationsResult {
  return {
    success: true,
    recommendations: [],
    ...overrides,
  } as PlatformRecommendationsResult
}

describe('PlatformRecommendationSummary — warning platform chips (QA4-img18)', () => {
  const { setLang } = useI18n()

  beforeEach(() => setLang('en'))
  afterEach(() => setLang('en'))

  it('shows a "LinkedIn" chip for a platform slug and no chip for a null platform', () => {
    const wrapper = mount(PlatformRecommendationSummary, {
      props: {
        result: buildResult({
          warnings: [
            { type: 'reach', platform: 'linkedin', message: 'B2B reach is lower on LinkedIn for this objective' },
            { type: 'budget', platform: null, message: 'Budget may be tight across three platforms' },
          ],
        }),
      },
    })

    const warningsCard = wrapper.find('[data-testid="rec-warnings"]')
    expect(warningsCard.exists()).toBe(true)

    const chips = wrapper.findAll('[data-testid="platform-warning-chip"]')
    expect(chips.map((c) => c.text())).toEqual(['LinkedIn'])

    // The message text is untouched and the first warning carries its chip
    expect(wrapper.find('[data-testid="rec-warning-0"]').text())
      .toContain('B2B reach is lower on LinkedIn for this objective')
    expect(wrapper.find('[data-testid="rec-warning-1"]').text())
      .toContain('Budget may be tight across three platforms')
    expect(wrapper.find('[data-testid="rec-warning-1"]').find('[data-testid="platform-warning-chip"]').exists())
      .toBe(false)

    // No literal bracket text anywhere in the warnings card
    expect(warningsCard.text()).not.toContain('[')
    expect(warningsCard.text()).not.toContain(']')
  })

  it('falls back to a capitalized label for unknown slugs', () => {
    const wrapper = mount(PlatformRecommendationSummary, {
      props: {
        result: buildResult({
          warnings: [{ type: 'note', platform: 'pinterest', message: 'Consider Pinterest boards' }],
        }),
      },
    })

    expect(wrapper.find('[data-testid="platform-warning-chip"]').text()).toBe('Pinterest')
  })

  it('maps known slugs to their human labels', () => {
    const wrapper = mount(PlatformRecommendationSummary, {
      props: {
        result: buildResult({
          warnings: [
            { type: 'note', platform: 'google', message: 'A' },
            { type: 'note', platform: 'meta', message: 'B' },
          ],
        }),
      },
    })

    expect(wrapper.findAll('[data-testid="platform-warning-chip"]').map((c) => c.text()))
      .toEqual(['Google', 'Meta'])
  })

  it('renders no warnings card when there are no warnings', () => {
    const wrapper = mount(PlatformRecommendationSummary, { props: { result: buildResult() } })

    expect(wrapper.find('[data-testid="rec-warnings"]').exists()).toBe(false)
  })
})
