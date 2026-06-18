const CACHE = 'omni-router-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith(self.location.origin) || e.request.method !== 'GET') return

  const isNavigation = e.request.mode === 'navigate'
  const isStaticAsset = e.request.url.includes('/assets/')

  if (isNavigation) {
    // Network-first for HTML — always get the latest version
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(e.request, copy))
          return res
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('/index.html')))
    )
  } else if (isStaticAsset) {
    // Cache-first for JS/CSS — these are hashed and immutable
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      }))
    )
  }
})
