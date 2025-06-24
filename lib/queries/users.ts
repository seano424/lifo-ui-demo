import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type User = Database['user_mgmt']['Tables']['users']['Row']

export type UserFilters = {
  is_active?: boolean
  role?: string
  email?: string
}

export type UsersPageParam = {
  page: number
  pageSize: number
}

export async function fetchUsers(serverClient?: ServerClient): Promise<User[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchUsers] Querying user_mgmt.users with no filters')

  try {
    const { data, error } = await supabase.schema('user_mgmt').from('users').select('*')

    if (error) {
      console.error('[fetchUsers] Supabase error:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    console.log('[fetchUsers] Success:', { count: data?.length })
    return data as User[]
  } catch (err) {
    console.error('[fetchUsers] Unexpected error:', err)
    throw err
  }
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

  try {
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

    const rangeFrom = page * pageSize
    const rangeTo = (page + 1) * pageSize - 1
    console.log('[fetchUsersPage] Pagination:', { page, pageSize, rangeFrom, rangeTo })

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeTo)

    if (error) {
      console.error('[fetchUsersPage] Supabase error:', error)
      throw new Error(`Failed to fetch users page: ${error.message}`)
    }

    console.log('[fetchUsersPage] Success:', {
      dataCount: data?.length,
      totalCount: count,
      hasNextPage: (count || 0) > (page + 1) * pageSize,
    })

    return {
      data: (data as User[]) || [],
      count: count || 0,
      nextPage: (count || 0) > (page + 1) * pageSize ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchUsersPage] Unexpected error:', err)
    throw err
  }
}

export async function createUser(
  userData: Database['user_mgmt']['Tables']['users']['Insert'],
): Promise<User> {
  const supabase = createClient()

  try {
    console.log('[createUser] Creating user:', {
      username: userData.username,
      email: userData.email,
    })

    const { data, error } = await supabase
      .schema('user_mgmt')
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (error) {
      console.error('[createUser] Supabase error:', error)

      // Handle specific error cases
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.message.includes('username')) {
          throw new Error(`Username "${userData.username}" is already taken`)
        }
        if (error.message.includes('email')) {
          throw new Error(`Email "${userData.email}" is already in use`)
        }
        throw new Error('User already exists')
      }

      throw new Error(`Failed to create user: ${error.message}`)
    }

    console.log('[createUser] Success:', { userId: data.user_id })
    return data as User
  } catch (err) {
    console.error('[createUser] Unexpected error:', err)
    throw err
  }
}

export async function updateUser(
  userId: string,
  updates: Database['user_mgmt']['Tables']['users']['Update'],
): Promise<User> {
  const supabase = createClient()

  try {
    console.log('[updateUser] Updating user:', { userId, updates })

    // Add updated_at timestamp
    const updateWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .schema('user_mgmt')
      .from('users')
      .update(updateWithTimestamp)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('[updateUser] Supabase error:', error)

      // Handle specific error cases
      if (error.code === 'PGRST116') {
        // No rows updated
        throw new Error(`User with ID "${userId}" not found`)
      }

      if (error.code === '23505') {
        // Unique constraint violation
        throw new Error('Username or email already in use')
      }

      throw new Error(`Failed to update user: ${error.message}`)
    }

    console.log('[updateUser] Success:', { userId })
    return data as User
  } catch (err) {
    console.error('[updateUser] Unexpected error:', err)
    throw err
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[deleteUser] Deleting user:', { userId })

    // ✅ Check for dependencies first
    const { data: userRoles, error: rolesError } = await supabase
      .schema('user_mgmt')
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .limit(1)

    if (rolesError) {
      console.error('[deleteUser] Error checking user roles:', rolesError)
      throw new Error(`Failed to check user roles: ${rolesError.message}`)
    }

    if (userRoles && userRoles.length > 0) {
      throw new Error('Cannot delete user with assigned roles. Remove roles first.')
    }

    const { error } = await supabase
      .schema('user_mgmt')
      .from('users')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('[deleteUser] Supabase error:', error)
      throw new Error(`Failed to delete user: ${error.message}`)
    }

    console.log('[deleteUser] Success:', { userId })
  } catch (err) {
    console.error('[deleteUser] Unexpected error:', err)
    throw err
  }
}

export async function fetchUserById(userId: string, serverClient?: ServerClient): Promise<User> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchUserById] Fetching user:', { userId })

    const { data, error } = await supabase
      .schema('user_mgmt')
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('[fetchUserById] Supabase error:', error)

      if (error.code === 'PGRST116') {
        // No rows found
        throw new Error(`User with ID "${userId}" not found`)
      }

      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    console.log('[fetchUserById] Success:', { userId })
    return data as User
  } catch (err) {
    console.error('[fetchUserById] Unexpected error:', err)
    throw err
  }
}

export async function fetchUserRoles(userId: string): Promise<string[]> {
  const supabase = createClient()

  try {
    console.log('[fetchUserRoles] Fetching roles for user:', { userId })

    const { data, error } = await supabase
      .schema('user_mgmt')
      .rpc('get_user_roles', { user_uuid: userId })

    if (error) {
      console.error('[fetchUserRoles] RPC error:', error)
      // Return empty array instead of throwing for non-critical errors
      return []
    }

    console.log('[fetchUserRoles] Success:', { userId, roles: data })
    return data || []
  } catch (err) {
    console.error('[fetchUserRoles] Unexpected error:', err)
    return []
  }
}

export async function checkUserHasRole(userId: string, roleName: string): Promise<boolean> {
  const supabase = createClient()

  try {
    console.log('[checkUserHasRole] Checking role:', { userId, roleName })

    const { data, error } = await supabase
      .schema('user_mgmt')
      .rpc('has_role', { user_uuid: userId, role_name: roleName })

    if (error) {
      console.error('[checkUserHasRole] RPC error:', error)
      return false
    }

    console.log('[checkUserHasRole] Success:', { userId, roleName, hasRole: !!data })
    return !!data
  } catch (err) {
    console.error('[checkUserHasRole] Unexpected error:', err)
    return false
  }
}

export async function fetchUserWithRoles(
  userId: string,
  serverClient?: ServerClient,
): Promise<User & { roles: string[] }> {
  const supabase = serverClient || createClient()

  try {
    console.log('[fetchUserWithRoles] Fetching user with roles:', { userId })

    // Get user and roles in parallel
    const [userResult, rolesResult] = await Promise.all([
      supabase.schema('user_mgmt').from('users').select('*').eq('user_id', userId).single(),
      supabase.schema('user_mgmt').rpc('get_user_roles', { user_uuid: userId }),
    ])

    if (userResult.error) {
      throw new Error(`Failed to fetch user: ${userResult.error.message}`)
    }

    console.log('[fetchUserWithRoles] Success:', {
      userId,
      roleCount: rolesResult.data?.length || 0,
    })

    return {
      ...(userResult.data as User),
      roles: rolesResult.data || [],
    }
  } catch (err) {
    console.error('[fetchUserWithRoles] Unexpected error:', err)
    throw err
  }
}
