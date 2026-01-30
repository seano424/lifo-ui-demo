'use client'

import { useOffline } from '@/hooks/use-offline'
import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const isOffline = useOffline()
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setShowIndicator(true)
    } else {
      // Hide indicator after a short delay when coming back online
      const timer = setTimeout(() => {
        setShowIndicator(false)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOffline])

  if (!showIndicator) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div
        className={`rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm ${
          isOffline
            ? 'border-orange-200 bg-orange-50/95 text-orange-800'
            : 'border-primary-200 bg-primary-50/95 text-primary-800'
        }`}
      >
        <div className="flex items-center gap-3">
          {isOffline ? (
            <WifiOff className="h-5 w-5 text-orange-600 shrink-0" />
          ) : (
            <Wifi className="h-5 w-5 text-primary shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm  leading-tight">
              {isOffline ? "You're offline. Some features may be limited." : 'Connection restored!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
