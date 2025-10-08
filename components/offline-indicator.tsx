'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <Alert
        className={isOffline ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}
      >
        <div className="flex items-center gap-2">
          {isOffline ? (
            <WifiOff className="h-4 w-4 text-orange-600" />
          ) : (
            <Wifi className="h-4 w-4 text-green-600" />
          )}
          <AlertDescription className={isOffline ? 'text-orange-800' : 'text-green-800'}>
            {isOffline ? "You're offline. Some features may be limited." : 'Connection restored!'}
          </AlertDescription>
        </div>
      </Alert>
    </div>
  )
}
