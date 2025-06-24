// lib/queries/users.ts

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Type for a user row
export type User = Database['user_mgmt']['Tables']['users']['Row']

// Type for user filters
export type UserFilters = {
  is_active?: boolean
  role?: string // Will filter by role name via user_roles join
  email?: string
}

export type UsersPageParam = {
  page: number
  pageSize: number
}

export async function fetchUsers(serverClient?: ServerClient): Promise<User[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchUsers] Querying user_mgmt.users with no filters')

  const { data, error } = await supabase.schema('user_mgmt').from('users').select('*')

  console.log('[fetchUsers] Result:', { data, error })
  if (error) throw error
  return data as User[]
}

export async function fetchUsersPage(
  { page, pageSize }: UsersPageParam,
  filters: UserFilters = {},
  serverClient?: ServerClient,
): Promise<{
  data: User[]
  count: number
  nextPage: number | undefined
}> {
  const supabase = serverClient || createClient()

  // Simplified query - just get users without the complex join
  let query = supabase.schema('user_mgmt').from('users').select('*', { count: 'exact' })

  // Apply filters
  if (filters.is_active !== undefined) {
    console.log('[fetchUsersPage] Applying active filter:', filters.is_active)
    query = query.eq('is_active', filters.is_active)
  }

  if (filters.email) {
    console.log('[fetchUsersPage] Applying email filter:', filters.email)
    query = query.ilike('email', `%${filters.email}%`)
  }

  // Role filtering would need a more complex query or view
  // For now, we'll filter client-side if needed

  const rangeFrom = page * pageSize
  const rangeTo = (page + 1) * pageSize - 1
  console.log('[fetchUsersPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(rangeFrom, rangeTo)

  console.log('[fetchUsersPage] Supabase response:', { data, error, count })

  if (error) throw error

  return {
    data: (data as User[]) || [],
    count: count || 0,
    nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
  }
}

// CRUD mutations for users
export async function createUser(
  userData: Database['user_mgmt']['Tables']['users']['Insert'],
): Promise<User> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('user_mgmt')
    .from('users')
    .insert(userData)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function updateUser(
  userId: string,
  updates: Database['user_mgmt']['Tables']['users']['Update'],
): Promise<User> {
  const supabase = createClient()

  const { data, error } = await supabase
    .schema('user_mgmt')
    .from('users')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) throw error
  return data as User
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.schema('user_mgmt').from('users').delete().eq('user_id', userId)

  if (error) throw error
}

export async function fetchUserById(userId: string, serverClient?: ServerClient): Promise<User> {
  const supabase = serverClient || createClient()

  // Simple query for single user - roles are fetched separately
  const { data, error } = await supabase
    .schema('user_mgmt')
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error) throw error
  return data as User
}

// Role-specific queries using RPC functions (more reliable)
export async function fetchUserRoles(userId: string): Promise<string[]> {
  const supabase = createClient()

  // Use the RPC function which is more reliable than complex joins
  const { data, error } = await supabase
    .schema('user_mgmt')
    .rpc('get_user_roles', { user_uuid: userId })

  if (error) {
    console.error('[fetchUserRoles] Error:', error)
    // Return empty array on error instead of throwing
    return []
  }
  return data || []
}

export async function checkUserHasRole(userId: string, roleName: string): Promise<boolean> {
  const supabase = createClient()

  // Use the RPC function
  const { data, error } = await supabase
    .schema('user_mgmt')
    .rpc('has_role', { user_uuid: userId, role_name: roleName })

  if (error) {
    console.error('[checkUserHasRole] Error:', error)
    return false
  }
  return data || false
}
