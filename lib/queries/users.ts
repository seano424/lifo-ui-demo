import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Updated User type to match the new RPC function
export type User = {
  id: string
  email: string
  created_at: string
  updated_at: string
  raw_user_meta_data: Record<string, unknown>
  // Flattened metadata fields from RPC function
  username: string
  full_name: string
  is_active: boolean
  avatar_url: string
  last_login: string
  pin_hash: string
  pin_set_at: string
  pin_attempts: number
  requires_pin: boolean
  email_verified: boolean
  phone_verified: boolean
  pin_expires_at: string
  pin_locked_until: string
  pin_delivery_method: string
  migrated_from_user_mgmt: boolean
}

// Updated transform function (simplified since RPC does the work)
export function transformAuthUserToUser(authUser: unknown): User {
  // The RPC function now returns flattened data, so minimal transformation needed
  if (typeof authUser === 'object' && authUser !== null) {
    const user = authUser as Record<string, unknown>

    return {
      id: typeof user.id === 'string' ? user.id : '',
      email: typeof user.email === 'string' ? user.email : '',
      created_at: typeof user.created_at === 'string' ? user.created_at : '',
      updated_at:
        typeof user.updated_at === 'string'
          ? user.updated_at
          : typeof user.created_at === 'string'
            ? user.created_at
            : '',
      raw_user_meta_data:
        user.raw_user_meta_data && typeof user.raw_user_meta_data === 'object'
          ? (user.raw_user_meta_data as Record<string, unknown>)
          : {},
      // These are now directly returned by the RPC function
      username: typeof user.username === 'string' ? user.username : '',
      full_name: typeof user.full_name === 'string' ? user.full_name : '',
      is_active: typeof user.is_active === 'boolean' ? user.is_active : true,
      avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : '',
      last_login: typeof user.last_login === 'string' ? user.last_login : '',
      pin_hash: typeof user.pin_hash === 'string' ? user.pin_hash : '',
      pin_set_at: typeof user.pin_set_at === 'string' ? user.pin_set_at : '',
      pin_attempts: typeof user.pin_attempts === 'number' ? user.pin_attempts : 0,
      requires_pin: typeof user.requires_pin === 'boolean' ? user.requires_pin : false,
      email_verified: typeof user.email_verified === 'boolean' ? user.email_verified : false,
      phone_verified: typeof user.phone_verified === 'boolean' ? user.phone_verified : false,
      pin_expires_at: typeof user.pin_expires_at === 'string' ? user.pin_expires_at : '',
      pin_locked_until: typeof user.pin_locked_until === 'string' ? user.pin_locked_until : '',
      pin_delivery_method:
        typeof user.pin_delivery_method === 'string' ? user.pin_delivery_method : '',
      migrated_from_user_mgmt:
        typeof user.migrated_from_user_mgmt === 'boolean' ? user.migrated_from_user_mgmt : false,
    }
  }

  // Fallback for invalid data
  return {
    id: '',
    email: '',
    created_at: '',
    updated_at: '',
    raw_user_meta_data: {},
    username: '',
    full_name: '',
    is_active: true,
    avatar_url: '',
    last_login: '',
    pin_hash: '',
    pin_set_at: '',
    pin_attempts: 0,
    requires_pin: false,
    email_verified: false,
    phone_verified: false,
    pin_expires_at: '',
    pin_locked_until: '',
    pin_delivery_method: '',
    migrated_from_user_mgmt: false,
  }
}

export type UserFilters = {
  is_active?: boolean
  role?: string
  email?: string
  requires_pin?: boolean
  pin_locked?: boolean
}

export type UsersPageParam = {
  page: number
  pageSize: number
}

