// lib/queries/store-overview-rpc.ts
import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'
import type { StorePermissions } from './stores'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Raw RPC response from get_user_store_overviews.
 * Permissions field needs type casting before use.
 */
type StoreOverviewRpcRow = Omit<StoreOverview, 'permissions'> & {
  permissions: unknown
}

/**
 * A store overview row returned by get_user_store_overviews RPC.
 * Includes store details, the user's role, and aggregated counts.
 */
export type StoreOverview = {
  store_id: string
  store_name: string
  store_code: string
  business_name: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  country: string | null
  timezone: string | null
  store_type: string | null
  is_active: boolean
  onboarding_completed: boolean
  owner_id: string
  created_at: string
  updated_at: string
  role_in_store: string
  permissions: StorePermissions
  product_count: number
  category_count: number
  is_square_store: boolean
}

/**
 * Fetches all active stores for the current user with product counts,
 * category counts, and Square connection status.
 *
 * Uses a single RPC call that joins across business, inventory, and
 * integrations schemas — replacing 3 parallel client-side queries.
 *
 * @returns StoreOverview[] sorted by product_count DESC, store_name ASC
 */
export async function fetchStoreOverviews(serverClient?: ServerClient): Promise<StoreOverview[]> {
  const supabase = serverClient || createClient()
  const context = 'fetchStoreOverviews'

  return withPerformanceTracking(context, 'Fetch store overviews (RPC)', {}, async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_store_overviews')

      if (error) {
        logger.queryWarn(context, 'RPC error', {
          error: error.message,
          code: error.code,
        })

        if (error.message.includes('Not authenticated')) {
          logger.warn(context, 'User not authenticated, returning empty array')
          return []
        }

        throw error
      }

      const overviews = (data ?? []).map((row: StoreOverviewRpcRow) => ({
        ...row,
        permissions: (row.permissions as StorePermissions) || {},
      })) as StoreOverview[]

      logger.log(context, 'Store overviews fetched successfully', {
        storeCount: overviews.length,
      })

      return overviews
    } catch (err) {
      logger.queryWarn(context, 'Unexpected error', { error: err })
      throw err
    }
  })
}
