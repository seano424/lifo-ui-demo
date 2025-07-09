'use client'

import { useEffect } from 'react'
import { useUserStores } from '@/hooks/use-stores'

interface StoreProviderWrapperProps {
  children: React.ReactNode
}

/**
 * This component initializes the store state when the app loads.
 * It should be placed high in your component tree (e.g., in your main layout)
 * to ensure stores are loaded early.
 */
export function StoreProviderWrapper({ children }: StoreProviderWrapperProps) {
  // This hook automatically loads user stores and sets the active store
  const { userStores, isLoading, error } = useUserStores()

  useEffect(() => {
    if (error) {
      console.error('[StoreProviderWrapper] Error loading user stores:', error)
    } else if (userStores.length > 0) {
      console.log('[StoreProviderWrapper] Successfully loaded stores:', userStores.length)
    }
  }, [userStores, error])

  return <>{children}</>
}