export async function fetchUsers(serverClient?: ServerClient): Promise<User[]> {
  const supabase = serverClient || createClient()
  console.log('[fetchUsers] Querying users via RPC')

  try {
    const { data, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      console.error('[fetchUsers] RPC error:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    console.log('[fetchUsers] Success:', { count: data?.length })
    return (data || []).map(transformAuthUserToUser)
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
    console.log('[fetchUsersPage] Fetching users page via RPC:', { page, pageSize, filters })

    const { data: allUsers, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      console.error('[fetchUsersPage] RPC error:', error)
      throw new Error(`Failed to fetch users page: ${error.message}`)
    }

    let users = (allUsers || []).map(transformAuthUserToUser)

    // Apply filters
    if (filters.is_active !== undefined) {
      users = users.filter((user: User) => user.is_active === filters.is_active)
    }

    if (filters.email) {
      const emailLower = filters.email.toLowerCase()
      users = users.filter((user: User) => user.email.toLowerCase().includes(emailLower))
    }

    if (filters.requires_pin !== undefined) {
      users = users.filter((user: User) => user.requires_pin === filters.requires_pin)
    }

    if (filters.pin_locked) {
      const now = new Date()
      users = users.filter(
        (user: User) => user.pin_locked_until && new Date(user.pin_locked_until) > now,
      )
    }

    // Handle role filtering
    if (filters.role) {
      console.log('[fetchUsersPage] Applying role filter:', filters.role)

      const { data: roleData, error: roleError } = await supabase
        .schema('user_mgmt')
        .from('user_roles')
        .select(
          `
          user_id,
          roles!inner(role_name)
        `,
        )
        .eq('roles.role_name', filters.role)

      if (roleError) {
        console.warn('[fetchUsersPage] Role filter error:', roleError)
      } else {
        const userIdsWithRole = roleData?.map(r => r.user_id) || []
        users = users.filter((user: User) => userIdsWithRole.includes(user.id))
      }
    }

    // Apply pagination
    const totalCount = users.length
    const startIndex = page * pageSize
    const endIndex = startIndex + pageSize
    const pageUsers = users.slice(startIndex, endIndex)

    console.log('[fetchUsersPage] Success:', {
      dataCount: pageUsers.length,
      totalCount,
      hasNextPage: totalCount > endIndex,
    })

    return {
      data: pageUsers,
      count: totalCount,
      nextPage: totalCount > endIndex ? page + 1 : undefined,
    }
  } catch (err) {
    console.error('[fetchUsersPage] Unexpected error:', err)
    throw err
  }
}

export async function updateUser(
  userId: string,
  updates: {
    email?: string
    username?: string
    full_name?: string
    is_active?: boolean
    requires_pin?: boolean
    pin_hash?: string
    pin_attempts?: number
    pin_locked_until?: string | null
    pin_set_at?: string
    last_login?: string
  },
): Promise<User> {
  const supabase = createClient()

  try {
    console.log('[updateUser] Updating user:', { userId, updates })

    // Separate email updates from metadata updates
    const { email, ...metadataUpdates } = updates

    // Update email if provided using RPC function
    if (email) {
      const { data: emailResult, error: emailError } = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: email,
      })

      if (emailError) {
        console.error('[updateUser] Email update error:', emailError)
        throw new Error(`Failed to update email: ${emailError.message}`)
      }

      console.log('[updateUser] Email updated:', emailResult)
    }

    // Update metadata if provided using RPC function
    if (Object.keys(metadataUpdates).length > 0) {
      const { data: metadataResult, error: metadataError } = await supabase.rpc(
        'update_user_metadata',
        {
          target_user_id: userId,
          metadata_updates: metadataUpdates,
        },
      )

      if (metadataError) {
        console.error('[updateUser] Metadata update error:', metadataError)
        throw new Error(`Failed to update user metadata: ${metadataError.message}`)
      }

      console.log('[updateUser] Metadata updated:', metadataResult)
    }

    // Fetch and return updated user using the RPC function
    const { data: updatedUserData, error: fetchError } =
      await supabase.rpc('get_users_with_metadata')

    if (fetchError) {
      throw new Error(`Failed to fetch updated user: ${fetchError.message}`)
    }

    // Find the updated user in the results
    const updatedUser = updatedUserData?.find((user: Record<string, unknown>) => user.id === userId)

    if (!updatedUser) {
      throw new Error(`Updated user not found`)
    }

    const transformedUser = transformAuthUserToUser(updatedUser)
    console.log('[updateUser] Success:', { userId })
    return transformedUser
  } catch (err) {
    console.error('[updateUser] Unexpected error:', err)
    throw err
  }
}

export async function createUser(userData: {
  email: string
  password?: string
  username?: string
  full_name?: string
  is_active?: boolean
  requires_pin?: boolean
  pin_delivery_method?: string
}): Promise<User> {
  try {
    console.log('[createUser] Creating user:', {
      username: userData.username,
      email: userData.email,
    })

    // For now, we'll need to implement this through a server action
    // or create an RPC function for user creation
    throw new Error(
      'User creation must be handled server-side. Please implement a server action or RPC function.',
    )
  } catch (err) {
    console.error('[createUser] Unexpected error:', err)
    throw err
  }
}

// Alternative: Create a simpler user update that only handles metadata
export async function updateUserMetadata(
  userId: string,
  metadata: {
    username?: string
    full_name?: string
    is_active?: boolean
    requires_pin?: boolean
    pin_hash?: string
    pin_attempts?: number
    pin_locked_until?: string | null
    pin_set_at?: string
    last_login?: string
  },
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('update_user_metadata', {
      target_user_id: userId,
      metadata_updates: metadata,
    })

    if (error) {
      console.error('[updateUserMetadata] Error:', error)
      return false
    }

    console.log('[updateUserMetadata] Success:', data)
    return true
  } catch (err) {
    console.error('[updateUserMetadata] Unexpected error:', err)
    return false
  }
}

// Alternative: Update only email
export async function updateUserEmail(userId: string, email: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase.rpc('update_user_email', {
      target_user_id: userId,
      new_email: email,
    })

    if (error) {
      console.error('[updateUserEmail] Error:', error)
      return false
    }

    console.log('[updateUserEmail] Success:', data)
    return true
  } catch (err) {
    console.error('[updateUserEmail] Unexpected error:', err)
    return false
  }
}

