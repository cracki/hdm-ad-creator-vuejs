import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useJobTracker, type JobTrackerConfig } from './useJobTracker'

// useJobTracker registers an onUnmounted hook, so it must run inside a
// component instance. This helper mounts a throwaway host that exposes the
// tracker returned from setup.
function mountTracker(config: JobTrackerConfig) {
  let tracker: ReturnType<typeof useJobTracker> | null = null
  const Host = defineComponent({
    setup() {
      tracker = useJobTracker(config)
      return () => h('div')
    },
  })
  mount(Host)
  return tracker!
}

describe('useJobTracker messages', () => {
  it('uses the default message when none are provided', async () => {
    const tracker = mountTracker({
      startFn: async () => ({}),
      statusFn: async () => ({ status: 'failed' }),
      getStatus: (d: any) => d.status,
      getUuid: () => 'u',
      isTerminal: (s) => s === 'completed' || s === 'failed',
    })
    await tracker.resume('u')
    expect(tracker.error.value).toBe('Analysis failed')
  })

  it('uses custom localized messages when provided', async () => {
    const tracker = mountTracker({
      startFn: async () => ({}),
      statusFn: async () => ({ status: 'failed' }),
      getStatus: (d: any) => d.status,
      getUuid: () => 'u',
      isTerminal: (s) => s === 'completed' || s === 'failed',
      messages: { failed: 'تحلیل ناموفق بود' },
    })
    await tracker.resume('u')
    expect(tracker.error.value).toBe('تحلیل ناموفق بود')
  })
})
