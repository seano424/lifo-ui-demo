/**
 * Square POS Integration - React Query Hooks
 * Custom hooks for Square API calls with loading, error, and success states
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fastApiClient } from '@/lib/services/fastapi-client'
import { createClient } from '@/lib/supabase/client'
import type {
  SquareConnectionStatus,
  ConnectionListResponse,
  OAuthAuthorizeResponse,
  DisconnectResponse,
  SyncStats,
} from '@/lib/types/integrations'

/**
 * Hook to get Square connection status for current user
 * Polls status to check if connection is active
 * No store_id required - automatically finds user's active connections
 */
export function useSquareStatus() {
  const supabase = createClient()

  return useQuery<SquareConnectionStatus, Error>({
    queryKey: ['square', 'status'],
    queryFn: async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          // Return default disconnected state instead of throwing
          return { is_connected: false } as SquareConnectionStatus
        }

        return await fastApiClient.getSquareStatus(session.access_token)
      } catch (error) {
        // Log error but return disconnected state for graceful degradation
        console.error('Failed to fetch Square status:', error)
        return { is_connected: false } as SquareConnectionStatus
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchOnMount: true, // Always refetch on mount for fresh connection status
    refetchOnWindowFocus: false,
    retry: false, // Don't retry, return disconnected state immediately
  })
}

/**
 * Hook to list all Square connections for a store
 */
export function useSquareConnections(storeId: string | null) {
  const supabase = createClient()

  return useQuery<ConnectionListResponse, Error>({
    queryKey: ['square', 'connections', storeId],
    queryFn: async () => {
      try {
        if (!storeId) {
          // Return empty list if no store ID
          return { connections: [], total: 0 }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          // Return empty list if not authenticated
          return { connections: [], total: 0 }
        }

        return await fastApiClient.listSquareConnections(storeId, session.access_token)
      } catch (error) {
        // Log error but return empty list for graceful degradation
        console.error('Failed to fetch Square connections:', error)
        return { connections: [], total: 0 }
      }
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: false, // Don't retry, return empty list immediately
  })
}

/**
 * Hook to initiate Square OAuth connection
 * Returns mutation for connecting Square account
 */
export function useInitiateSquareConnect() {
  const supabase = createClient()

  return useMutation<OAuthAuthorizeResponse, Error>({
    mutationFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Please sign in to connect Square')
      }

      return await fastApiClient.initiateSquareConnect(session.access_token)
    },
    onError: error => {
      console.error('Square connection initiation failed:', error)
      toast.error(`Failed to connect Square: ${error.message}`)
    },
  })
}

/**
 * Hook to disconnect Square integration
 * Returns mutation for disconnecting Square account
 */
export function useDisconnectSquare() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation<DisconnectResponse, Error, { connectionId: string }>({
    mutationFn: async ({ connectionId }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.disconnectSquare(connectionId, session.access_token)
    },
    onSuccess: () => {
      // Invalidate all Square-related queries
      queryClient.invalidateQueries({ queryKey: ['square'] })
      toast.success('Square disconnected successfully')
    },
    onError: error => {
      console.error('Square disconnect failed:', error)
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })
}

/**
 * Hook to sync Square catalog
 * Returns mutation for triggering catalog sync
 */
export function useSyncSquareCatalog() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation<SyncStats, Error, { connectionId: string; fullSync?: boolean }>({
    mutationFn: async ({ connectionId, fullSync = false }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.syncSquareCatalog(connectionId, fullSync, session.access_token)
    },
    onSuccess: data => {
      // Invalidate connections to refresh last_sync_at
      queryClient.invalidateQueries({ queryKey: ['square', 'connections'] })
      queryClient.invalidateQueries({ queryKey: ['square', 'status'] })

      // Show success message with stats
      const message = `Catalog synced: ${data.products_created || 0} created, ${data.products_updated || 0} updated`
      toast.success(message)
    },
    onError: error => {
      console.error('Catalog sync failed:', error)
      toast.error(`Failed to sync catalog: ${error.message}`)
    },
  })
}

/**
 * Hook to sync Square inventory
 * Returns mutation for triggering inventory sync
 */
export function useSyncSquareInventory() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation<SyncStats, Error, { connectionId: string; fullSync?: boolean }>({
    mutationFn: async ({ connectionId, fullSync = false }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.syncSquareInventory(connectionId, fullSync, session.access_token)
    },
    onSuccess: data => {
      // Invalidate connections and batch queries
      queryClient.invalidateQueries({ queryKey: ['square', 'connections'] })
      queryClient.invalidateQueries({ queryKey: ['square', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })

      // Show success message with stats
      const message = `Inventory synced: ${data.batches_updated || 0} batches updated`
      toast.success(message)
    },
    onError: error => {
      console.error('Inventory sync failed:', error)
      toast.error(`Failed to sync inventory: ${error.message}`)
    },
  })
}

/**
 * Hook to sync Square orders
 * Returns mutation for triggering orders sync
 */
export function useSyncSquareOrders() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation<
    SyncStats,
    Error,
    { connectionId: string; daysBack?: number; fullSync?: boolean }
  >({
    mutationFn: async ({ connectionId, daysBack = 7, fullSync = false }) => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.syncSquareOrders(
        connectionId,
        daysBack,
        fullSync,
        session.access_token,
      )
    },
    onSuccess: data => {
      // Invalidate connections and batch queries
      queryClient.invalidateQueries({ queryKey: ['square', 'connections'] })
      queryClient.invalidateQueries({ queryKey: ['square', 'status'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })

      // Show success message with stats
      const message = `Orders synced: ${data.orders_fetched || 0} orders processed`
      toast.success(message)
    },
    onError: error => {
      console.error('Orders sync failed:', error)
      toast.error(`Failed to sync orders: ${error.message}`)
    },
  })
}

/**
 * Helper hook to poll Square status during OAuth callback
 * Useful for checking connection completion after OAuth redirect
 */
export function useSquareStatusPolling(enabled: boolean = false) {
  const supabase = createClient()

  return useQuery<SquareConnectionStatus, Error>({
    queryKey: ['square', 'status', 'polling'],
    queryFn: async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) {
          // Return disconnected state if not authenticated
          return { is_connected: false } as SquareConnectionStatus
        }

        return await fastApiClient.getSquareStatus(session.access_token)
      } catch (error) {
        // Log error but return disconnected state for graceful degradation
        console.error('Failed to poll Square status:', error)
        return { is_connected: false } as SquareConnectionStatus
      }
    },
    enabled,
    refetchInterval: enabled ? 2000 : false, // Poll every 2 seconds when enabled
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 3, // Keep retrying for polling since it's a transient operation
  })
}
