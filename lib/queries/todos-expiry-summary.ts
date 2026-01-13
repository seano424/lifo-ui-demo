import { createClient } from '@/lib/supabase/client'
import type { createClient as createServerClient } from '@/lib/supabase/server'

// Type for the server client (it's a Promise!)
type ServerClient = Awaited<ReturnType<typeof createServerClient>>

/**
 * Expiry summary counts type - matches the RPC function return
 */
export type ExpiryTodosSummary = {
  expiring_today: number // 0-1 days to expiry
  expiring_soon: number // 2-3 days to expiry
  expiring_week: number // 4-7 days to expiry
  expired: number // past expiry date (negative days)
  total: number // all items needing attention
}

/**
 * Fetch todos counts grouped by expiry ranges
 * Uses inventory.get_expiry_todos_counts_summary RPC function
 */
export async function fetchExpiryTodosSummary(
  storeId: string,
  serverClient?: ServerClient,
): Promise<ExpiryTodosSummary> {
  const supabase = serverClient || createClient()

  const { data, error } = await supabase
    .schema('inventory')
    .rpc('get_expiry_todos_counts_summary', {
      p_store_id: storeId,
    })

  if (error) {
    throw new Error(`Failed to fetch expiry todos summary: ${error.message}`)
  }

  return (
    data || {
      expiring_today: 0,
      expiring_soon: 0,
      expiring_week: 0,
      expired: 0,
      total: 0,
    }
  )
}
