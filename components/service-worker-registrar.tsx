'use client'

import { useEffect } from 'react'

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
          console.log('Service Worker registered successfully:', registration)
        })
        .catch(registrationError => {
          console.log('Service Worker registration failed:', registrationError)
        })
    }
  }, [])

  // No UI - just service worker registration
  return null
}
