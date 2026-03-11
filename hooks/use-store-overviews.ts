// hooks/use-store-overviews.ts
import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { fetchStoreOverviews, type StoreOverview } from '@/lib/queries/store-overview-rpc'

/**
 * Hook to fetch all stores for the current user with product counts,
 * category counts, and Square connection status.
 *
 * This is useful for store switcher UIs, store overview pages, and
 * anywhere you need a high-level summary of the user's stores.
 *
 * Note: Does NOT depend on useCurrentUser — the RPC uses auth.uid()
 * internally, so it works as long as the user has an active session.
 */
export function useStoreOverviews() {
  return useQuery<StoreOverview[]>({
    queryKey: queryKeys.stores.overviews(),
    queryFn: () => fetchStoreOverviews(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    throwOnError: false, // Don't crash the page — callers handle empty/error state
  })
}

/**
 * Convenience: get just the Square-connected stores.
 */
export function useSquareStores() {
  const result = useStoreOverviews()
  return {
    ...result,
    data: result.data?.filter(s => s.is_square_store) ?? [],
  }
}
