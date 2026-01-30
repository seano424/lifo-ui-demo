'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, RefreshCw, WifiOff } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Check initial status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    if (isOnline) {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">You're Offline</CardTitle>
          <CardDescription>
            {isOnline
              ? 'Connection restored! Click retry to reload the page.'
              : "It looks like you're not connected to the internet. Some features may not be available."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Button onClick={handleRetry} disabled={!isOnline} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              {isOnline ? 'Retry Connection' : 'Waiting for Connection...'}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="w-4 h-4 mr-2" />
                Go to Homepage
              </Link>
            </Button>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            <p>While offline, you can still:</p>
            <ul className="mt-2 space-y-1">
              <li>• View cached pages</li>
              <li>• Access previously loaded data</li>
              <li>• Use basic app features</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
