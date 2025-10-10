'use client'

import { useEffect, useState } from 'react'

export function useOffline() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    // Check initial status
    setIsOffline(!navigator.onLine)

    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOffline
}
