/**
 * Square POS Integration - React Query Hooks
 * Custom hooks for Square API calls with loading, error, and success states
 */

'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { fastApiClient } from '@/lib/services/fastapi-client'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'
import { formatErrorForToast, parseBackendError } from '@/lib/utils/error-parser'
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
    queryKey: queryKeys.square.status(),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.getSquareStatus(session.access_token)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - connection status changes infrequently
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnMount: 'stale', // Only refetch if data is stale (improves performance)
    refetchOnWindowFocus: false,
    retry: (failureCount, error: Error) => {
      // Don't retry auth errors
      if (error.message.includes('Not authenticated')) return false
      // Retry server errors up to 2 times
      return failureCount < 2
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

/**
 * Hook to list all Square connections for a store
 */
export function useSquareConnections(storeId: string | null) {
  const supabase = createClient()

  return useQuery<ConnectionListResponse, Error>({
    queryKey: storeId
      ? queryKeys.square.connectionsByStore(storeId)
      : queryKeys.square.connections(),
    queryFn: async () => {
      if (!storeId) {
        throw new Error('Store ID is required')
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.listSquareConnections(storeId, session.access_token)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: Error) => {
      // Don't retry auth or validation errors
      if (error.message.includes('Not authenticated') || error.message.includes('Store ID'))
        return false
      // Retry server errors up to 2 times
      return failureCount < 2
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
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
      if (process.env.NODE_ENV === 'development')
        console.error('Square connection initiation failed:', error)

      const { title, description } = formatErrorForToast(error)
      toast.error(title, { description })
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
      // Invalidate all Square-related queries using query key factory
      queryClient.invalidateQueries({ queryKey: queryKeys.square.all })

      // Invalidate stores query since disconnection deactivates the stores
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })

      toast.success('Square disconnected successfully')
    },
    onError: error => {
      if (process.env.NODE_ENV === 'development') console.error('Square disconnect failed:', error)

      const { title, description } = formatErrorForToast(error)
      toast.error(title, { description })
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
      // Invalidate connections and status to refresh last_sync_at using query key factory
      queryClient.invalidateQueries({ queryKey: queryKeys.square.connections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.square.status() })

      // Show success message with stats
      const message = `Catalog synced: ${data.products_created || 0} created, ${data.products_updated || 0} updated`
      toast.success(message)
    },
    onError: (error, variables) => {
      if (process.env.NODE_ENV === 'development') console.error('Catalog sync failed:', error)

      const parsedError = parseBackendError(error)
      const { title, description } = formatErrorForToast(error)

      // For duplicate key errors during incremental sync, suggest full sync
      if (
        parsedError.type === 'constraint' &&
        parsedError.technical?.includes('products_sku_key') &&
        !variables.fullSync
      ) {
        toast.error(title, {
          description: description,
          duration: 8000, // Longer duration for actionable errors
          action: {
            label: 'Force Full Sync',
            onClick: () => {
              // The component should handle this by showing a confirmation dialog
              // and calling the mutation again with fullSync: true
            },
          },
        })
      } else {
        toast.error(title, { description })
      }
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
      // Invalidate connections, status, and batch queries using query key factory
      queryClient.invalidateQueries({ queryKey: queryKeys.square.connections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.square.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all })

      // Show success message with stats
      const message = `Inventory synced: ${data.batches_updated || 0} batches updated`
      toast.success(message)
    },
    onError: error => {
      if (process.env.NODE_ENV === 'development') console.error('Inventory sync failed:', error)

      const parsedError = parseBackendError(error)
      const { title, description } = formatErrorForToast(error)

      // Show detailed error with optional action button for specific error types
      if (
        parsedError.type === 'constraint' &&
        parsedError.technical?.includes('initial_quantity_check')
      ) {
        toast.error(title, {
          description: description,
          duration: 8000, // Longer duration for actionable errors
        })
      } else {
        toast.error(title, { description })
      }
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
      // Invalidate connections, status, and batch queries using query key factory
      queryClient.invalidateQueries({ queryKey: queryKeys.square.connections() })
      queryClient.invalidateQueries({ queryKey: queryKeys.square.status() })
      queryClient.invalidateQueries({ queryKey: queryKeys.batches.all })

      // Show success message with stats
      const message = `Orders synced: ${data.orders_fetched || 0} orders processed`
      toast.success(message)
    },
    onError: error => {
      if (process.env.NODE_ENV === 'development') console.error('Orders sync failed:', error)

      const { title, description } = formatErrorForToast(error)
      toast.error(title, { description })
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
    queryKey: queryKeys.square.statusPolling(),
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('Not authenticated')
      }

      return await fastApiClient.getSquareStatus(session.access_token)
    },
    enabled,
    refetchInterval: enabled ? 2000 : false, // Poll every 2 seconds when enabled
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: Error) => {
      // Don't retry auth errors
      if (error.message.includes('Not authenticated')) return false
      // Keep retrying for polling since it's a transient operation (up to 3 times)
      return failureCount < 3
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}
