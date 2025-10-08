const CACHE_NAME = 'lifo-ai-v2'

// Critical pages to cache for offline access
const CRITICAL_PAGES = [
  '/',
  '/manifest.json',
  '/offline',
  '/dashboard',
  '/scanning',
  '/products',
  '/batches',
  '/settings',
  '/auth/login',
  '/pricing',
]

// Install event - cache critical pages with error handling
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Add pages individually to prevent one failure from breaking all caching
      return Promise.allSettled(
        CRITICAL_PAGES.map(url =>
          cache.add(url).catch(err => {
            console.log(`Failed to cache ${url}:`, err.message)
          }),
        ),
      )
    }),
  )
  // Skip waiting to activate immediately
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  // Take control of all clients immediately
  return self.clients.claim()
})

// Fetch event with offline fallback
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Return cached version if available
      if (response) {
        return response
      }

      // Try to fetch from network
      return fetch(event.request).catch(() => {
        // If network fails and it's a page request, show offline page
        if (event.request.destination === 'document') {
          return (
            caches.match('/offline') ||
            new Response(
              '<html><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } },
            )
          )
        }

        // For other requests, return a basic offline response
        return new Response('Offline', { status: 503 })
      })
    }),
  )
})
