// hooks/use-store-permissions.ts - IMPROVED VERSION (Hydration Safe)
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useCurrentUser } from '@/hooks/use-users'
import type { UserStorePermissions } from '@/lib/server/permissions'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { createClient } from '@/lib/supabase/client'

interface UseStorePermissionsOptions {
  serverPermissions?: UserStorePermissions // Server-computed permissions as fallback
  enabled?: boolean
}

interface ExtendedPermissions extends UserStorePermissions {
  isLoading: boolean
  error: Error | null
}

export function useStorePermissions(options: UseStorePermissionsOptions = {}): ExtendedPermissions {
  const { serverPermissions, enabled = true } = options
  const activeStoreId = useActiveStoreId()
  const { data: currentUser, isLoading: userLoading } = useCurrentUser()
  const [isHydrated, setIsHydrated] = useState(false)

  // 🚀 Track hydration to prevent SSR/client mismatch
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  const permissionsQuery = useQuery({
    queryKey: ['store-permissions', activeStoreId, currentUser?.id],
    queryFn: async () => {
      if (!activeStoreId || !currentUser?.id) {
        throw new Error('Missing store ID or user ID')
      }

      const supabase = createClient()

      console.log('🔍 Fetching permissions for:', { activeStoreId, userId: currentUser.id })

      // Check store_users relationship
      const { data: storeUser, error: storeUserError } = await supabase
        .schema('business')
        .from('store_users')
        .select('role_in_store, permissions, is_active')
        .eq('store_id', activeStoreId)
        .eq('user_id', currentUser.id)
        .eq('is_active', true)
        .single()

      let role = null
      let permissions: Record<string, boolean> = {}
      let isOwner = false

      if (storeUserError || !storeUser) {
        console.log('📋 No store_users record, checking ownership...')

        // Check if user is store owner
        const { data: store } = await supabase
          .schema('business')
          .from('stores')
          .select('owner_id')
          .eq('store_id', activeStoreId)
          .single()

        if (store?.owner_id === currentUser.id) {
          console.log('👑 User is store owner')
          isOwner = true
          role = 'owner'
          permissions = {} // Owner has all permissions by default
        } else {
          throw new Error('No access to this store')
        }
      } else {
        console.log('✅ Found store_users record:', storeUser)
        role = storeUser.role_in_store
        permissions = storeUser.permissions || {}
        isOwner = role === 'owner'
      }

      const isManager = role === 'manager'
      const isEmployee = role === 'employee' || role === 'staff'

      // Calculate permissions based on role and explicit permissions
      const calculatedPermissions: UserStorePermissions = {
        canViewSettings:
          permissions.can_manage_settings || permissions.can_view_settings || isOwner || isManager,
        canEditBasicInfo:
          permissions.can_manage_settings ||
          permissions.can_edit_basic_info ||
          isOwner ||
          isManager,
        canEditAdvancedSettings:
          permissions.can_manage_settings || permissions.can_edit_advanced_settings || isOwner,
        canEditAISettings: permissions.can_edit_ai_settings || isOwner,
        canManageTeam:
          permissions.can_manage_team || permissions.can_manage_users || isOwner || isManager,
        canViewAnalytics: permissions.can_view_analytics || isOwner || isManager,
        canUploadInventory: permissions.can_upload_inventory || isOwner || isManager || isEmployee,
        canApplyDiscounts: permissions.can_apply_discounts || isOwner || isManager,
        isOwner,
        isManager,
        isEmployee,
        role,
        storeId: activeStoreId,
        userId: currentUser.id,
      }

      console.log('🎯 Calculated permissions:', calculatedPermissions)
      return calculatedPermissions
    },
    enabled: enabled && !!activeStoreId && !!currentUser?.id && !userLoading && isHydrated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on permission errors
      if (error?.message?.includes('No access') || error?.message?.includes('permission denied')) {
        return false
      }
      return failureCount < 2
    },
    // 🚀 CRITICAL: Use server permissions as initial data to prevent hydration flash
    initialData: serverPermissions,
    // Only refetch if we don't have server permissions OR they might be stale
    refetchOnMount: !serverPermissions,
    refetchOnWindowFocus: false,
  })

  // 🚀 CRITICAL FIX: Return server permissions immediately during hydration
  if (!isHydrated && serverPermissions) {
    console.log('⚡ Returning server permissions during hydration')
    return {
      ...serverPermissions,
      isLoading: false,
      error: null,
    }
  }

  // Return server permissions if query is still loading and we have them
  if (permissionsQuery.isLoading && serverPermissions) {
    console.log('⏳ Returning server permissions while query loads')
    return {
      ...serverPermissions,
      isLoading: false, // Don't show loading if we have server permissions
      error: null,
    }
  }

  // Default safe permissions if no data available
  const fallbackPermissions: UserStorePermissions = {
    canViewSettings: false,
    canEditBasicInfo: false,
    canEditAdvancedSettings: false,
    canEditAISettings: false,
    canManageTeam: false,
    canViewAnalytics: false,
    canUploadInventory: false,
    canApplyDiscounts: false,
    isOwner: false,
    isManager: false,
    isEmployee: false,
    role: null,
    storeId: activeStoreId || '',
    userId: currentUser?.id || '',
  }

  const finalPermissions = permissionsQuery.data || serverPermissions || fallbackPermissions
  const isStillLoading =
    !isHydrated ||
    permissionsQuery.isLoading ||
    userLoading ||
    (!permissionsQuery.data && !serverPermissions)

  return {
    ...finalPermissions,
    isLoading: isStillLoading,
    error: permissionsQuery.error as Error | null,
  }
}

// Specialized hooks for specific permission checks
export function useCanEditStore(serverPermissions?: UserStorePermissions) {
  const permissions = useStorePermissions({ serverPermissions })
  return {
    canEdit: permissions.canEditBasicInfo,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}

export function useCanManageTeam(serverPermissions?: UserStorePermissions) {
  const permissions = useStorePermissions({ serverPermissions })
  return {
    canManage: permissions.canManageTeam,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}

export function useCanViewAnalytics(serverPermissions?: UserStorePermissions) {
  const permissions = useStorePermissions({ serverPermissions })
  return {
    canView: permissions.canViewAnalytics,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}

// Role-based hooks
export function useIsStoreOwner(serverPermissions?: UserStorePermissions) {
  const permissions = useStorePermissions({ serverPermissions })
  return {
    isOwner: permissions.isOwner,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}

export function useIsStoreManager(serverPermissions?: UserStorePermissions) {
  const permissions = useStorePermissions({ serverPermissions })
  return {
    isManager: permissions.isManager,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}

// Combined permission checker
export function useRequirePermission(
  requiredPermission: keyof Omit<
    UserStorePermissions,
    'storeId' | 'userId' | 'role' | 'isOwner' | 'isManager' | 'isEmployee'
  >,
  serverPermissions?: UserStorePermissions,
) {
  const permissions = useStorePermissions({ serverPermissions })

  return {
    hasPermission: permissions[requiredPermission],
    permissions,
    isLoading: permissions.isLoading,
    error: permissions.error,
  }
}
