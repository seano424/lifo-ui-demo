import { dehydrate, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import type { BatchFilters } from '@/lib/queries/batches'
import {
  DEMO_USER_ID,
  DEMO_STORE_ID,
  mockUser,
  mockUserStores,
  mockUserPreferences,
  getMockDashboardSummary,
  mockCategories,
  mockBatchTrackingSetup,
  mockBatches,
} from './demo-data'

// Sets updatedAt to 24h in the future so React Query treats this data as fresh
// regardless of per-hook staleTime. Does NOT bypass refetchInterval — that's
// handled by the NEXT_PUBLIC_DEMO_MODE early returns in the fetch functions.
const FRESH = { updatedAt: Date.now() + 86_400_000 }

export function createDemoPrefetch() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  qc.setQueryData(queryKeys.auth.currentUser(), mockUser, FRESH)
  qc.setQueryData(queryKeys.stores.userStores(DEMO_USER_ID), mockUserStores, FRESH)
  qc.setQueryData(queryKeys.userPreferences.detail(DEMO_USER_ID), mockUserPreferences, FRESH)
  qc.setQueryData(queryKeys.todos.expiryCount(DEMO_STORE_ID), 4, FRESH)
  qc.setQueryData(
    queryKeys.stores.detail(DEMO_STORE_ID),
    {
      store_id: DEMO_STORE_ID,
      store_name: 'Green Basket Market',
      business_name: 'Green Basket Market LLC',
      store_code: 'GREEN-001',
      store_type: 'organic',
      address: '123 Organic Ave',
      city: 'San Francisco',
      country: 'US',
      timezone: 'America/Los_Angeles',
      is_active: true,
      onboarding_completed: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      settings: { store_id: DEMO_STORE_ID, currency: 'USD' },
    },
    FRESH,
  )

  for (const d of [7, 30, 90] as const) {
    qc.setQueryData(
      queryKeys.dashboard.redesignSummary(DEMO_STORE_ID, d),
      getMockDashboardSummary(d),
      FRESH,
    )
  }

  qc.setQueryData(
    queryKeys.batchTrackingOnboarding.config(DEMO_STORE_ID),
    mockBatchTrackingSetup,
    FRESH,
  )
  qc.setQueryData(
    queryKeys.batchTrackingOnboarding.categories(DEMO_STORE_ID),
    mockCategories,
    FRESH,
  )

  const defaultFilters: BatchFilters = { expiringInDays: 180, status: 'active' }
  qc.setQueryData(
    queryKeys.batches.infinite(DEMO_STORE_ID, defaultFilters),
    {
      pages: [{ data: mockBatches, count: mockBatches.length, nextPage: undefined }],
      pageParams: [0],
    },
    FRESH,
  )

  return { queryClient: qc, dehydratedState: dehydrate(qc) }
}
