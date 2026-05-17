import { ref, onUnmounted, type Ref } from 'vue'

export interface UseAsyncOperationOptions {
  timeout?: number
  contextMessage?: string
}

export function useAsyncOperation<T = any>(options: UseAsyncOperationOptions = {}) {
  const data: Ref<T | null> = ref(null)
  const loading = ref(false)
  const error: Ref<string | null> = ref(null)

  let controller: AbortController | null = null
  const timeoutMs = options.timeout ?? 300_000
  let timeoutTimer: ReturnType<typeof setTimeout> | null = null

  function reset() {
    data.value = null
    error.value = null
    loading.value = false
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }

  function cancel() {
    controller?.abort()
    controller = null
    loading.value = false
    if (timeoutTimer) {
      clearTimeout(timeoutTimer)
      timeoutTimer = null
    }
  }

  async function run(apiCall: (signal: AbortSignal) => Promise<T>): Promise<T | null> {
    cancel()
    reset()
    loading.value = true
    controller = new AbortController()

    timeoutTimer = setTimeout(() => {
      controller?.abort()
      error.value = 'Operation timed out'
      loading.value = false
    }, timeoutMs)

    try {
      const result = await apiCall(controller.signal)
      data.value = result
      return result
    } catch (e: any) {
      if (e.name === 'CanceledError' || e.name === 'AbortError') return null
      error.value = e?.response?.data?.detail ?? e?.message ?? 'Operation failed'
      return null
    } finally {
      loading.value = false
      if (timeoutTimer) {
        clearTimeout(timeoutTimer)
        timeoutTimer = null
      }
    }
  }

  onUnmounted(() => {
    cancel()
  })

  return { data, loading, error, run, cancel, reset }
}
