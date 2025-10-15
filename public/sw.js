const CACHE_NAME = 'lifo-ai-v10'

// Push notification handler
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json()
    const options = {
      body: data.body,
      icon: data.icon || '/icon.png',
      badge: '/badge.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '2',
      },
    }
    event.waitUntil(self.registration.showNotification(data.title, options))
  }
})

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('http://localhost:3000'))
})

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log('Service Worker: Cache opened')
      return self.skipWaiting()
    }),
  )
})

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Fetch event - Proper passthrough for critical requests
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // CRITICAL: Explicitly pass through these requests with fetch()
  // Don't just return - that can cause ECONNRESET errors
  const shouldPassThrough =
    // Supabase requests (auth, database, storage)
    url.hostname.includes('supabase.co') ||
    // Open Food Facts API requests
    url.hostname.includes('openfoodfacts.org') ||
    // Same-origin navigation (Next.js routing)
    (url.origin === self.location.origin &&
      (request.mode === 'navigate' || request.destination === 'document')) ||
    // API routes and Next.js internals
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/')

  if (shouldPassThrough) {
    // Explicitly pass through with fetch - prevents connection issues
    event.respondWith(fetch(request))
    return
  }

  // Only cache external static assets
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then(response => {
          if (response.ok) {
            const responseToCache = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache)
            })
          }
          return response
        })
      }),
    )
  }
})
