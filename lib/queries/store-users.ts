// lib/queries/store-users.ts - Final version with RPC fallback
import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

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

  try {
    console.log('[fetchStoreUsers] Fetching users for store:', { storeId })

    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId,
    })

    if (error) {
      console.error('[fetchStoreUsers] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    const storeUsers = (data || []).map(transformStoreUserRow)

    console.log('[fetchStoreUsers] Success:', { storeId, userCount: storeUsers.length })
    return storeUsers
  } catch (err) {
    console.error('[fetchStoreUsers] Unexpected error:', err)
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
    console.log('[fetchStoreUsersPage] Fetching users page:', { storeId, page, pageSize, filters })

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

    const totalCount = data.length > 0 ? Number(data[0]?.total_count || 0) : 0

    console.log('[fetchStoreUsersPage] Success:', {
      storeId,
      dataCount: storeUsers.length,
      totalCount,
      hasNextPage: totalCount > (page + 1) * pageSize,
    })

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
    console.log('[fetchStoreUserById] Fetching store user:', { storeId, userId })

    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId,
    })

    if (error) {
      console.error('[fetchStoreUserById] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    const userRow = data?.find((row: StoreUserRow) => row.user_id === userId)

    if (!userRow) {
      console.log('[fetchStoreUserById] User not found in store:', { storeId, userId })
      return null
    }

    const storeUser = transformStoreUserRow(userRow)

    console.log('[fetchStoreUserById] Success:', { storeId, userId })
    return storeUser
  } catch (err) {
    console.error('[fetchStoreUserById] Unexpected error:', err)
    throw err
  }
}

// HYBRID APPROACH: Try direct table operations first, fallback to RPC
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

  try {
    console.log('[updateStoreUser] Updating store user:', { storeId, userId, updates })

    // 🔍 First, check authentication state for debugging
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()
    if (!session?.user) {
      throw new Error('No authenticated session found')
    }
    console.log('[updateStoreUser] Auth check passed:', session.user.id)

    // 🎯 TRY METHOD 1: Direct table update (should work with proper RLS)
    try {
      const { data, error } = await supabase
        .schema('business')
        .from('store_users')
        .update(updates)
        .eq('store_id', storeId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        console.warn('[updateStoreUser] Direct update failed:', error.message)
        throw error // Will be caught by outer try-catch
      }

      console.log('[updateStoreUser] Direct update succeeded')

      // Fetch complete user data
      const updatedUser = await fetchStoreUserById(storeId, userId)
      if (!updatedUser) {
        throw new Error('Updated user not found')
      }

      return updatedUser
    } catch (directError: any) {
      // 🎯 METHOD 2: Fallback to RPC function
      console.log('[updateStoreUser] Falling back to RPC method')

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
        console.error('[updateStoreUser] RPC fallback also failed:', rpcError)
        throw new Error(`Failed to update store user: ${rpcError.message}`)
      }

      if (!rpcData || rpcData.length === 0) {
        throw new Error('No data returned from RPC update')
      }

      console.log('[updateStoreUser] RPC update succeeded')
      return transformStoreUserRow(rpcData[0])
    }
  } catch (err) {
    console.error('[updateStoreUser] All methods failed:', err)
    throw err
  }
}

// Direct table operations for removing users
export async function removeUserFromStore(storeId: string, userId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[removeUserFromStore] Removing user from store:', { storeId, userId })

    // Try direct update first
    const { error } = await supabase
      .schema('business')
      .from('store_users')
      .update({ is_active: false })
      .eq('store_id', storeId)
      .eq('user_id', userId)

    if (error) {
      console.error('[removeUserFromStore] Supabase error:', error)
      throw new Error(`Failed to remove user from store: ${error.message}`)
    }

    console.log('[removeUserFromStore] Success:', { storeId, userId })
  } catch (err) {
    console.error('[removeUserFromStore] Unexpected error:', err)
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

  try {
    console.log('[addUserToStore] Adding user to store:', {
      storeId,
      userId,
      roleInStore,
      permissions,
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const assignedBy = user?.id

    const { data, error } = await supabase
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
      console.error('[addUserToStore] Supabase error:', error)
      throw new Error(`Failed to add user to store: ${error.message}`)
    }

    const newStoreUser = await fetchStoreUserById(storeId, userId)
    if (!newStoreUser) {
      throw new Error('Added user not found')
    }

    console.log('[addUserToStore] Success:', { storeId, userId })
    return newStoreUser
  } catch (err) {
    console.error('[addUserToStore] Unexpected error:', err)
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
