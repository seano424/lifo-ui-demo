// lib/queries/store-users.ts - Final version with RPC fallback
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type StoreUser = {
  store_id: string
  user_id: string
  role_in_store: 'owner' | 'manager' | 'employee' | 'staff'
  permissions: Record<string, boolean>
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
  can_use_pin_auth: boolean
  pin_access_level: 'basic' | 'elevated' | 'admin'
  pin_permissions: Record<string, unknown>
  // User details from auth.users
  email: string
  created_at: string
  updated_at: string
  // User metadata from raw_user_meta_data
  username?: string
  full_name?: string
  avatar_url?: string
  last_login?: string
  requires_pin?: boolean
  pin_attempts?: number
  pin_locked_until?: string
  is_user_active?: boolean
}

export type StoreUserFilters = {
  role_in_store?: 'owner' | 'manager' | 'employee' | 'staff'
  is_active?: boolean
  can_use_pin_auth?: boolean
  pin_access_level?: 'basic' | 'elevated' | 'admin'
  email?: string
  full_name?: string
}

export type StoreUsersPageParam = {
  page: number
  pageSize: number
}

// Define the expected row shape for store user queries
interface StoreUserRow {
  store_id: string
  user_id: string
  role_in_store: 'owner' | 'manager' | 'employee' | 'staff'
  permissions?: Record<string, boolean>
  assigned_at: string
  assigned_by: string | null
  is_active: boolean
  can_use_pin_auth: boolean
  pin_access_level: 'basic' | 'elevated' | 'admin'
  pin_permissions?: Record<string, unknown>
  email?: string
  created_at?: string
  updated_at?: string
  raw_user_meta_data?: Record<string, unknown>
}

// Transform helper function
function transformStoreUserRow(row: StoreUserRow): StoreUser {
  const metadata = row.raw_user_meta_data || {}

  return {
    store_id: row.store_id,
    user_id: row.user_id,
    role_in_store: row.role_in_store,
    permissions: row.permissions || {},
    assigned_at: row.assigned_at,
    assigned_by: row.assigned_by,
    is_active: row.is_active,
    can_use_pin_auth: row.can_use_pin_auth,
    pin_access_level: row.pin_access_level,
    pin_permissions: row.pin_permissions || {},
    // User details
    email: row.email || '',
    created_at: row.created_at || '',
    updated_at: row.updated_at || '',
    // Metadata fields
    username: metadata.username,
    full_name: metadata.full_name,
    avatar_url: metadata.avatar_url,
    last_login: metadata.last_login,
    requires_pin: metadata.requires_pin,
    pin_attempts: metadata.pin_attempts,
    pin_locked_until: metadata.pin_locked_until,
    is_user_active: metadata.is_active,
  } as StoreUser
}

// Use RPC function for fetching (handles cross-schema joins)
export async function fetchStoreUsers(
  storeId: string,
  serverClient?: ServerClient,
): Promise<StoreUser[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchStoreUsers'

  logger.log(context, 'Fetching store users', { storeId })

  try {
    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId,
    })

    if (error) {
      logger.error(context, 'RPC error', {
        error: error.message,
        code: error.code,
        details: error.details,
        storeId,
      })
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    const storeUsers = (data || []).map(transformStoreUserRow)

    logger.log(context, 'Successfully fetched users', {
      storeId,
      userCount: storeUsers.length,
    })

    return storeUsers
  } catch (err) {
    logger.error(context, 'Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      storeId,
    })
    throw err
  }
}

// Use RPC function for paginated fetching
export async function fetchStoreUsersPage(
  storeId: string,
  { page, pageSize }: StoreUsersPageParam,
  filters: StoreUserFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: StoreUser[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_store_users_paginated', {
      input_store_id: storeId,
      page_number: page,
      page_size: pageSize,
      role_filter: filters.role_in_store || null,
      pin_auth_filter: filters.can_use_pin_auth,
    })

    if (error) {
      console.error('[fetchStoreUsersPage] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    let storeUsers = (data || []).map(transformStoreUserRow)

    // Apply client-side filters that the SQL function doesn't handle
    if (filters.email) {
      const emailLower = filters.email.toLowerCase()
      storeUsers = storeUsers.filter((user: StoreUser) =>
        user.email.toLowerCase().includes(emailLower),
      )
    }

    if (filters.full_name) {
      const nameLower = filters.full_name.toLowerCase()
      storeUsers = storeUsers.filter((user: StoreUser) =>
        user.full_name?.toLowerCase().includes(nameLower),
      )
    }

    const totalCount =
      data && data.length > 0 ? Number((data[0] as Record<string, unknown>)?.total_count || 0) : 0

    return {
      data: storeUsers,
      count: totalCount,
      nextPage: totalCount > (page + 1) * pageSize ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchStoreUsersPage] Unexpected error:', err)
    throw err
  }
}

