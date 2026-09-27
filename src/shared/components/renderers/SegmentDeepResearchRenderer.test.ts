import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import SegmentDeepResearchRenderer from './SegmentDeepResearchRenderer.vue'
import { useI18n } from '@/shared/utils/i18n'

/**
 * QA fix 3 (Terminology): deep-research language patterns must render
 * "use" and "avoid" vocabulary as two distinct, labeled groups — never as
 * one mixed, undifferentiated list. A flat list is never split by guessing.
 */

/** Shape produced by the backend deep_research_engine (language_patterns). */
const structuredPayload = {
  audience_insights: { summary: 'Busy professionals in Dubai' },
  language_patterns: {
    words_they_use: ['relax', 'licensed', 'professional massage'],
    phrases_to_avoid: ['cheap massage', 'massage girls', 'unlicensed'],
    emotional_triggers: ['trust', 'safety'],
    technical_vs_simple: 'simple',
    tone_preferences: ['friendly'],
  },
}

const flatPayload = {
  language_patterns: ['relax', 'licensed', 'cheap massage', 'unlicensed'],
}

describe('SegmentDeepResearchRenderer — language patterns (QA fix 3)', () => {
  const { setLang } = useI18n()

  beforeEach(() => setLang('en'))
  afterEach(() => setLang('en'))

  it('renders structured words as separate Use and Avoid groups with distinct chips', () => {
    const wrapper = mount(SegmentDeepResearchRenderer, { props: { data: structuredPayload } })

    const useGroup = wrapper.find('[data-testid="lang-use-group"]')
    const avoidGroup = wrapper.find('[data-testid="lang-avoid-group"]')
    expect(useGroup.exists()).toBe(true)
    expect(avoidGroup.exists()).toBe(true)

    expect(useGroup.findAll('[data-testid="lang-use-chip"]').map((c) => c.text()))
      .toEqual(['relax', 'licensed', 'professional massage'])
    expect(avoidGroup.findAll('[data-testid="lang-avoid-chip"]').map((c) => c.text()))
      .toEqual(['cheap massage', 'massage girls', 'unlicensed'])

    // Good and bad words never share a group
    expect(useGroup.text()).not.toContain('cheap massage')
    expect(avoidGroup.text()).not.toContain('relax')

    // Remaining structured keys still render
    expect(wrapper.find('[data-testid="language-patterns"]').text()).toContain('Emotional triggers')
    expect(wrapper.text()).toContain('trust')
  })

  it('accepts the words_to_use / words_to_avoid key spelling too', () => {
    const wrapper = mount(SegmentDeepResearchRenderer, {
      props: {
        data: { language_patterns: { words_to_use: ['calm'], words_to_avoid: ['discount'] } },
      },
    })
    expect(wrapper.find('[data-testid="lang-use-chip"]').text()).toBe('calm')
    expect(wrapper.find('[data-testid="lang-avoid-chip"]').text()).toBe('discount')
  })

  it('renders a flat list as ONE group with a hint — never splits by guessing', () => {
    const wrapper = mount(SegmentDeepResearchRenderer, { props: { data: flatPayload } })

    expect(wrapper.find('[data-testid="lang-flat-group"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="lang-flat-chip"]').map((c) => c.text()))
      .toEqual(['relax', 'licensed', 'cheap massage', 'unlicensed'])
    // No use/avoid styling is invented for a flat list
    expect(wrapper.find('[data-testid="lang-use-group"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="lang-avoid-group"]').exists()).toBe(false)
    // Backend-agnostic hint explains the group
    expect(wrapper.text()).toContain('Terms extracted from audience research')
  })

  it('localizes the group labels', () => {
    setLang('fa')
    const wrapper = mount(SegmentDeepResearchRenderer, { props: { data: structuredPayload } })
    const text = wrapper.text()
    expect(text).toContain('استفاده کن')
    expect(text).toContain('اجتناب کن')
    expect(text).toContain('الگوهای زبانی')
  })

  it('renders nested language patterns inside a parent section with the same grouping', () => {
    const wrapper = mount(SegmentDeepResearchRenderer, {
      props: {
        data: {
          segment_research: {
            language_patterns: { words_they_use: ['calm'], phrases_to_avoid: ['cheap'] },
          },
        },
      },
    })
    expect(wrapper.find('[data-testid="lang-use-chip"]').text()).toBe('calm')
    expect(wrapper.find('[data-testid="lang-avoid-chip"]').text()).toBe('cheap')
  })

  it('skips placeholder entries inside the word lists', () => {
    const wrapper = mount(SegmentDeepResearchRenderer, {
      props: {
        data: { language_patterns: { words_they_use: ['relax', 'unknown', 'N/A'], phrases_to_avoid: [] } },
      },
    })
    expect(wrapper.findAll('[data-testid="lang-use-chip"]').map((c) => c.text())).toEqual(['relax'])
    expect(wrapper.find('[data-testid="lang-avoid-group"]').exists()).toBe(false)
  })
})
