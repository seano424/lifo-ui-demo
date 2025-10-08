import { DashboardWelcome } from '@/components/dashboard/dashboard-welcome'
import { DashboardContent } from '@/components/dashboard/dashboard-content'
import { createClient } from '@/lib/supabase/server'
import { hasBatchesRPC } from '@/lib/queries/batches-rpc'
import { getActiveStoreCookie } from '@/lib/actions/store-actions'

export default async function DashboardPage() {
  const activeStoreId = await getActiveStoreCookie()
  const supabase = await createClient()

  // Show welcome screen if no active store or no batches exist
  const hasBatches = activeStoreId ? await hasBatchesRPC(activeStoreId, supabase) : false

  if (!activeStoreId || !hasBatches) {
    return <DashboardWelcome />
  }

  return <DashboardContent />
}
