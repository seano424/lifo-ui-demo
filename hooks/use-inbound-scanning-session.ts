/**
 * Global state management for inbound scanning sessions
 * Eliminates circular dependencies by providing centralized state
 */

import { useCallback, useEffect, useState } from 'react'
import { type ScannedItem } from '@/components/scanning/shared'

interface InboundScanningSession {
  items: ScannedItem[]
  storeId?: string
  timestamp: number
}

const SESSION_KEY = 'lifo-inbound-scanning-session'

/**
 * Get stored session from localStorage
 */
function getStoredSession(): InboundScanningSession | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    
    const session = JSON.parse(stored)
    // Check if session is less than 24 hours old
    const isValid = Date.now() - session.timestamp < 24 * 60 * 60 * 1000
    
    return isValid ? session : null
  } catch {
    return null
  }
}

/**
 * Store session to localStorage
 */
function storeSession(session: InboundScanningSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Fail silently if localStorage is not available
  }
}

/**
 * Clear session from localStorage
 */
function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Fail silently
  }
}

/**
 * Hook for managing inbound scanning sessions with global state and persistence
 */
export function useInboundScanningSession(storeId?: string) {
  const [session, setSession] = useState<InboundScanningSession>(() => {
    const stored = getStoredSession()
    
    // If we have a stored session for the same store, use it
    if (stored && (!storeId || stored.storeId === storeId)) {
      return stored
    }
    
    // Otherwise start fresh
    return {
      items: [],
      storeId,
      timestamp: Date.now(),
    }
  })

  // Update session when storeId changes
  useEffect(() => {
    if (storeId && session.storeId !== storeId) {
      // Check if there's a stored session for this store
      const stored = getStoredSession()
      
      if (stored && stored.storeId === storeId) {
        setSession(stored)
      } else {
        // Start fresh for new store
        setSession({
          items: [],
          storeId,
          timestamp: Date.now(),
        })
      }
    }
  }, [storeId, session.storeId])

  // Persist session to localStorage whenever it changes
  useEffect(() => {
    if (session.items.length > 0) {
      storeSession(session)
    } else {
      clearStoredSession()
    }
  }, [session])

  // Add item to session
  const addItem = useCallback((item: ScannedItem) => {
    setSession(prev => {
      const newSession = {
        ...prev,
        items: [item, ...prev.items],
        timestamp: Date.now(),
      }
      return newSession
    })
  }, [])

  // Remove item from session
  const removeItem = useCallback((itemId: string) => {
    setSession(prev => {
      const newSession = {
        ...prev,
        items: prev.items.filter(item => item.id !== itemId),
        timestamp: Date.now(),
      }
      return newSession
    })
  }, [])

  // Update item in session
  const updateItem = useCallback((updatedItem: ScannedItem) => {
    setSession(prev => {
      const newSession = {
        ...prev,
        items: prev.items.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        ),
        timestamp: Date.now(),
      }
      return newSession
    })
  }, [])

  // Clear all items
  const clearItems = useCallback(() => {
    setSession(prev => ({
      ...prev,
      items: [],
      timestamp: Date.now(),
    }))
  }, [])

  // Clear session completely (including localStorage)
  const clearSession = useCallback(() => {
    clearStoredSession()
    setSession({
      items: [],
      storeId,
      timestamp: Date.now(),
    })
  }, [storeId])

  return {
    // State
    items: session.items,
    storeId: session.storeId,
    hasItems: session.items.length > 0,
    itemCount: session.items.length,
    
    // Actions
    addItem,
    removeItem,
    updateItem,
    clearItems,
    clearSession,
    
    // Helper methods
    getItem: (itemId: string) => session.items.find(item => item.id === itemId),
    getTotalQuantity: () => session.items.reduce((sum, item) => sum + item.quantity, 0),
    getTotalValue: () => session.items.reduce((sum, item) => sum + (item.quantity * item.price), 0),
  }
}

/**
 * Hook to observe scanning session without modifying it (for parent components)
 */
export function useInboundScanningSessionObserver(storeId?: string) {
  const session = useInboundScanningSession(storeId)
  
  return {
    items: session.items,
    hasItems: session.hasItems,
    itemCount: session.itemCount,
    getTotalQuantity: session.getTotalQuantity,
    getTotalValue: session.getTotalValue,
  }
}