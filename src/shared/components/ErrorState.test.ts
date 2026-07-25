import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ErrorState from './ErrorState.vue'

describe('ErrorState', () => {
  it('renders the message', () => {
    const wrapper = mount(ErrorState, { props: { message: 'Something went wrong' } })
    expect(wrapper.text()).toContain('Something went wrong')
  })

  it('does not render a title when none is provided', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err' } })
    expect(wrapper.find('[data-testid="error-title"]').exists()).toBe(false)
  })

  it('renders the title when provided', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err', title: 'Analysis failed' } })
    expect(wrapper.find('[data-testid="error-title"]').text()).toBe('Analysis failed')
  })

  it('does not render a failed-step badge when none is provided', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err' } })
    expect(wrapper.find('[data-testid="error-step"]').exists()).toBe(false)
  })

  it('renders the failed step when provided', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err', failedStep: 'Audience analysis' } })
    expect(wrapper.find('[data-testid="error-step"]').text()).toContain('Audience analysis')
  })

  it('emits retry when the retry button is clicked', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err', retryLabel: 'Try again' } })
    wrapper.find('[data-testid="error-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('uses the provided retryLabel on the button', () => {
    const wrapper = mount(ErrorState, { props: { message: 'err', retryLabel: 'Try again' } })
    expect(wrapper.find('[data-testid="error-retry"]').text()).toContain('Try again')
  })
})
