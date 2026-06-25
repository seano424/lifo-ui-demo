import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Ultra-fast query to get count of expiring todos based on store's expiry_alert_days setting
 * Uses the store's configured expiry alert days from business.store_settings
 *
 * Performance: ~3-10ms (similar to urgent count query)
 */
export async function fetchExpiryTodosCount(
  storeId: string,
  serverClient?: ServerClient,
): Promise<number> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    return 4
  }

  const supabase = serverClient || createClient()
  const context = 'fetchExpiryTodosCount'

  return withPerformanceTracking(
    context,
    'Fetch expiry todos count (RPC)',
    { storeId },
    async () => {
      try {
        const { data, error } = await supabase.schema('inventory').rpc('get_expiry_todos_count', {
          p_store_id: storeId,
        })

        if (error) {
          logger.queryWarn(context, 'RPC error', {
            error: error.message,
            code: error.code,
            storeId,
          })
          throw new Error(`Failed to fetch expiry todos count: ${error.message}`)
        }

        const count = data ?? 0

        logger.log(context, 'Expiry todos count fetched successfully (RPC)', {
          storeId,
          expiryCount: count,
        })

        return count
      } catch (err) {
        logger.queryWarn(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}
