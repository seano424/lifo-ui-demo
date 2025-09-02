// lib/queries/stores.ts
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

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

  try {
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
      console.error('[fetchUserStores] Supabase error:', error)
      throw new Error(`Failed to fetch user stores: ${error.message}`)
    }

    const userStores = data.map(item => {
      return {
        store: item.stores as unknown as Store,
        role: item.role_in_store as string,
        permissions: item.permissions,
      }
    })

    return userStores
  } catch (err) {
    console.error('[fetchUserStores] Unexpected error:', err)
    throw err
  }
}

// Alternative query method - direct join to test
export async function fetchUserStoresAlternative(
  userId: string,
  serverClient?: ServerClient,
): Promise<UserStore[]> {
  const supabase = serverClient || createClient()

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
      console.error('[fetchUserStoresAlternative] Supabase error:', error)
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

    return userStores
  } catch (err) {
    console.error('[fetchUserStoresAlternative] Unexpected error:', err)
    throw err
  }
}

// Fetch store by ID
export async function fetchStoreById(storeId: string, serverClient?: ServerClient): Promise<Store> {
  const supabase = serverClient || createClient()

  try {
    const { data, error } = await supabase
      .schema('business')
      .from('stores')
      .select('*')
      .eq('store_id', storeId)
      .single()

    if (error) {
      console.error('[fetchStoreById] Supabase error:', error)
      throw new Error(`Failed to fetch store: ${error.message}`)
    }

    return data as Store
  } catch (err) {
    console.error('[fetchStoreById] Unexpected error:', err)
    throw err
  }
}

// Fetch user preferences including primary store
export async function fetchUserPreferences(
  serverClient?: ServerClient,
): Promise<UserPreferences | null> {
  const supabase = serverClient || createClient()

  try {
    // Don't filter by user_id - let RLS handle it automatically
    const { data, error } = await supabase
      .schema('user_mgmt')
      .from('user_preferences')
      .select('*')
      .maybeSingle() // Use maybeSingle() instead of single()

    if (error) {
      console.error('[fetchUserPreferences] Supabase error:', error)
      // Handle specific error types
      if (error.code === 'PGRST116') {
        return null // No row found - this is OK
      }
      throw error
    }

    return data
  } catch (err) {
    console.error('[fetchUserPreferences] Unexpected error:', err)
    // Return null instead of throwing for 406 errors
    if (err instanceof Error && err.message.includes('406')) {
      console.warn('Authentication issue, returning null preferences')
      return null
    }
    throw err
  }
}

// Update user's primary store
export async function updateUserPrimaryStore(userId: string, storeId: string): Promise<void> {
  const supabase = createClient()

  try {
    const { error } = await supabase.schema('user_mgmt').from('user_preferences').upsert({
      user_id: userId,
      primary_store_id: storeId,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      console.error('[updateUserPrimaryStore] Supabase error:', error)
      throw new Error(`Failed to update primary store: ${error.message}`)
    }

  } catch (err) {
    console.error('[updateUserPrimaryStore] Unexpected error:', err)
    throw err
  }
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

  // 1. Try to use last active store if it's still accessible
  if (lastActiveStoreId) {
    const lastActiveStore = userStores.find(us => us.store.store_id === lastActiveStoreId)
    if (lastActiveStore) {
      return lastActiveStore.store
    }
  }

  // 2. Try to use primary store from database if set
  if (primaryStoreId) {
    const primaryStore = userStores.find(us => us.store.store_id === primaryStoreId)
    if (primaryStore) {
      return primaryStore.store
    }
  }

  // 3. Fallback to intelligent defaults
  // First, try to find a store where user is owner
  const ownedStore = userStores.find(us => us.role === 'owner')
  if (ownedStore) {
    return ownedStore.store
  }

  // Then try manager role
  const managedStore = userStores.find(us => us.role === 'manager')
  if (managedStore) {
    return managedStore.store
  }

  // Finally, just use the first store
  return userStores[0].store
}
