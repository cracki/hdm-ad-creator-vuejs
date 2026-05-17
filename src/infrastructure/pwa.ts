const SW_PATH = '/sw.js'

export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(SW_PATH, { scope: '/' })
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // New content is available — could show a toast
            }
          })
        }
      })
    } catch {
      // SW registration failed — non-critical
    }
  })
}

export function unregisterServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister()
    }
  })
}