// Fetch single store user using RPC function
export async function fetchStoreUserById(
  storeId: string,
  userId: string,
  serverClient?: ServerClient,
): Promise<StoreUser | null> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId,
    })

    if (error) {
      console.error('[fetchStoreUserById] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    const userRow = data?.find((row: StoreUserRow) => row.user_id === userId)

    if (!userRow) {
      return null
    }

    const storeUser = transformStoreUserRow(userRow)

    return storeUser
  } catch (err) {
    console.error('[fetchStoreUserById] Unexpected error:', err)
    throw err
  }
}

export async function updateStoreUser(
  storeId: string,
  userId: string,
  updates: {
    role_in_store?: 'owner' | 'manager' | 'employee' | 'staff'
    permissions?: Record<string, boolean>
    is_active?: boolean
    can_use_pin_auth?: boolean
    pin_access_level?: 'basic' | 'elevated' | 'admin'
    pin_permissions?: Record<string, unknown>
  },
): Promise<StoreUser> {
  const supabase = createClient()
  const context = 'updateStoreUser'

  logger.log(context, 'Starting user update', { storeId, userId, updates })

  try {
    // 🔍 Check authentication state
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user) {
      logger.error(context, 'No authenticated session', { storeId, userId })
      throw new Error('No authenticated session found')
    }

    logger.log(context, 'Session verified', { sessionUserId: session.user.id })

    // 🎯 METHOD 1: Try direct table update first
    try {
      logger.log(context, 'Attempting direct table update', { storeId, userId })

      const { error } = await supabase
        .schema('business')
        .from('store_users')
        .update(updates)
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        logger.warn(context, 'Direct update failed, trying RPC fallback', {
          error: error.message,
          code: error.code,
          details: error.details,
          storeId,
          userId,
        })
        throw error // Will be caught by outer try-catch
      }

      // Fetch complete user data after successful direct update
      const updatedUser = await fetchStoreUserById(storeId, userId)
      if (!updatedUser) {
        logger.error(context, 'User not found after direct update', { storeId, userId })
        throw new Error('Updated user not found after direct update')
      }

      logger.log(context, 'Direct update successful', { storeId, userId })
      return updatedUser
    } catch {
      // 🎯 METHOD 2: Fallback to RPC function (now with SECURITY DEFINER)
      logger.log(context, 'Executing RPC fallback', { storeId, userId })

      const { data: rpcData, error: rpcError } = await supabase.rpc('update_store_user_safe', {
        input_store_id: storeId,
        input_user_id: userId,
        input_role_in_store: updates.role_in_store || null,
        input_permissions: updates.permissions || null,
        input_is_active: updates.is_active ?? null,
        input_can_use_pin_auth: updates.can_use_pin_auth ?? null,
        input_pin_access_level: updates.pin_access_level || null,
        input_pin_permissions: updates.pin_permissions || null,
      })

      if (rpcError) {
        logger.error(context, 'RPC fallback failed', {
          error: rpcError.message,
          code: rpcError.code,
          details: rpcError.details,
          hint: rpcError.hint,
          storeId,
          userId,
          updates,
        })
        throw new Error(`Failed to update store user: ${rpcError.message}`)
      }

      if (!rpcData || rpcData.length === 0) {
        logger.error(context, 'No data returned from RPC', { storeId, userId })
        throw new Error('No data returned from RPC update')
      }

      logger.log(context, 'RPC update successful', { storeId, userId })
      return transformStoreUserRow(rpcData[0])
    }
  } catch (err: unknown) {
    logger.error(context, 'All update methods failed', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      storeId,
      userId,
      updates,
    })
    throw err
  }
}

