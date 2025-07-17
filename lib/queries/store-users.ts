// lib/queries/store-users.ts
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

// SOLUTION: Use custom SQL function to handle cross-schema join
export async function fetchStoreUsers(
  storeId: string,
  serverClient?: ServerClient,
): Promise<StoreUser[]> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchStoreUsers] Fetching users for store:', { storeId })

    // Use custom SQL function to handle cross-schema join
    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId, // Updated parameter name
    })

    if (error) {
      console.error('[fetchStoreUsers] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    // Transform the data to match our StoreUser type
    const storeUsers = (data || []).map((row: StoreUserRow) => {
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
    })

    console.log('[fetchStoreUsers] Success:', { storeId, userCount: storeUsers.length })
    return storeUsers
  } catch (err) {
    console.error('[fetchStoreUsers] Unexpected error:', err)
    throw err
  }
}

// Updated paginated fetch using SQL function
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

    // Use the paginated SQL function
    const { data, error } = await supabase.rpc('get_store_users_paginated', {
      input_store_id: storeId, // Updated parameter name
      page_number: page,
      page_size: pageSize,
      role_filter: filters.role_in_store || null,
      pin_auth_filter: filters.can_use_pin_auth,
    })

    if (error) {
      console.error('[fetchStoreUsersPage] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    // Transform the data
    let storeUsers = (data || []).map((row: StoreUserRow) => {
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
    })

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

    // Use the RPC function to get all users for this store
    const { data, error } = await supabase.rpc('get_store_users', {
      input_store_id: storeId,
    })

    if (error) {
      console.error('[fetchStoreUserById] RPC error:', error)
      throw new Error(`Failed to fetch store users: ${error.message}`)
    }

    // Find the specific user
    const userRow = data?.find((row: StoreUserRow) => row.user_id === userId)

    if (!userRow) {
      console.log('[fetchStoreUserById] User not found in store:', { storeId, userId })
      return null
    }

    const metadata = userRow.raw_user_meta_data || {}

    const storeUser: StoreUser = {
      store_id: userRow.store_id,
      user_id: userRow.user_id,
      role_in_store: userRow.role_in_store,
      permissions: userRow.permissions || {},
      assigned_at: userRow.assigned_at,
      assigned_by: userRow.assigned_by,
      is_active: userRow.is_active,
      can_use_pin_auth: userRow.can_use_pin_auth,
      pin_access_level: userRow.pin_access_level,
      pin_permissions: userRow.pin_permissions || {},
      // User details
      email: userRow.email || '',
      created_at: userRow.created_at || '',
      updated_at: userRow.updated_at || '',
      // Metadata fields
      username: metadata.username,
      full_name: metadata.full_name,
      avatar_url: metadata.avatar_url,
      last_login: metadata.last_login,
      requires_pin: metadata.requires_pin,
      pin_attempts: metadata.pin_attempts,
      pin_locked_until: metadata.pin_locked_until,
      is_user_active: metadata.is_active,
    }

    console.log('[fetchStoreUserById] Success:', { storeId, userId })
    return storeUser
  } catch (err) {
    console.error('[fetchStoreUserById] Unexpected error:', err)
    throw err
  }
}

// Update store user (role, permissions, etc.) - This should work fine
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

    const { error } = await supabase
      .schema('business')
      .from('store_users')
      .update(updates)
      .eq('store_id', storeId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[updateStoreUser] Supabase error:', error)
      throw new Error(`Failed to update store user: ${error.message}`)
    }

    // Fetch the complete user data after update
    const updatedUser = await fetchStoreUserById(storeId, userId)
    if (!updatedUser) {
      throw new Error('Updated user not found')
    }

    console.log('[updateStoreUser] Success:', { storeId, userId })
    return updatedUser
  } catch (err) {
    console.error('[updateStoreUser] Unexpected error:', err)
    throw err
  }
}

// Remove user from store (set is_active to false)
export async function removeUserFromStore(storeId: string, userId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[removeUserFromStore] Removing user from store:', { storeId, userId })

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

// Add existing user to store
export async function addUserToStore(
  storeId: string,
  userId: string,
  roleInStore: 'owner' | 'manager' | 'employee' | 'staff',
  permissions: Record<string, boolean> = {},
  assignedBy?: string,
): Promise<StoreUser> {
  const supabase = createClient()

  try {
    console.log('[addUserToStore] Adding user to store:', {
      storeId,
      userId,
      roleInStore,
      permissions,
    })

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
        can_use_pin_auth: roleInStore === 'employee',
        pin_access_level: 'basic',
        pin_permissions: {},
      })
      .select()
      .single()

    if (error) {
      console.error('[addUserToStore] Supabase error:', error)
      throw new Error(`Failed to add user to store: ${error.message}`)
    }

    // Fetch the complete user data
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
