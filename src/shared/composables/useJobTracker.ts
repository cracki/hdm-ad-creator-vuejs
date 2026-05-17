import { ref, onUnmounted, type Ref } from 'vue'

export interface JobTrackerConfig<T = any> {
  startFn: () => Promise<T>
  statusFn: (uuid: string) => Promise<T>
  getStatus: (data: T) => string
  getUuid: (data: T) => string
  isTerminal: (status: string) => boolean
  interval?: number
  maxAttempts?: number
}

export function useJobTracker<T = any>(config: JobTrackerConfig<T>) {
  const data: Ref<T | null> = ref(null)
  const status = ref<'idle' | 'starting' | 'polling' | 'completed' | 'failed'>('idle')
  const error: Ref<string | null> = ref(null)
  const attempts = ref(0)

  let timer: ReturnType<typeof setTimeout> | null = null
  const maxAttempts = config.maxAttempts ?? 300
  let currentInterval = config.interval ?? 2000

  function stopPolling() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function reset() {
    stopPolling()
    data.value = null
    status.value = 'idle'
    error.value = null
    attempts.value = 0
    currentInterval = config.interval ?? 2000
  }

  async function poll(runUuid: string) {
    if (attempts.value >= maxAttempts) {
      status.value = 'failed'
      error.value = 'Polling timed out'
      return
    }

    try {
      const result = await config.statusFn(runUuid)
      data.value = result

      const runStatus = config.getStatus(result)
      if (config.isTerminal(runStatus)) {
        status.value = runStatus === 'failed' ? 'failed' : 'completed'
        if (runStatus === 'failed') {
          error.value = 'Analysis failed'
        }
        return
      }

      attempts.value++
      currentInterval = Math.min(currentInterval * 1.1, 10_000)
      timer = setTimeout(() => poll(runUuid), currentInterval)
    } catch (e: any) {
      error.value = e?.message ?? 'Polling error'
      status.value = 'failed'
    }
  }

  async function start() {
    reset()
    status.value = 'starting'

    try {
      const result = await config.startFn()
      data.value = result

      const runStatus = config.getStatus(result)
      if (config.isTerminal(runStatus)) {
        status.value = runStatus === 'failed' ? 'failed' : 'completed'
        return
      }

      const runUuid = config.getUuid(result)
      status.value = 'polling'
      await poll(runUuid)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to start job'
      status.value = 'failed'
    }
  }

  async function resume(runUuid: string) {
    reset()
    status.value = 'polling'

    try {
      const result = await config.statusFn(runUuid)
      data.value = result

      const runStatus = config.getStatus(result)
      if (config.isTerminal(runStatus)) {
        status.value = runStatus === 'failed' ? 'failed' : 'completed'
        if (runStatus === 'failed') {
          error.value = 'Analysis failed'
        }
        return
      }

      await poll(runUuid)
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to resume job'
      status.value = 'failed'
    }
  }

  onUnmounted(() => {
    stopPolling()
  })

  return {
    data,
    status,
    error,
    attempts,
    start,
    resume,
    reset,
    cancel: stopPolling,
  }
}
