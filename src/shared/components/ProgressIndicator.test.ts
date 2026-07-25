import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProgressIndicator from './ProgressIndicator.vue'

const STAGES = [
  'Reading website',
  'Detecting industry',
  'Analyzing audience',
  'Finding competitors',
  'Generating strategy',
]

describe('ProgressIndicator', () => {
  it('renders all stage labels in order', () => {
    const wrapper = mount(ProgressIndicator, { props: { stages: STAGES, currentIndex: 0 } })
    const labels = wrapper.findAll('[data-testid="progress-stage"]').map((n) => n.text())
    expect(labels).toEqual(STAGES)
  })

  it('marks stages before current as completed and the current one as current', () => {
    const wrapper = mount(ProgressIndicator, { props: { stages: STAGES, currentIndex: 2 } })
    const states = wrapper.findAll('[data-testid="progress-stage"]').map((n) => n.attributes('data-state'))
    expect(states[0]).toBe('completed')
    expect(states[1]).toBe('completed')
    expect(states[2]).toBe('current')
    expect(states[3]).toBe('upcoming')
    expect(states[4]).toBe('upcoming')
  })

  it('marks every stage completed when status is completed', () => {
    const wrapper = mount(ProgressIndicator, { props: { stages: STAGES, currentIndex: 2, status: 'completed' } })
    const states = wrapper.findAll('[data-testid="progress-stage"]').map((n) => n.attributes('data-state'))
    expect(states.every((s) => s === 'completed')).toBe(true)
  })

  it('marks the current stage as failed and keeps later ones upcoming when status is failed', () => {
    const wrapper = mount(ProgressIndicator, { props: { stages: STAGES, currentIndex: 2, status: 'failed' } })
    const states = wrapper.findAll('[data-testid="progress-stage"]').map((n) => n.attributes('data-state'))
    expect(states[0]).toBe('completed')
    expect(states[1]).toBe('completed')
    expect(states[2]).toBe('failed')
    expect(states[3]).toBe('upcoming')
  })
})
