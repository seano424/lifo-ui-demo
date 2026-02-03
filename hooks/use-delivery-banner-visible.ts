'use client'

import { useState, useEffect } from 'react'
import { useDraftBatchesSummary } from '@/hooks/use-draft-batches'
import { useActiveStoreId } from '@/lib/stores/store-context'

const DISMISSED_STORAGE_KEY = 'lifo_dismissed_delivery_banner'

interface DismissedState {
  count: number
  timestamp: number
}

/**
 * Get dismissed delivery banner state from localStorage
 */
function getDismissedState(): DismissedState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(DISMISSED_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

/**
 * Save dismissed delivery banner state to localStorage
 */
function setDismissedState(count: number) {
  if (typeof window === 'undefined') return

  const state: DismissedState = {
    count,
    timestamp: Date.now(),
  }

  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear dismissed state from localStorage
 */
function clearDismissedState() {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(DISMISSED_STORAGE_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Hook to manage delivery banner visibility state
 * Returns the visibility state, dismiss handler, and draft count
 */
export function useDeliveryBannerVisible() {
  const storeId = useActiveStoreId()
  const { data: summary, isLoading } = useDraftBatchesSummary(storeId || undefined)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const totalDrafts = summary?.total_draft_batches || 0

  // Check if banner should be shown
  useEffect(() => {
    if (!summary || totalDrafts === 0) {
      setIsDismissed(false)
      setIsClosing(false)
      clearDismissedState()
      return
    }

    const dismissedState = getDismissedState()

    if (dismissedState) {
      // Show banner if draft count increased since dismissal
      if (totalDrafts > dismissedState.count) {
        setIsDismissed(false)
        setIsClosing(false)
        clearDismissedState()
      } else {
        setIsDismissed(true)
        setIsClosing(false)
      }
    } else {
      setIsDismissed(false)
      setIsClosing(false)
    }
  }, [summary, totalDrafts])

  const handleDismiss = () => {
    setIsClosing(true)
    // Wait for animation to complete before actually dismissing
    setTimeout(() => {
      setIsDismissed(true)
      setDismissedState(totalDrafts)
      setIsClosing(false)
    }, 300) // Match transition duration
  }

  // Banner is visible if not loading, has drafts, not dismissed, or currently closing
  const isVisible = !isLoading && totalDrafts > 0 && (!isDismissed || isClosing)

  return {
    isVisible,
    isClosing,
    isDismissed,
    totalDrafts,
    summary,
    isLoading,
    handleDismiss,
  }
}
