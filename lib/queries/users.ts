// lib/queries/users.ts - Enhanced with phone & language support

import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import {
  isValidLanguage,
  isValidPhoneNumber,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
  type UpdateLanguageResponse,
  type UpdatePhoneResponse,
  type User,
  type UserUpdate,
} from '@/lib/types/user'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

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
  return withPerformanceTracking('lib/queries/users', 'fetchUsers', {}, async () => {
    const supabase = serverClient || createClient()

    const { data, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      logger.queryWarn('lib/queries/users', 'RPC error in fetchUsers', {
        error: error.message,
        code: error.code,
      })
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    const users = (data || []).map(transformAuthUserToUser)
    return users
  })
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
  return withPerformanceTracking(
    'lib/queries/users',
    'fetchUsersPage',
    { page, pageSize, filters },
    async () => {
      const supabase = serverClient || createClient()

      const { data: allUsers, error } = await supabase.rpc('get_users_with_metadata')

      if (error) {
        logger.queryWarn('lib/queries/users', 'RPC error in fetchUsersPage', {
          error: error.message,
          code: error.code,
        })
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
          logger.warn('lib/queries/users', 'Role filter error in fetchUsersPage', {
            error: roleError.message,
            role: filters.role,
          })
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
    },
  )
}

// 🆕 NEW: Phone update function
export async function updateUserPhone(
  userId: string,
  phone: string | null,
): Promise<UpdatePhoneResponse> {
  return withPerformanceTracking(
    'lib/queries/users',
    'updateUserPhone',
    { userId, hasPhone: !!phone },
    async () => {
      const supabase = createClient()

      // Validate phone number if provided
      if (phone && !isValidPhoneNumber(phone)) {
        logger.error('lib/queries/users', 'Invalid phone number format', { userId })
        throw new Error('Invalid phone number format')
      }

      const { data, error } = await supabase.rpc('update_user_phone', {
        target_user_id: userId,
        new_phone: phone,
      })

      if (error) {
        logger.queryWarn('lib/queries/users', 'RPC error in updateUserPhone', {
          error: error.message,
          code: error.code,
          userId,
        })
        throw new Error(`Failed to update phone: ${error.message}`)
      }

      return data as UpdatePhoneResponse
    },
  )
}

// 🆕 NEW: Language preference update function
export async function updateUserLanguagePreference(
  userId: string,
  languagePreference: SupportedLanguage,
): Promise<UpdateLanguageResponse> {
  return withPerformanceTracking(
    'lib/queries/users',
    'updateUserLanguagePreference',
    { userId, languagePreference },
    async () => {
      const supabase = createClient()

      // Validate language
      if (!isValidLanguage(languagePreference)) {
        logger.error('lib/queries/users', 'Invalid language preference', {
          userId,
          languagePreference,
        })
        throw new Error(
          `Invalid language preference. Supported languages: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`,
        )
      }

      const { data, error } = await supabase.rpc('update_user_language_preference', {
        target_user_id: userId,
        new_language_preference: languagePreference,
      })

      if (error) {
        logger.queryWarn('lib/queries/users', 'RPC error in updateUserLanguagePreference', {
          error: error.message,
          code: error.code,
          userId,
        })
        throw new Error(`Failed to update language preference: ${error.message}`)
      }

      return data as UpdateLanguageResponse
    },
  )
}

// 🆕 NEW: Optimized username lookup function
export async function getUserByUsername(
  username: string,
  serverClient?: ServerClient,
): Promise<{ user_id: string; email: string } | null> {
  return withPerformanceTracking(
    'lib/queries/users',
    'getUserByUsername',
    { username },
    async () => {
      const supabase = serverClient || createClient()

      const { data, error } = await supabase.rpc('get_user_by_username', {
        p_username: username,
      })

      if (error) {
        logger.queryWarn('lib/queries/users', 'RPC error in getUserByUsername', {
          error: error.message,
          code: error.code,
          username,
        })
        throw new Error(`Failed to lookup user by username: ${error.message}`)
      }

      if (!data || data.length === 0) {
        logger.log('lib/queries/users', 'User not found by username', { username })
        return null
      }

      return data[0]
    },
  )
}

// Enhanced updateUser function (includes phone and language)
export async function updateUser(userId: string, updates: UserUpdate): Promise<User> {
  return withPerformanceTracking(
    'lib/queries/users',
    'updateUser',
    { userId, updateFields: Object.keys(updates) },
    async () => {
      const supabase = createClient()

      // Separate different types of updates
      const { email, phone, language_preference, ...metadataUpdates } = updates

      // Update email if provided using RPC function
      if (email) {
        const { error: emailError } = await supabase.rpc('update_user_email', {
          target_user_id: userId,
          new_email: email,
        })

        if (emailError) {
          logger.error('lib/queries/users', 'Email update error in updateUser', {
            error: emailError.message,
            code: emailError.code,
            userId,
          })
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
          logger.error('lib/queries/users', 'Metadata update error in updateUser', {
            error: metadataError.message,
            code: metadataError.code,
            userId,
          })
          throw new Error(`Failed to update user metadata: ${metadataError.message}`)
        }
      }

      // Fetch and return updated user using the RPC function
      const { data: updatedUserData, error: fetchError } =
        await supabase.rpc('get_users_with_metadata')

      if (fetchError) {
        logger.queryWarn('lib/queries/users', 'Error fetching updated user', {
          error: fetchError.message,
          code: fetchError.code,
          userId,
        })
        throw new Error(`Failed to fetch updated user: ${fetchError.message}`)
      }

      // Find the updated user in the results
      const updatedUser = updatedUserData?.find(
        (user: Record<string, unknown>) => user.id === userId,
      )

      if (!updatedUser) {
        logger.error('lib/queries/users', 'Updated user not found after update', { userId })
        throw new Error(`Updated user not found`)
      }

      const transformedUser = transformAuthUserToUser(updatedUser)
      return transformedUser
    },
  )
}

// Existing functions (unchanged but compatible with new types)
export async function createUser(): Promise<User> {
  logger.error('lib/queries/users', 'createUser not implemented', {})
  throw new Error(
    'User creation must be handled server-side. Please implement a server action or RPC function.',
  )
}

// Enhanced metadata update function
export async function updateUserMetadata(
  userId: string,
  metadata: Omit<UserUpdate, 'email' | 'phone' | 'language_preference'>,
): Promise<boolean> {
  return withPerformanceTracking(
    'lib/queries/users',
    'updateUserMetadata',
    { userId, metadataFields: Object.keys(metadata) },
    async () => {
      const supabase = createClient()

      const { error } = await supabase.rpc('update_user_metadata', {
        target_user_id: userId,
        metadata_updates: metadata,
      })

      if (error) {
        logger.error('lib/queries/users', 'Error in updateUserMetadata', {
          error: error.message,
          code: error.code,
          userId,
        })
        return false
      }

      return true
    },
  )
}

// Update email function (unchanged)
export async function updateUserEmail(userId: string, email: string): Promise<boolean> {
  return withPerformanceTracking('lib/queries/users', 'updateUserEmail', { userId }, async () => {
    const supabase = createClient()

    const { error } = await supabase.rpc('update_user_email', {
      target_user_id: userId,
      new_email: email,
    })

    if (error) {
      logger.error('lib/queries/users', 'Error in updateUserEmail', {
        error: error.message,
        code: error.code,
        userId,
      })
      return false
    }

    return true
  })
}

// Existing functions (unchanged)
export async function deleteUser(userId: string): Promise<void> {
  return withPerformanceTracking('lib/queries/users', 'deleteUser', { userId }, async () => {
    const supabase = createClient()

    // Check for dependencies first
    const { data: userRoles, error: rolesError } = await supabase
      .schema('user_mgmt')
      .from('user_roles')
      .select('role_id')
      .eq('user_id', userId)
      .limit(1)

    if (rolesError) {
      logger.error('lib/queries/users', 'Error checking user roles in deleteUser', {
        error: rolesError.message,
        code: rolesError.code,
        userId,
      })
      throw new Error(`Failed to check user roles: ${rolesError.message}`)
    }

    if (userRoles && userRoles.length > 0) {
      logger.error('lib/queries/users', 'Cannot delete user with assigned roles', { userId })
      throw new Error('Cannot delete user with assigned roles. Remove roles first.')
    }

    // Delete from auth.users (this will cascade to related tables)
    const { error } = await supabase.auth.admin.deleteUser(userId)

    if (error) {
      logger.error('lib/queries/users', 'Supabase error in deleteUser', {
        error: error.message,
        userId,
      })
      throw new Error(`Failed to delete user: ${error.message}`)
    }
  })
}

export async function fetchUserById(userId: string, serverClient?: ServerClient): Promise<User> {
  return withPerformanceTracking('lib/queries/users', 'fetchUserById', { userId }, async () => {
    const supabase = serverClient || createClient()

    // Use the RPC function to get user with all metadata
    const { data, error } = await supabase.rpc('get_users_with_metadata')

    if (error) {
      logger.queryWarn('lib/queries/users', 'RPC error in fetchUserById', {
        error: error.message,
        code: error.code,
        userId,
      })
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    // Find the specific user
    const userData = data?.find((user: Record<string, unknown>) => user.id === userId)

    if (!userData) {
      logger.error('lib/queries/users', 'User not found by ID', { userId })
      throw new Error(`User with ID "${userId}" not found`)
    }

    return transformAuthUserToUser(userData)
  })
}

// Rest of the functions remain unchanged...
export async function fetchUserRoles(userId: string): Promise<string[]> {
  return withPerformanceTracking('lib/queries/users', 'fetchUserRoles', { userId }, async () => {
    const supabase = createClient()

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
      logger.queryWarn('lib/queries/users', 'Query error in fetchUserRoles', {
        error: error.message,
        code: error.code,
        userId,
      })
      return []
    }

    const roles = data
      ? data.flatMap((item: { roles: { role_name: string }[] }) =>
          Array.isArray(item.roles) ? item.roles.map(r => r.role_name) : [],
        )
      : []
    return roles
  })
}

export async function checkUserHasRole(userId: string, roleName: string): Promise<boolean> {
  return withPerformanceTracking(
    'lib/queries/users',
    'checkUserHasRole',
    { userId, roleName },
    async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .schema('user_mgmt')
        .from('user_roles')
        .select('user_id')
        .eq('user_id', userId)
        .eq('roles.role_name', roleName)
        .limit(1)

      if (error) {
        logger.queryWarn('lib/queries/users', 'Query error in checkUserHasRole', {
          error: error.message,
          code: error.code,
          userId,
          roleName,
        })
        return false
      }

      const hasRole = (data?.length || 0) > 0
      return hasRole
    },
  )
}

export async function fetchUserWithRoles(
  userId: string,
  serverClient?: ServerClient,
): Promise<User & { roles: string[] }> {
  return withPerformanceTracking(
    'lib/queries/users',
    'fetchUserWithRoles',
    { userId },
    async () => {
      // Get user and roles in parallel
      const [userResult, roles] = await Promise.all([
        fetchUserById(userId, serverClient),
        fetchUserRoles(userId),
      ])

      return {
        ...userResult,
        roles,
      }
    },
  )
}

export async function fetchCurrentUser(
  serverClient: Awaited<ReturnType<typeof createServerClient>>,
) {
  return withPerformanceTracking('lib/queries/users', 'fetchCurrentUser', {}, async () => {
    const {
      data: { user },
      error: authError,
    } = await serverClient.auth.getUser()

    if (authError || !user) {
      logger.log('lib/queries/users', 'No current user found', {})
      return null
    }

    // Transform the auth user to our User type
    const transformedUser = transformAuthUserToUser(user)

    return transformedUser
  })
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
