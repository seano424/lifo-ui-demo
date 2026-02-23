'use client'

import { useState, useEffect } from 'react'
import { useSetupProgress } from '@/lib/hooks/use-setup-progress'
import { useUserStores } from '@/hooks/use-stores'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { AddStoreStep } from './steps/add-store-step'

export const SQUARE_SETUP_MODAL_DISMISSED_KEY = 'square_setup_modal_dismissed'
export const SQUARE_SETUP_OPEN_EVENT = 'square-setup-open'

function getStoredDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(SQUARE_SETUP_MODAL_DISMISSED_KEY) === '1'
}

export function SquareSetupModal() {
  useUserStores()

  const progress = useSetupProgress()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(getStoredDismissed())
  }, [])

  // Allow the banner's "Connect Square" button to re-open this modal
  useEffect(() => {
    const handler = () => setDismissed(false)
    window.addEventListener(SQUARE_SETUP_OPEN_EVENT, handler)
    return () => window.removeEventListener(SQUARE_SETUP_OPEN_EVENT, handler)
  }, [])

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      localStorage.setItem(SQUARE_SETUP_MODAL_DISMISSED_KEY, '1')
      setDismissed(true)
    }
  }

  const showSetupModal = !progress.isLoading && !progress.hasSquareConnection && !dismissed

  return (
    <Dialog open={showSetupModal} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogTitle>
          <span className="sr-only">Connect your Square account</span>
        </DialogTitle>
        <AddStoreStep />
      </DialogContent>
    </Dialog>
  )
}
