// hdm-v1.1.0 (QA4-P0): navigations are now network-first and the app shell is
// no longer precached, so /login and route changes can never serve a stale
// (e.g. black) cached index.html. Cache-first stays for other static GETs.
const CACHE_NAME = 'hdm-v1.1.0'
const STATIC_ASSETS: string[] = []

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET' || request.url.includes('/api/')) return

  // Page navigations: network-first. Fall back to the cache only when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() =>
        caches.match(request).then((cached) => cached ?? caches.match('/index.html'))
      )
    )
    return
  }

  // Other static GETs: cache-first (stale-while-revalidate-ish).
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})
