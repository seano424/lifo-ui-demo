import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'
import { withPerformanceTracking } from '@/lib/utils/performance'

type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Ultra-fast query to get count of urgent todos from materialized view
 * Replaces the slow 1000ms dashboard summary query for sidebar badge
 *
 * Performance: ~3-10ms (vs 1000ms for full dashboard summary)
 */
export async function fetchUrgentTodosCount(
  storeId: string,
  serverClient?: ServerClient,
): Promise<number> {
  const supabase = serverClient || createClient()
  const context = 'fetchUrgentTodosCount'

  return withPerformanceTracking(
    context,
    'Fetch urgent todos count (RPC)',
    { storeId },
    async () => {
      try {
        const { data, error } = await supabase.schema('inventory').rpc('get_urgent_todos_count', {
          p_store_id: storeId,
        })

        if (error) {
          logger.error(context, 'RPC error', {
            error: error.message,
            code: error.code,
            storeId,
          })
          throw new Error(`Failed to fetch urgent todos count: ${error.message}`)
        }

        const count = data ?? 0

        logger.log(context, 'Urgent todos count fetched successfully (RPC)', {
          storeId,
          urgentCount: count,
        })

        return count
      } catch (err) {
        logger.error(context, 'Unexpected error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw err
      }
    },
  )
}
