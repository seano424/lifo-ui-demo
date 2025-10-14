const CACHE_NAME = 'lifo-ai-v8'

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

// Fetch event - DON'T INTERCEPT SAME-ORIGIN NAVIGATION
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // CRITICAL: Don't intercept same-origin HTML requests
  // Let Next.js middleware handle auth and routing
  if (
    url.origin === self.location.origin &&
    (request.mode === 'navigate' || request.destination === 'document')
  ) {
    return // Pass through to Next.js
  }

  // Skip API calls and Next.js internals
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return
  }

  // CRITICAL: Never intercept Supabase requests
  // This prevents ECONNRESET errors and auth issues
  if (url.hostname.includes('supabase.co')) {
    return // Pass through to Supabase
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
