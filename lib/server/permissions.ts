// lib/server/permissions.ts
import type { createClient as createServerClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export interface UserStorePermissions {
  canViewSettings: boolean
  canEditBasicInfo: boolean
  canEditAdvancedSettings: boolean
  canEditAISettings: boolean
  canManageTeam: boolean
  canViewAnalytics: boolean
  canUploadInventory: boolean
  canApplyDiscounts: boolean
  isOwner: boolean
  isManager: boolean
  isEmployee: boolean
  role: string | null
  storeId: string
  userId: string
}

export interface StoreAccessResult {
  hasAccess: boolean
  permissions: UserStorePermissions | null
  error?: string
}

/**
 * Server-side function to check comprehensive store permissions for a user
 */
export async function checkUserStorePermissions(
  userId: string,
  storeId: string,
  serverClient: ServerClient,
): Promise<StoreAccessResult> {
  try {
    // First check if user has direct store_users relationship
    const { data: storeUser, error: storeUserError } = await serverClient
      .schema('business')
      .from('store_users')
      .select('role_in_store, permissions, is_active')
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    // If no direct relationship, check if user is the store owner
    if (storeUserError || !storeUser) {
      const { data: store, error: storeError } = await serverClient
        .schema('business')
        .from('stores')
        .select('owner_id, store_name')
        .eq('store_id', storeId)
        .single()

      if (storeError) {
        console.error('❌ Store not found:', storeError)
        return {
          hasAccess: false,
          permissions: null,
          error: 'Store not found',
        }
      }

      if (store.owner_id !== userId) {
        return {
          hasAccess: false,
          permissions: null,
          error: 'No access to this store',
        }
      }

      // User is the owner
      return {
        hasAccess: true,
        permissions: {
          canViewSettings: true,
          canEditBasicInfo: true,
          canEditAdvancedSettings: true,
          canEditAISettings: true,
          canManageTeam: true,
          canViewAnalytics: true,
          canUploadInventory: true,
          canApplyDiscounts: true,
          isOwner: true,
          isManager: false,
          isEmployee: false,
          role: 'owner',
          storeId,
          userId,
        },
      }
    }

    // User has store_users relationship - determine permissions based on role and explicit permissions
    const permissions = storeUser.permissions || {}
    const role = storeUser.role_in_store

    const isOwner = role === 'owner'
    const isManager = role === 'manager'
    const isEmployee = role === 'employee' || role === 'staff'

    console.log('✅ User role determined:', { role, isOwner, isManager, isEmployee })

    // Calculate permissions based on role and explicit permissions
    const userPermissions: UserStorePermissions = {
      // Settings permissions
      canViewSettings:
        permissions.can_manage_settings || permissions.can_view_settings || isOwner || isManager,
      canEditBasicInfo:
        permissions.can_manage_settings || permissions.can_edit_basic_info || isOwner || isManager,
      canEditAdvancedSettings:
        permissions.can_manage_settings || permissions.can_edit_advanced_settings || isOwner,
      canEditAISettings: permissions.can_edit_ai_settings || isOwner, // Very restrictive

      // Team management
      canManageTeam:
        permissions.can_manage_team || permissions.can_manage_users || isOwner || isManager,

      // Analytics and inventory
      canViewAnalytics: permissions.can_view_analytics || isOwner || isManager,
      canUploadInventory: permissions.can_upload_inventory || isOwner || isManager || isEmployee,
      canApplyDiscounts: permissions.can_apply_discounts || isOwner || isManager,

      // Role flags
      isOwner,
      isManager,
      isEmployee,
      role,
      storeId,
      userId,
    }

    return {
      hasAccess: true,
      permissions: userPermissions,
    }
  } catch (error) {
    console.error('❌ Error checking store permissions:', error)
    return {
      hasAccess: false,
      permissions: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Helper function to require specific permissions and throw if not met
 */
export async function requireStorePermission(
  userId: string,
  storeId: string,
  requiredPermission: keyof Omit<UserStorePermissions, 'storeId' | 'userId' | 'role'>,
  serverClient: ServerClient,
): Promise<UserStorePermissions> {
  const result = await checkUserStorePermissions(userId, storeId, serverClient)

  if (!result.hasAccess || !result.permissions) {
    throw new Error(result.error || 'Access denied to store')
  }

  if (!result.permissions[requiredPermission]) {
    throw new Error(`Permission denied: ${requiredPermission} required`)
  }

  return result.permissions
}

/**
 * Get user's accessible stores with their roles
 */
export async function getUserAccessibleStores(
  userId: string,
  serverClient: ServerClient,
): Promise<
  Array<{
    storeId: string
    storeName: string
    role: string
    permissions: UserStorePermissions
  }>
> {
  try {
    // Get stores via store_users table
    const { data: storeUsers } = await serverClient
      .schema('business')
      .from('store_users')
      .select(
        `
        store_id,
        role_in_store,
        permissions,
        stores!inner(
          store_name,
          is_active
        )
      `,
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('stores.is_active', true)

    const { data: ownedStores } = await serverClient
      .schema('business')
      .from('stores')
      .select('store_id, store_name')
      .eq('owner_id', userId)
      .eq('is_active', true)

    const accessibleStores: Array<{
      storeId: string
      storeName: string
      role: string
      permissions: UserStorePermissions
    }> = []

    if (storeUsers) {
      for (const storeUser of storeUsers) {
        const permissionsResult = await checkUserStorePermissions(
          userId,
          storeUser.store_id,
          serverClient,
        )

        if (permissionsResult.hasAccess && permissionsResult.permissions) {
          accessibleStores.push({
            storeId: storeUser.store_id,
            storeName: (storeUser.stores as { store_name: string; is_active: boolean }[])[0]
              .store_name,
            role: storeUser.role_in_store,
            permissions: permissionsResult.permissions,
          })
        }
      }
    }

    if (ownedStores) {
      for (const store of ownedStores) {
        const alreadyAdded = accessibleStores.some(s => s.storeId === store.store_id)

        if (!alreadyAdded) {
          const permissionsResult = await checkUserStorePermissions(
            userId,
            store.store_id,
            serverClient,
          )

          if (permissionsResult.hasAccess && permissionsResult.permissions) {
            accessibleStores.push({
              storeId: store.store_id,
              storeName: store.store_name,
              role: 'owner',
              permissions: permissionsResult.permissions,
            })
          }
        }
      }
    }

    return accessibleStores
  } catch (error) {
    console.error('Error getting accessible stores:', error)
    return []
  }
}

/**
 * Middleware-like function to check access and return common page props.
 */
export async function withStoreAccess<T = object>(
  userId: string,
  storeId: string,
  requiredPermission: keyof Omit<UserStorePermissions, 'storeId' | 'userId' | 'role'>,
  serverClient: ServerClient,
  additionalProps?: T,
): Promise<
  | {
      hasAccess: true
      permissions: UserStorePermissions
      props: T
    }
  | {
      hasAccess: false
      errorType: 'unauthorized' | 'forbidden' | 'not-found'
      message: string
    }
> {
  try {
    const result = await checkUserStorePermissions(userId, storeId, serverClient)

    if (!result.hasAccess || !result.permissions) {
      return {
        hasAccess: false,
        errorType: 'not-found',
        message: result.error || 'Store not found or access denied',
      }
    }

    if (!result.permissions[requiredPermission]) {
      return {
        hasAccess: false,
        errorType: 'forbidden',
        message: `Permission denied: ${requiredPermission} required`,
      }
    }

    return {
      hasAccess: true,
      permissions: result.permissions,
      props: additionalProps || ({} as T),
    }
  } catch (error) {
    console.error('Error in withStoreAccess:', error)
    return {
      hasAccess: false,
      errorType: 'unauthorized',
      message: 'Authentication error',
    }
  }
}
