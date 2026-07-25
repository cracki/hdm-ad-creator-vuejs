import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import OutputBlock from './OutputBlock.vue'

describe('OutputBlock', () => {
  it('renders the title when provided', () => {
    const wrapper = mount(OutputBlock, { props: { title: 'Segmentation' } })
    expect(wrapper.find('[data-testid="output-title"]').text()).toBe('Segmentation')
  })

  it('does not render a title when none is provided', () => {
    const wrapper = mount(OutputBlock)
    expect(wrapper.find('[data-testid="output-title"]').exists()).toBe(false)
  })

  it('renders default slot content', () => {
    const wrapper = mount(OutputBlock, { slots: { default: '<p data-testid="slotted">hello</p>' } })
    expect(wrapper.find('[data-testid="slotted"]').exists()).toBe(true)
  })

  it('emits approve when the approve button is clicked', () => {
    const wrapper = mount(OutputBlock)
    wrapper.find('[data-testid="output-approve"]').trigger('click')
    expect(wrapper.emitted('approve')).toHaveLength(1)
  })

  it('emits reject when the reject button is clicked', () => {
    const wrapper = mount(OutputBlock)
    wrapper.find('[data-testid="output-reject"]').trigger('click')
    expect(wrapper.emitted('reject')).toHaveLength(1)
  })

  it('emits edit when the edit button is clicked', () => {
    const wrapper = mount(OutputBlock)
    wrapper.find('[data-testid="output-edit"]').trigger('click')
    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('emits refine when the refine button is clicked', () => {
    const wrapper = mount(OutputBlock)
    wrapper.find('[data-testid="output-refine"]').trigger('click')
    expect(wrapper.emitted('refine')).toHaveLength(1)
  })
})
