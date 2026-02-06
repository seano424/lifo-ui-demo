import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import { queryKeys } from '@/lib/queries/query-keys'

type DeleteAccountOptions = {
  deleteOwnedStores?: boolean
  deletionType?: 'user_request' | 'admin_action' | 'automated'
}

// Zod schemas for runtime validation
const DeletionStatusSchema = z.object({
  deletion_requested_at: z.string().nullable(),
  scheduled_for: z.string().nullable(),
  is_pending: z.boolean(),
  deleted_at: z.string().nullable(),
  grace_days: z.number().optional(),
})

const RequestDeletionSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  deletion_scheduled_for: z.string(),
  grace_days: z.number(),
})

const CancelDeletionSchema = z.object({
  success: z.boolean(),
  message: z.string(),
})

const GdprDeletionSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
})

/**
 * Check if current user has a pending deletion (30-day grace period)
 */
export function usePendingDeletion() {
  const supabase = createClient()

  return useQuery({
    queryKey: queryKeys.accountDeletion.pendingDeletion(),
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return null

      const { data, error } = await supabase.rpc('get_deletion_status', {
        target_user_id: user.id,
      })

      if (error) {
        console.error('Error fetching pending deletion:', error)
        return null
      }

      // Validate response with Zod
      const parsed = DeletionStatusSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Invalid deletion status response:', parsed.error)
        return null
      }

      const statusData = parsed.data

      if (!statusData?.deletion_requested_at || !statusData?.scheduled_for) return null

      const requestedAt = new Date(statusData.deletion_requested_at)
      const scheduledFor = new Date(statusData.scheduled_for)
      const daysRemaining = Math.max(
        0,
        Math.ceil((scheduledFor.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      )

      return {
        requestedAt,
        scheduledFor,
        daysRemaining,
      }
    },
    staleTime: 1 * 60 * 1000, // Check every 1 minute for critical deletion status
  })
}

/**
 * Request account deletion - starts 30-day grace period
 * User stays active and can cancel anytime within 30 days
 */
export function useRequestDeletion() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    retry: false, // Don't retry deletion requests to prevent duplicate operations
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('request_account_deletion', {
        target_user_id: user.id,
        deletion_type: 'user_request',
      })

      if (error) throw error

      // Validate response with Zod
      const parsed = RequestDeletionSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Invalid request deletion response:', parsed.error)
        throw new Error('Invalid response from server')
      }

      const result = parsed.data
      if (!result?.success) throw new Error(result?.message || 'Failed to request deletion')
      return result
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletion.pendingDeletion() })
      const date = new Date(data.deletion_scheduled_for).toLocaleDateString()
      toast.success(
        `Account scheduled for deletion on ${date}. You can cancel anytime before then.`,
      )
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to request deletion'
      toast.error(message)
    },
  })
}

/**
 * Cancel account deletion - user came back and wants to keep their account
 */
export function useCancelDeletion() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    retry: false, // Don't retry cancellation to prevent duplicate operations
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase.rpc('cancel_account_deletion', {
        target_user_id: user.id,
      })

      if (error) throw error

      // Validate response with Zod
      const parsed = CancelDeletionSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Invalid cancel deletion response:', parsed.error)
        throw new Error('Invalid response from server')
      }

      const result = parsed.data
      if (!result?.success) throw new Error(result?.message || 'Failed to cancel deletion')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletion.pendingDeletion() })
      toast.success('Account deletion cancelled. Welcome back!')
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to cancel deletion'
      toast.error(message)
    },
  })
}

/**
 * Immediate deletion (skip grace period) - for admin use or explicit immediate request
 *
 * This calls the `user_mgmt.gdpr_delete_user` or `user_mgmt.gdpr_delete_user_and_stores`
 * RPC function which:
 * - Logs deletion to gdpr_deletion_log
 * - Anonymizes user references across all schemas
 * - Soft-deletes user_mgmt.users record (sets deleted_at, anonymizes PII)
 * - Hard deletes auth.users record (CASCADE handles auth tables)
 *
 * @returns Mutation hook with mutate function that accepts DeleteAccountOptions
 */
export function useImmediateDeletion() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    retry: false, // Critical: never retry account deletion to prevent duplicate operations
    mutationFn: async (options: DeleteAccountOptions = {}) => {
      const { deleteOwnedStores = false, deletionType = 'user_request' } = options

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error('Not authenticated')
      }

      // Call the appropriate RPC function
      const rpcName = deleteOwnedStores ? 'gdpr_delete_user_and_stores' : 'gdpr_delete_user'

      const rpcParams = deleteOwnedStores
        ? {
            target_user_id: user.id,
            delete_owned_stores: true,
            deletion_type: deletionType,
            performed_by_user_id: user.id,
          }
        : {
            target_user_id: user.id,
            deletion_type: deletionType,
            performed_by_user_id: user.id,
          }

      const { data, error } = await supabase.rpc(rpcName, rpcParams)

      if (error) {
        console.error('RPC deletion error:', error)
        throw new Error(error.message || 'Failed to delete account')
      }

      // Validate response with Zod
      const parsed = GdprDeletionSchema.safeParse(data)
      if (!parsed.success) {
        console.error('Invalid GDPR deletion response:', parsed.error)
        throw new Error('Invalid response from server')
      }

      const result = parsed.data
      if (!result?.success) {
        throw new Error(result?.message || 'Deletion failed')
      }

      return result
    },
    onSuccess: async () => {
      // Invalidate specific user-related queries instead of removing all
      // This is less aggressive and better for app performance
      queryClient.invalidateQueries({ queryKey: queryKeys.accountDeletion.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })

      // Sign out (session is already invalid since auth.users row is gone)
      await supabase.auth.signOut()

      toast.success('Your account has been permanently deleted.')
      router.push('/login')
    },
    onError: (error: unknown) => {
      console.error('Account deletion error:', error)
      const message =
        error instanceof Error ? error.message : 'Failed to delete account. Please contact support.'
      toast.error(message)
    },
  })
}

/**
 * Legacy hook name - kept for backward compatibility
 * @deprecated Use useRequestDeletion() for grace period or useImmediateDeletion() for immediate deletion
 */
export function useDeleteAccount() {
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'useDeleteAccount is deprecated. Use useRequestDeletion() for grace period or useImmediateDeletion() for immediate deletion.',
    )
  }
  return useImmediateDeletion()
}