export async function deleteUser(userId: string): Promise<void> {
  const supabase = createClient()

  try {
    console.log('[deleteUser] Deleting user:', { userId })

    // Check for dependencies first
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

    // Delete from auth.users (this will cascade to related tables)
    const { error } = await supabase.auth.admin.deleteUser(userId)

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
      .from('auth.users')
      .select('id, email, created_at, updated_at, raw_user_meta_data')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[fetchUserById] Supabase error:', error)

      if (error.code === 'PGRST116') {
        throw new Error(`User with ID "${userId}" not found`)
      }

      throw new Error(`Failed to fetch user: ${error.message}`)
    }

    console.log('[fetchUserById] Success:', { userId })
    return transformAuthUserToUser(data)
  } catch (err) {
    console.error('[fetchUserById] Unexpected error:', err)
    throw err
  }
}

export async function fetchUserRoles(userId: string): Promise<string[]> {
  const supabase = createClient()

  try {
    console.log('[fetchUserRoles] Fetching roles for user:', { userId })

    // Query user_mgmt.user_roles joined with roles table
    const { data, error } = await supabase
      .schema('user_mgmt')
      .from('user_roles')
      .select(
        `
        roles!inner(role_name)
      `,
      )
      .eq('user_id', userId)

    if (error) {
      console.error('[fetchUserRoles] Query error:', error)
      return []
    }

    const roles = data
      ? data.flatMap((item: { roles: { role_name: string }[] }) =>
          Array.isArray(item.roles) ? item.roles.map(r => r.role_name) : [],
        )
      : []
    console.log('[fetchUserRoles] Success:', { userId, roles })
    return roles
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
      .from('user_roles')
      .select('user_id')
      .eq('user_id', userId)
      .eq('roles.role_name', roleName)
      .limit(1)

    if (error) {
      console.error('[checkUserHasRole] Query error:', error)
      return false
    }

    const hasRole = (data?.length || 0) > 0
    console.log('[checkUserHasRole] Success:', { userId, roleName, hasRole })
    return hasRole
  } catch (err) {
    console.error('[checkUserHasRole] Unexpected error:', err)
    return false
  }
}

export async function fetchUserWithRoles(
  userId: string,
  serverClient?: ServerClient,
): Promise<User & { roles: string[] }> {
  try {
    console.log('[fetchUserWithRoles] Fetching user with roles:', { userId })

    // Get user and roles in parallel
    const [userResult, roles] = await Promise.all([
      fetchUserById(userId, serverClient),
      fetchUserRoles(userId),
    ])

    console.log('[fetchUserWithRoles] Success:', {
      userId,
      roleCount: roles.length,
    })

    return {
      ...transformAuthUserToUser(userResult as unknown as Record<string, unknown>),
      roles,
    }
  } catch (err) {
    console.error('[fetchUserWithRoles] Unexpected error:', err)
    throw err
  }
}

export async function fetchCurrentUser(
  serverClient: Awaited<ReturnType<typeof createServerClient>>,
) {
  try {
    console.log('[fetchCurrentUser] Getting server-side user')

    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser()

    if (authError || !user) {
      console.log('[fetchCurrentUser] No authenticated user')
      return null
    }

    // Transform the auth user to our User type
    const transformedUser = transformAuthUserToUser(user)

    console.log('[fetchCurrentUser] Success:', { userId: user.id })
    return {
      auth: user,
      profile: transformedUser,
    }
  } catch (err) {
    console.error('[fetchCurrentUser] Unexpected error:', err)
    return null
  }
}

// PIN-related utility functions
export async function updateUserPinHash(userId: string, pinHash: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      pin_hash: pinHash,
      pin_set_at: new Date().toISOString(),
      pin_attempts: 0,
      pin_locked_until: null,
    },
  })

  if (error) {
    throw new Error(`Failed to update PIN: ${error.message}`)
  }
}

export async function incrementPinAttempts(userId: string): Promise<void> {
  const user = await fetchUserById(userId)
  const attempts = (user.pin_attempts || 0) + 1

  const updates: Record<string, unknown> = { pin_attempts: attempts }

  // Lock user after 3 failed attempts
  if (attempts >= 3) {
    const lockUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    updates.pin_locked_until = lockUntil.toISOString()
  }

  await updateUser(userId, updates)
}

export async function resetPinAttempts(userId: string): Promise<void> {
  await updateUser(userId, {
    pin_attempts: 0,
    pin_locked_until: null,
  })
}

export async function validateUserPin(userId: string): Promise<boolean> {
  const user = await fetchUserById(userId)

  // Check if user is locked
  if (user.pin_locked_until && new Date() < new Date(user.pin_locked_until)) {
    throw new Error('Account is temporarily locked')
  }

  // TODO: Implement PIN validation logic with bcrypt
  // const isValid = await bcrypt.compare(pin, user.pin_hash)

  // For now, placeholder validation
  const isValid = false // Replace with actual PIN validation

  if (!isValid) {
    await incrementPinAttempts(userId)
    return false
  }

  await resetPinAttempts(userId)
  await updateUser(userId, { last_login: new Date().toISOString() })

  return true
}
