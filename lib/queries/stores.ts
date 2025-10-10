// lib/queries/stores.ts
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import { withSupabaseRetry } from '@/lib/utils/retry'
import { fetchUserPreferencesRPC, updateUserPrimaryStoreRPC } from './stores-rpc'

// Use optimized RPC functions by default
// Performance: fetchUserPreferences 595ms → ~20ms (97% improvement)
const USE_RPC_PREFERENCES = true

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

export type Store = Database['business']['Tables']['stores']['Row']
export type UserStore = {
  store: Store
  role: string
  permissions: StorePermissions
}

export type UserPreferences = Database['user_mgmt']['Tables']['user_preferences']['Row']

export type StorePermissions = {
  can_upload_inventory?: boolean
  can_apply_discounts?: boolean
  can_view_analytics?: boolean
  [key: string]: boolean | undefined // for future extensibility
}

// Fetch all stores user has access to
export async function fetchUserStores(
  userId: string,
  serverClient?: ServerClient,
): Promise<UserStore[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchUserStores'

  return withPerformanceTracking(context, 'Fetch user stores', { userId }, async () => {
    try {
      return await withSupabaseRetry(async () => {
        const { data, error } = await supabase
          .schema('business')
          .from('store_users')
          .select(
            `
        role_in_store,
        permissions,
        stores:store_id (
          store_id,
          store_name,
          store_code,
          business_name,
          address,
          city,
          postal_code,
          country,
          timezone,
          store_type,
          size_category,
          default_markup_percent,
          waste_reduction_target_percent,
          owner_id,
          is_active,
          onboarding_completed,
          created_at,
          updated_at
        )
      `,
          )
          .eq('user_id', userId)
          .eq('stores.is_active', true)

        if (error) {
          logger.queryWarn(context, 'Supabase error', {
            userId,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Failed to fetch user stores: ${error.message}`)
        }

        const userStores = data
          .filter(item => item.stores !== null) // Filter out null stores (deactivated)
          .map(item => {
            return {
              store: item.stores as unknown as Store,
              role: item.role_in_store as string,
              permissions: item.permissions,
            }
          })

        logger.log(context, 'User stores fetched successfully', {
          userId,
          storeCount: userStores.length,
        })

        return userStores
      }, context)
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', { userId, error: err })
      throw err
    }
  })
}

// Alternative query method - direct join to test
export async function fetchUserStoresAlternative(
  userId: string,
  serverClient?: ServerClient,
): Promise<UserStore[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchUserStoresAlternative'

  return withPerformanceTracking(
    context,
    'Fetch user stores (alternative)',
    { userId },
    async () => {
      try {
        // Direct query with manual join
        const { data, error } = await supabase
          .schema('business')
          .from('stores')
          .select(
            `
        *,
        store_users!inner(
          role_in_store,
          permissions,
          user_id
        )
      `,
          )
          .eq('store_users.user_id', userId)
          .eq('stores.is_active', true)

        if (error) {
          logger.queryWarn(context, 'Supabase error', {
            userId,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Failed to fetch user stores: ${error.message}`)
        }

        const userStores = data.map(storeData => ({
          store: {
            store_id: storeData.store_id,
            store_name: storeData.store_name,
            store_code: storeData.store_code,
            business_name: storeData.business_name,
            address: storeData.address,
            city: storeData.city,
            postal_code: storeData.postal_code,
            country: storeData.country,
            timezone: storeData.timezone,
            store_type: storeData.store_type,
            size_category: storeData.size_category,
            default_markup_percent: storeData.default_markup_percent,
            waste_reduction_target_percent: storeData.waste_reduction_target_percent,
            owner_id: storeData.owner_id,
            is_active: storeData.is_active,
            onboarding_completed: storeData.onboarding_completed,
            created_at: storeData.created_at,
            updated_at: storeData.updated_at,
          } as Store,
          role: storeData.store_users[0]?.role_in_store as string,
          permissions: storeData.store_users[0]?.permissions,
        }))

        logger.log(context, 'User stores fetched successfully', {
          userId,
          storeCount: userStores.length,
        })

        return userStores
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', { userId, error: err })
        throw err
      }
    },
  )
}

// Fetch store by ID
export async function fetchStoreById(storeId: string, serverClient?: ServerClient): Promise<Store> {
  const supabase = serverClient || createClient()
  const context = 'fetchStoreById'

  return withPerformanceTracking(context, 'Fetch store by ID', { storeId }, async () => {
    try {
      const { data, error } = await supabase
        .schema('business')
        .from('stores')
        .select('*')
        .eq('store_id', storeId)
        .single()

      if (error) {
        logger.queryWarn(context, 'Supabase error', {
          storeId,
          error: error.message,
          code: error.code,
        })
        throw new Error(`Failed to fetch store: ${error.message}`)
      }

      logger.log(context, 'Store fetched successfully', { storeId })

      return data as Store
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', { storeId, error: err })
      throw err
    }
  })
}

// Fetch user preferences including primary store
export async function fetchUserPreferences(
  serverClient?: ServerClient,
): Promise<UserPreferences | null> {
  // Use optimized RPC version if feature flag is enabled
  if (USE_RPC_PREFERENCES) {
    return fetchUserPreferencesRPC(serverClient)
  }

  // Original implementation (fallback)
  const supabase = serverClient || createClient()
  const context = 'fetchUserPreferences'

  return withPerformanceTracking(context, 'Fetch user preferences', {}, async () => {
    try {
      // Direct query - RLS will filter to current user
      const { data, error } = await supabase
        .schema('user_mgmt')
        .from('user_preferences')
        .select('*')
        .maybeSingle()

      if (error) {
        logger.queryWarn(context, 'Supabase error', {
          error: error.message,
          code: error.code,
        })
        // Handle specific error types
        if (error.code === 'PGRST116') {
          logger.query(context, 'No user preferences found')
          return null // No row found - this is OK
        }
        throw error
      }

      logger.log(context, 'User preferences fetched successfully', {
        hasPreferences: !!data,
      })

      return data
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', { error: err })
      // Return null instead of throwing for 406 errors
      if (err instanceof Error && err.message.includes('406')) {
        logger.queryWarn(context, 'Authentication issue, returning null preferences')
        return null
      }
      throw err
    }
  })
}

// Update user's primary store
export async function updateUserPrimaryStore(userId: string, storeId: string): Promise<void> {
  // Use optimized RPC version if feature flag is enabled
  // Note: RPC version doesn't need userId parameter (uses auth.uid() internally)
  if (USE_RPC_PREFERENCES) {
    return updateUserPrimaryStoreRPC(storeId)
  }

  // Original implementation (fallback)
  const supabase = createClient()
  const context = 'updateUserPrimaryStore'

  return withPerformanceTracking(
    context,
    'Update user primary store',
    { userId, storeId },
    async () => {
      try {
        const { error } = await supabase.schema('user_mgmt').from('user_preferences').upsert({
          user_id: userId,
          primary_store_id: storeId,
          updated_at: new Date().toISOString(),
        })

        if (error) {
          logger.queryWarn(context, 'Supabase error', {
            userId,
            storeId,
            error: error.message,
            code: error.code,
          })
          throw new Error(`Failed to update primary store: ${error.message}`)
        }

        logger.query(context, 'Primary store updated successfully', { userId, storeId })
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', { userId, storeId, error: err })
        throw err
      }
    },
  )
}

// Smart store selection logic
export function selectDefaultStore(
  userStores: UserStore[],
  primaryStoreId: string | null,
  lastActiveStoreId: string | null,
): Store | null {
  if (!userStores || userStores.length === 0) {
    return null
  }

  // Filter out any stores that might be null (defensive)
  const validUserStores = userStores.filter(us => us.store !== null)

  if (validUserStores.length === 0) {
    return null
  }

  // 1. Try to use last active store if it's still accessible
  if (lastActiveStoreId) {
    const lastActiveStore = validUserStores.find(us => us.store.store_id === lastActiveStoreId)
    if (lastActiveStore) {
      return lastActiveStore.store
    }
  }

  // 2. Try to use primary store from database if set
  if (primaryStoreId) {
    const primaryStore = validUserStores.find(us => us.store.store_id === primaryStoreId)
    if (primaryStore) {
      return primaryStore.store
    }
  }

  // 3. Fallback to intelligent defaults
  // First, try to find a store where user is owner
  const ownedStore = validUserStores.find(us => us.role === 'owner')
  if (ownedStore) {
    return ownedStore.store
  }

  // Then try manager role
  const managedStore = validUserStores.find(us => us.role === 'manager')
  if (managedStore) {
    return managedStore.store
  }

  // Finally, just use the first store
  return validUserStores[0].store
}
