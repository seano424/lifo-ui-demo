// lib/queries/users.ts - Enhanced with phone & language support

import { createClient } from '@/lib/supabase/client'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  User,
  UserUpdate,
  SupportedLanguage,
  SUPPORTED_LANGUAGES,
  isValidLanguage,
  isValidPhoneNumber,
  UpdatePhoneResponse,
  UpdateLanguageResponse,
} from '@/lib/types/user'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

// Updated transform function to handle new fields
export function transformAuthUserToUser(authUser: unknown): User {
  if (typeof authUser === 'object' && authUser !== null) {
    const user = authUser as Record<string, unknown>

    // Extract metadata from user_metadata
    const metadata = (
      user.user_metadata && typeof user.user_metadata === 'object'
        ? (user.user_metadata as Record<string, unknown>)
        : {}
    ) as Record<string, unknown>

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
      raw_user_meta_data: metadata,

      // Extract fields from metadata
      username: typeof metadata.username === 'string' ? metadata.username : '',
      full_name: typeof metadata.full_name === 'string' ? metadata.full_name : '',
      is_active: typeof metadata.is_active === 'boolean' ? metadata.is_active : true,
      avatar_url: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : '',
      last_login: typeof metadata.last_login === 'string' ? metadata.last_login : '',
      pin_hash: typeof metadata.pin_hash === 'string' ? metadata.pin_hash : '',
      pin_set_at: typeof metadata.pin_set_at === 'string' ? metadata.pin_set_at : '',
      pin_attempts: typeof metadata.pin_attempts === 'number' ? metadata.pin_attempts : 0,
      requires_pin: typeof metadata.requires_pin === 'boolean' ? metadata.requires_pin : false,
      email_verified:
        typeof metadata.email_verified === 'boolean' ? metadata.email_verified : false,
      phone_verified:
        typeof metadata.phone_verified === 'boolean' ? metadata.phone_verified : false,
      pin_expires_at: typeof metadata.pin_expires_at === 'string' ? metadata.pin_expires_at : '',
      pin_locked_until:
        typeof metadata.pin_locked_until === 'string' ? metadata.pin_locked_until : '',
      pin_delivery_method:
        typeof metadata.pin_delivery_method === 'string' ? metadata.pin_delivery_method : '',
      migrated_from_user_mgmt:
        typeof metadata.migrated_from_user_mgmt === 'boolean'
          ? metadata.migrated_from_user_mgmt
          : false,

      // 🆕 NEW FIELDS:
      phone: typeof user.phone === 'string' ? user.phone : null,
      language_preference:
        typeof metadata.language_preference === 'string' &&
        isValidLanguage(metadata.language_preference)
          ? metadata.language_preference
          : 'en', // Default to English
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
    phone: null,
    language_preference: 'en',
  }
}

// Existing filter types (unchanged)
export type UserFilters = {
  is_active?: boolean
  role?: string
  email?: string
  requires_pin?: boolean
  pin_locked?: boolean
  language?: SupportedLanguage // 🆕 Filter by language
  has_phone?: boolean // 🆕 Filter by phone presence
}

export type UsersPageParam = {
  page: number
  pageSize: number
}

