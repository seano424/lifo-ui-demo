'use client'

import { useState, useEffect } from 'react'
import { XIcon } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'
import {
  SQUARE_SETUP_MODAL_DISMISSED_KEY,
  SQUARE_SETUP_OPEN_EVENT,
} from './setting-up-flow/square-setup-modal'

const BANNER_DISMISSED_COOKIE = 'square_setup_banner_dismissed'

function getBannerDismissed(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split(';').some(c => c.trim().startsWith(`${BANNER_DISMISSED_COOKIE}=`))
}

function setBannerDismissedCookie() {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${BANNER_DISMISSED_COOKIE}=1; expires=${expires.toUTCString()}; path=/`
}

export function SquareSetupBanner() {
  const progress = useSetupProgress()
  const [modalDismissed, setModalDismissed] = useState(false)
  // Start as dismissed to prevent flash while reading cookie
  const [bannerDismissed, setBannerDismissed] = useState(true)

  useEffect(() => {
    setModalDismissed(localStorage.getItem(SQUARE_SETUP_MODAL_DISMISSED_KEY) === '1')
    setBannerDismissed(getBannerDismissed())
  }, [])

  const handleConnect = () => {
    localStorage.removeItem(SQUARE_SETUP_MODAL_DISMISSED_KEY)
    setModalDismissed(false)
    window.dispatchEvent(new CustomEvent(SQUARE_SETUP_OPEN_EVENT))
  }

  const handleDismiss = () => {
    setBannerDismissedCookie()
    setBannerDismissed(true)
  }

  // Only show when: Square not connected, modal was dismissed, and banner not dismissed
  if (progress.isLoading || progress.hasSquareConnection || !modalDismissed || bannerDismissed) {
    return null
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl border border-border bg-card p-5 shadow-sm relative">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 p-2">
          <Image src="/square/square-icon.svg" alt="Square" width={32} height={32} />
        </div>
        <div className="flex-1 min-w-0">
          <Typography variant="h4" className="mb-0.5">
            Connect your Square account
          </Typography>
          <Typography variant="p" color="muted">
            Link your Square store to start tracking inventory and reducing food waste.
          </Typography>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button className="w-full md:w-auto" onClick={handleConnect}>
          Connect Square
        </Button>
        <Button
          variant="subtleGray"
          onClick={handleDismiss}
          className="w-full md:w-auto hidden md:flex"
        >
          Dismiss
          <XIcon className="w-4 h-4" />
        </Button>
      </div>

      <div className="absolute top-2 right-2 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full bg-muted"
          onClick={handleDismiss}
        >
          <XIcon className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
