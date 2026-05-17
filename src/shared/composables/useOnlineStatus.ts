import { ref, watchEffect } from 'vue'

const isOnline = ref(navigator.onLine)

function handleOnline() {
  isOnline.value = true
}

function handleOffline() {
  isOnline.value = false
}

let listenersAttached = false
function ensureListeners() {
  if (listenersAttached) return
  listenersAttached = true
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
}

export function useOnlineStatus(toast?: { warning: (msg: string, dur?: number) => void; success: (msg: string) => void }) {
  ensureListeners()

  let shownOfflineToast = false

  const stop = watchEffect(() => {
    if (!isOnline.value && !shownOfflineToast && toast) {
      shownOfflineToast = true
      toast.warning('You are offline. Some features may be unavailable.', 0)
    } else if (isOnline.value && shownOfflineToast && toast) {
      shownOfflineToast = false
      toast.success('Back online.')
    }
  })

  return { isOnline, stop }
}