// Existing fetch functions (enhanced but compatible)
export async function fetchUsers(serverClient?: ServerClient): Promise<User[]> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      console.error('[fetchUsers] RPC error:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

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

    // 🆕 NEW FILTERS:
    if (filters.language) {
      users = users.filter((user: User) => user.language_preference === filters.language)
    }

    if (filters.has_phone !== undefined) {
      users = users.filter((user: User) => {
        const hasPhone = !!(user.phone && user.phone.trim() !== '')
        return hasPhone === filters.has_phone
      })
    }

    // Handle role filtering (unchanged)
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

// 🆕 NEW: Phone update function
export async function updateUserPhone(
  userId: string,
  phone: string | null,
): Promise<UpdatePhoneResponse> {
  const supabase = createClient()

  try {
    // Validate phone number if provided
    if (phone && !isValidPhoneNumber(phone)) {
      throw new Error('Invalid phone number format')
    }

    const { data, error } = await supabase.rpc('update_user_phone', {
      target_user_id: userId,
      new_phone: phone,
    })

    if (error) {
      console.error('[updateUserPhone] RPC error:', error)
      throw new Error(`Failed to update phone: ${error.message}`)
    }

    return data as UpdatePhoneResponse
  } catch (err) {
    console.error('[updateUserPhone] Unexpected error:', err)
    throw err
  }
}

// 🆕 NEW: Language preference update function
export async function updateUserLanguagePreference(
  userId: string,
  languagePreference: SupportedLanguage,
): Promise<UpdateLanguageResponse> {
  const supabase = createClient()

  try {
    // Validate language
    if (!isValidLanguage(languagePreference)) {
      throw new Error(
        `Invalid language preference. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
      )
    }

    const { data, error } = await supabase.rpc('update_user_language_preference', {
      target_user_id: userId,
      new_language_preference: languagePreference,
    })

    if (error) {
      console.error('[updateUserLanguagePreference] RPC error:', error)
      throw new Error(`Failed to update language preference: ${error.message}`)
    }

    return data as UpdateLanguageResponse
  } catch (err) {
    console.error('[updateUserLanguagePreference] Unexpected error:', err)
    throw err
  }
}

// Enhanced updateUser function (includes phone and language)
export async function updateUser(userId: string, updates: UserUpdate): Promise<User> {
  const supabase = createClient()

  try {
    // Separate different types of updates
    const { email, phone, language_preference, ...metadataUpdates } = updates

    // Update email if provided using RPC function
    if (email) {
      const { error: emailError } = await supabase.rpc('update_user_email', {
        target_user_id: userId,
        new_email: email,
      })

      if (emailError) {
        console.error('[updateUser] Email update error:', emailError)
        throw new Error(`Failed to update email: ${emailError.message}`)
      }
    }

    // 🆕 Update phone if provided
    if (phone !== undefined) {
      await updateUserPhone(userId, phone)
    }

    // 🆕 Update language preference if provided
    if (language_preference) {
      await updateUserLanguagePreference(userId, language_preference)
    }

    // Update other metadata if provided using RPC function
    if (Object.keys(metadataUpdates).length > 0) {
      const { error: metadataError } = await supabase.rpc('update_user_metadata', {
        target_user_id: userId,
        metadata_updates: metadataUpdates,
      })

      if (metadataError) {
        console.error('[updateUser] Metadata update error:', metadataError)
        throw new Error(`Failed to update user metadata: ${metadataError.message}`)
      }
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
    return transformedUser
  } catch (err) {
    console.error('[updateUser] Unexpected error:', err)
    throw err
  }
}

// Existing functions (unchanged but compatible with new types)
export async function createUser(): Promise<User> {
  try {
    // For now, we'll need to implement this through a server action
    throw new Error(
      'User creation must be handled server-side. Please implement a server action or RPC function.',
    )
  } catch (err) {
    console.error('[createUser] Unexpected error:', err)
    throw err
  }
}

// Enhanced metadata update function
export async function updateUserMetadata(
  userId: string,
  metadata: Omit<UserUpdate, 'email' | 'phone' | 'language_preference'>,
): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.rpc('update_user_metadata', {
      target_user_id: userId,
      metadata_updates: metadata,
    })

    if (error) {
      console.error('[updateUserMetadata] Error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[updateUserMetadata] Unexpected error:', err)
    return false
  }
}

// Update email function (unchanged)
export async function updateUserEmail(userId: string, email: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { error } = await supabase.rpc('update_user_email', {
      target_user_id: userId,
      new_email: email,
    })

    if (error) {
      console.error('[updateUserEmail] Error:', error)
      return false
    }

    return true
  } catch (err) {
    console.error('[updateUserEmail] Unexpected error:', err)
    return false
  }
}

// Existing functions (unchanged)
export async function deleteUser(userId: string): Promise<void> {
  const supabase = createClient()

  try {
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
  } catch (err) {
    console.error('[deleteUser] Unexpected error:', err)
    throw err
  }
}

export async function fetchUserById(userId: string, serverClient?: ServerClient): Promise<User> {
  const supabase = serverClient || createClient()

  try {
    // Use the RPC function to get user with all metadata
    const { data, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      console.error('[fetchUserById] RPC error:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    // Find the specific user
    const userData = data?.find((user: Record<string, unknown>) => user.id === userId)

    if (!userData) {
      throw new Error(`User with ID "${userId}" not found`)
    }

    return transformAuthUserToUser(userData)
  } catch (err) {
    console.error('[fetchUserById] Unexpected error:', err)
    throw err
  }
}

// Rest of the functions remain unchanged...
export async function fetchUserRoles(userId: string): Promise<string[]> {
  const supabase = createClient()

  try {
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
    return roles
  } catch (err) {
    console.error('[fetchUserRoles] Unexpected error:', err)
    return []
  }
}

export async function checkUserHasRole(userId: string, roleName: string): Promise<boolean> {
  const supabase = createClient()

  try {
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
    // Get user and roles in parallel
    const [userResult, roles] = await Promise.all([
      fetchUserById(userId, serverClient),
      fetchUserRoles(userId),
    ])

    return {
      ...userResult,
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
    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser()

    if (authError || !user) {
      return null
    }

    // Transform the auth user to our User type
    const transformedUser = transformAuthUserToUser(user)

    return transformedUser
  } catch (err) {
    console.error('[fetchCurrentUser] Unexpected error:', err)
    return null
  }
}

// PIN-related utility functions (unchanged)
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