// Helper function to test the update functionality
export async function testStoreUserUpdate(storeId: string, userId: string) {
  try {
    // Test a simple update that should work
    const result = await updateStoreUser(storeId, userId, {
      can_use_pin_auth: true,
    })

    return { success: true, result }
  } catch (error: unknown) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error))
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

// Remove user from store using SECURITY DEFINER RPC function
export async function removeUserFromStore(storeId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const context = 'removeUserFromStore'

  logger.log(context, 'Starting user removal', { storeId, userId })

  try {
    // Call the SECURITY DEFINER RPC function
    const { data, error } = await supabase.rpc('remove_user_from_store', {
      p_store_id: storeId,
      p_target_user_id: userId,
    })

    if (error) {
      logger.error(context, 'RPC error', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        storeId,
        userId,
      })
      throw new Error(`Failed to remove user from store: ${error.message}`)
    }

    // The RPC function returns JSON with success/error fields
    if (!data?.success) {
      logger.error(context, 'RPC returned failure', {
        rpcError: data?.error,
        rpcData: data,
        storeId,
        userId,
      })
      throw new Error(data?.error || 'Failed to remove user from store')
    }

    logger.log(context, 'User removed successfully', {
      storeId,
      userId,
      removedBy: data?.removed_by,
      removedUserRole: data?.removed_user_role,
    })
  } catch (err) {
    logger.error(context, 'Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      storeId,
      userId,
    })
    throw err
  }
}

// Direct table operations for adding users
export async function addUserToStore(
  storeId: string,
  userId: string,
  roleInStore: 'owner' | 'manager' | 'employee' | 'staff',
  permissions: Record<string, boolean> = {},
  canUsePinAuth: boolean = false,
  pinAccessLevel: 'basic' | 'elevated' | 'admin' = 'basic',
  pinPermissions: Record<string, unknown> = {},
): Promise<StoreUser> {
  const supabase = createClient()
  const context = 'addUserToStore'

  logger.log(context, 'Starting user addition', {
    storeId,
    userId,
    roleInStore,
    canUsePinAuth,
    pinAccessLevel,
  })

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const assignedBy = user?.id

    logger.log(context, 'Authenticated user', { assignedBy })

    const { error } = await supabase
      .schema('business')
      .from('store_users')
      .upsert({
        store_id: storeId,
        user_id: userId,
        role_in_store: roleInStore,
        permissions,
        assigned_by: assignedBy,
        is_active: true,
        can_use_pin_auth: canUsePinAuth,
        pin_access_level: pinAccessLevel,
        pin_permissions: pinPermissions,
      })
      .select()
      .single()

    if (error) {
      logger.error(context, 'Supabase upsert error', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        storeId,
        userId,
        roleInStore,
      })
      throw new Error(`Failed to add user to store: ${error.message}`)
    }

    const newStoreUser = await fetchStoreUserById(storeId, userId)
    if (!newStoreUser) {
      logger.error(context, 'User not found after addition', { storeId, userId })
      throw new Error('Added user not found')
    }

    logger.log(context, 'User added successfully', {
      storeId,
      userId,
      roleInStore,
      assignedBy,
    })

    return newStoreUser
  } catch (err) {
    logger.error(context, 'Unexpected error', {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
      storeId,
      userId,
      roleInStore,
    })
    throw err
  }
}

// Helper functions for permissions checking
export async function canManageStoreUser(storeId: string, targetUserId?: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('user_can_manage_store_users', {
      target_store_id: storeId,
      target_user_id: targetUserId || null,
    })

    if (error) {
      console.error('[canManageStoreUser] Error:', error)
      return false
    }

    return Boolean(data)
  } catch (err) {
    console.error('[canManageStoreUser] Unexpected error:', err)
    return false
  }
}

// Get current user's role in a store
export async function getCurrentUserRoleInStore(storeId: string): Promise<string | null> {
  const supabase = createClient()

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .schema('business')
      .from('store_users')
      .select('role_in_store')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (error) {
      // Check if user is store owner
      const { data: storeData } = await supabase
        .schema('business')
        .from('stores')
        .select('owner_id')
        .eq('store_id', storeId)
        .eq('owner_id', user.id)
        .single()

      return storeData ? 'owner' : null
    }

    return data?.role_in_store || null
  } catch (err) {
    console.error('[getCurrentUserRoleInStore] Unexpected error:', err)
    return null
  }
}
