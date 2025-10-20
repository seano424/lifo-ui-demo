const CACHE_NAME = 'lifo-ai-v14'

// Install event - claim immediately
self.addEventListener('install', event => {
  console.log('Service Worker: Installing v14 - zero-intervention mode for Next.js 15')
  event.waitUntil(self.skipWaiting())
})

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating v14')
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - MINIMAL INTERVENTION MODE
// Don't intercept ANY requests - let Next.js 15 and the browser handle everything
// This prevents auth issues, RSC request failures, and message channel errors
// PWA installability is maintained just by having the service worker registered
self.addEventListener('fetch', _event => {
  // Don't call event.respondWith() at all - let browser handle all requests naturally
  // This is the recommended approach for Next.js 15 PWAs
  // Reference: https://web.dev/articles/service-worker-lifecycle
  return
})
