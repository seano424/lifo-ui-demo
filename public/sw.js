const CACHE_NAME = 'lifo-ai-v6'

// Push notification handler (from Next.js docs)
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

// Notification click handler (from Next.js docs)
self.addEventListener('notificationclick', event => {
  console.log('Notification click received.')
  event.notification.close()
  event.waitUntil(clients.openWindow('http://localhost:3000'))
})

// Install event - skip precaching, use lazy caching instead
// Precaching all pages on install causes ECONNRESET errors and floods the server
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(() => {
      console.log('Service Worker: Cache opened, ready for lazy caching')
      // Skip waiting to activate immediately
      return self.skipWaiting()
    }),
  )
})

// Activate event - clean up old caches and force reload on update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim()
      })
      .then(() => {
        // Force reload all clients when service worker updates
        // This prevents stale server action errors after deployments
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED' })
          })
        })
      }),
  )
})

// Fetch event with intelligent caching strategy
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip caching for:
  // - Chrome extensions
  // - Non-HTTP(S) requests
  // - API calls
  if (!url.protocol.startsWith('http') || url.pathname.startsWith('/api/')) {
    return event.respondWith(fetch(request))
  }

  // Network-First strategy for HTML pages
  // This prevents stale page caching and authentication issues
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses (200-299)
          if (response.ok && response.status >= 200 && response.status < 300) {
            // Clone the response before caching
            const responseToCache = response.clone()

            caches.open(CACHE_NAME).then(cache => {
              // Only cache public pages (not authenticated routes)
              if (
                url.pathname === '/' ||
                url.pathname.startsWith('/auth/') ||
                url.pathname.startsWith('/onboarding/') ||
                url.pathname.startsWith('/contact') ||
                url.pathname.startsWith('/features') ||
                url.pathname.startsWith('/pricing') ||
                url.pathname.startsWith('/support')
              ) {
                cache.put(request, responseToCache)
              }
            })
          }

          return response
        })
        .catch(() => {
          // Network failed - try cache as fallback
          return caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse
            }

            // No cache available - show offline page
            return (
              caches.match('/offline') ||
              new Response(
                '<html><body><h1>You are offline</h1><p>Please check your connection and try again.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } },
              )
            )
          })
        }),
    )
  } else {
    // Cache-First strategy for static assets (images, CSS, JS, fonts)
    // This improves performance for resources that don't change often
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then(response => {
          // Only cache successful responses
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
