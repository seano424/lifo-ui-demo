const CACHE_NAME = 'lifo-ai-v12'

// Install event - claim immediately
self.addEventListener('install', event => {
  console.log('Service Worker: Installing v12 - minimal pass-through mode')
  event.waitUntil(self.skipWaiting())
})

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating v12')
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
  // Simply pass through all requests without intervention
  // This maintains PWA installability while avoiding caching conflicts
  event.respondWith(fetch(event.request))
})
