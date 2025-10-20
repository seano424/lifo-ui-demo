const CACHE_NAME = 'lifo-ai-v13'

// Install event - claim immediately
self.addEventListener('install', event => {
  console.log('Service Worker: Installing v13 - minimal pass-through mode with WASM bypass')
  event.waitUntil(self.skipWaiting())
})

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating v13')
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

// Fetch event - SIMPLIFIED: Pass through everything
// No caching - Next.js 15 handles its own caching better
// This prevents auth issues, ECONNRESET errors, and stream issues
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Skip service worker for WASM files - Safari/iOS requires direct fetch
  // WASM streaming compilation fails when intercepted by service workers on iOS
  if (url.pathname.endsWith('.wasm')) {
    return // Don't intercept - let browser handle directly
  }

  // Simply pass through all other requests without intervention
  // This maintains PWA installability while avoiding caching conflicts
  event.respondWith(fetch(event.request))
})
