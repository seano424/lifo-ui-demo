'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * Service Worker Registrar Component
 *
 * This component handles service worker registration for PWA functionality.
 * It provides offline caching and PWA capabilities without any UI.
 *
 * WHAT IT DOES:
 * - Registers the service worker for offline functionality
 * - Enables PWA features (installable, offline support)
 * - No UI - just background functionality
 *
 * SEPARATED FROM:
 * - Install prompt UI (handled by PWA component)
 * - User interactions (handled by PWA component)
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    // Register service worker for offline functionality
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(registration => {
          logger.log('ServiceWorker', 'Registered successfully', {
            scope: registration.scope,
            state: registration.active?.state,
          })
        })
        .catch((registrationError: unknown) => {
          logger.error('ServiceWorker', 'Registration failed', {
            error:
              registrationError instanceof Error
                ? registrationError.message
                : String(registrationError),
          })
        })

      // Listen for service worker updates and force reload
      // This prevents stale server action errors after deployments
      navigator.serviceWorker.addEventListener('message', event => {
        if (event.data?.type === 'SW_UPDATED') {
          logger.log('ServiceWorker', 'New version detected, reloading page...')
          // Wait a bit to allow any pending requests to complete
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      })
    } else {
      logger.warn('ServiceWorker', 'Not supported in this browser')
    }
  }, [])

  // No UI - just service worker registration
  return null
}
