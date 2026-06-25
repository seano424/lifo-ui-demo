# Demo Mode Implementation Plan

## Goal

Build a public `/demo` route on the existing Next.js 15 app (LIFO.AI) that:
- Requires **no login** — anyone visiting the URL can see it
- Shows a **realistic mock dashboard** with fake but convincing data
- Works on **Vercel** with no real Supabase backend
- Will live in a **new GitHub repo** under the personal account `seano424`

---

## Architecture Context (already researched — do NOT re-explore)

### Auth / Middleware
- **`proxy.ts`** (project root) is the Next.js middleware. It calls `updateSession` from `lib/supabase/proxy.ts`.
- `isPublicRoute()` in `lib/supabase/proxy.ts` is the allowlist of unauthenticated routes.
- `/demo` is **not** in that list yet — adding it is step 1.

### Data layer
- **23 query files** in `lib/queries/`. Key ones for the dashboard:
  - `lib/queries/dashboard.ts` — `fetchDashboardRedesignSummary()` (KPI cards + coverage bar) and `fetchTopExpiringBatches()` (already returns static mock data — no change needed)
  - `lib/queries/batches-rpc.ts` — `fetchBatchesPageRPC()` (powers the main batches list)
  - `lib/queries/stores.ts` — `fetchUserStores()`
  - `lib/queries/users.ts` — `fetchCurrentUser()`
  - `lib/queries/batch-tracking-onboarding.ts` — `useBatchTrackingSetup()`, `useCategoriesWithTrackingSettings()` (powers the AutomationCard)

### Dashboard components that need data
| Component | Hook | Query key pattern |
|-----------|------|-------------------|
| `StatCards` | `useDashboardRedesignSummary(daysFilter)` | `dashboard.redesignSummary(storeId, daysFilter)` |
| `CoverageBar` | `useDashboardRedesignSummary(7)` | same |
| `BatchesFilteredList` | `useBatches(filters, pageSize)` → `fetchBatchesPageRPC` | `batches.byStore(storeId).infinite.{ filters }` |
| `AutomationCard` | `useAutomationRules()` → `useCategoriesWithTrackingSettings` | `batchTrackingOnboarding.categories(storeId)` |
| `AutoTrackingBanner` | `useBatchTrackingSetup(storeId)` | `batchTrackingOnboarding.config(storeId)` |
| `AppSidebar` / `TeamSwitcher` | `useUserStores()` | `stores.userStores(userId)` |
| `UserButton` | `useCurrentUser()` | `auth.currentUser()` |

### React Query key structures (exact)
```ts
queryKeys.auth.currentUser()                          // ['currentUser']
queryKeys.stores.userStores(userId)                   // ['stores', 'userStores', userId]
queryKeys.userPreferences.detail(userId)              // ['userPreferences', userId]
queryKeys.dashboard.redesignSummary(storeId, days)   // ['dashboard', ..., storeId, days]
queryKeys.dashboard.expiringBatches(storeId, limit)  // ['dashboard', ..., storeId, limit]
queryKeys.batches.infinite(storeId, filters)         // ['batches', 'byStore', storeId, 'infinite', { filters }]
queryKeys.batchTrackingOnboarding.config(storeId)    // ['batch-tracking-onboarding', 'config', storeId]
queryKeys.batchTrackingOnboarding.categories(storeId) // ['batch-tracking-onboarding', 'categories', storeId]
```

### The staleTime / refetch problem
- `useDashboardRedesignSummary` has `refetchInterval: 30000` — will always refetch every 30s regardless of cache
- `useCurrentUser` has `staleTime: 30 * 1000` — goes stale fast
- **Solution A (refetchInterval)**: Modify the fetch functions (`fetchDashboardRedesignSummary`, `fetchBatchesPageRPC`) to return mock data when `NEXT_PUBLIC_DEMO_MODE === 'true'`
- **Solution B (staleTime)**: Pre-seed the QueryClient with `{ updatedAt: Date.now() + 86400000 }` — React Query treats data as fresh for 24h regardless of per-hook staleTime. Works for everything EXCEPT refetchInterval hooks.

Both solutions are needed together.

### Types reference
```ts
// lib/types/user.ts
type User = { id, email, full_name, avatar_url, username, language_preference, ... }

// lib/queries/stores.ts
type Store = Database['business']['Tables']['stores']['Row']  // use `as unknown as Store` for mocks
type UserStore = { store: Store, role: string, permissions: StorePermissions }
type UserPreferences = Database['user_mgmt']['Tables']['user_preferences']['Row']

// lib/queries/batches.ts
type BatchWithProduct = Batch & { products?: { name, barcode, category_code, ... } }

// lib/queries/dashboard.ts
interface DashboardRedesignSummary { expiring_count, expiring_units, expiring_count_prev, act_on_today_count, products_tracked, products_total, coverage_percent_prev, value_at_risk, value_at_risk_prev }

// types/rpc-returns.ts
interface BatchTrackingSetupResponse { config: BatchTrackingConfig, category_settings, product_override_count, tracked_product_count, automated_product_count }
interface CategoryWithTrackingSettings { category_id, category_code, display_name_en, display_name_fr, typical_shelf_life_days, is_tracked, auto_create_batches, default_shelf_life_days, product_count }
```

### Zustand store (activeStore)
- `lib/stores/store-context.ts` — `useStoreState` Zustand store
- `useActiveStoreId()` reads from Zustand, NOT React Query
- Zustand gets populated by the `useUserStores` hook's `useEffect` (in `hooks/use-stores.ts`)
- **For demo**: Need a `DemoInitializer` client component that calls `setActiveStore(mockStore)` and `setUserStores(mockUserStores)` directly on mount

---

## Implementation Plan (ordered)

### Step 1 — Add `/demo` to public routes
**File**: `lib/supabase/proxy.ts`
Add `pathname.startsWith('/demo')` to the `isPublicRoute()` function return.

### Step 2 — Create mock data file
**File**: `lib/mocks/demo-data.ts` *(new)*

Constants to define:
```ts
export const DEMO_USER_ID = 'demo-user-001'
export const DEMO_STORE_ID = 'demo-store-001'
export const mockUser: User = { id: DEMO_USER_ID, email: 'demo@lifo.ai', full_name: 'Alex Rivera', username: 'alexrivera', avatar_url: '', language_preference: 'en', is_active: true, ... }
export const mockStore = { store_id: DEMO_STORE_ID, store_name: 'Green Basket Market', business_name: 'Green Basket Market LLC', address: '123 Organic Ave', city: 'San Francisco', country: 'US', store_type: 'grocery', ... } as unknown as Store
export const mockUserStores: UserStore[] = [{ store: mockStore, role: 'owner', permissions: { can_upload_inventory: true, can_apply_discounts: true, can_view_analytics: true } }]
export const mockUserPreferences = { user_id: DEMO_USER_ID, primary_store_id: DEMO_STORE_ID } as unknown as UserPreferences
export function getMockDashboardSummary(daysFilter: 7 | 30 | 90): DashboardRedesignSummary { ... }
export const mockBatches: BatchWithProduct[]  // 8-10 realistic items, use `as unknown as BatchWithProduct`
export const mockCategories: CategoryWithTrackingSettings[]  // 3 categories: Dairy, Bakery, Produce
export const mockBatchTrackingSetup: BatchTrackingSetupResponse
```

Good mock data set:
- **Dashboard (30d)**: 38 expiring, 284 units, 4 act-today, 142/210 covered (68%), $1,840 at risk
- **Batches**: mix of urgency (2 days → 28 days): Organic Milk, Greek Yogurt, Wheat Bread, Baby Spinach, Brie Cheese, OJ, Mixed Berries, Chicken Breast, Craft Beer 6pk, Organic Eggs
- **Categories**: Dairy & Eggs (23 products, 14d shelf life, auto=true), Bakery (18 products, 5d, auto=true), Produce (31 products, 7d, auto=true)

### Step 3 — Create demo QueryClient factory
**File**: `lib/mocks/demo-prefetch.ts` *(new)*

```ts
import { dehydrate, QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/query-keys'
import { DEMO_USER_ID, DEMO_STORE_ID, mockUser, mockUserStores, mockUserPreferences, getMockDashboardSummary, mockCategories, mockBatchTrackingSetup } from './demo-data'

const FRESH = { updatedAt: Date.now() + 86_400_000 }  // treats data as fresh for 24h

export function createDemoPrefetch() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })

  qc.setQueryData(queryKeys.auth.currentUser(), mockUser, FRESH)
  qc.setQueryData(queryKeys.stores.userStores(DEMO_USER_ID), mockUserStores, FRESH)
  qc.setQueryData(queryKeys.userPreferences.detail(DEMO_USER_ID), mockUserPreferences, FRESH)
  qc.setQueryData(['activeStore'], mockUserStores[0].store, FRESH)

  // Pre-seed dashboard summary for all 3 time ranges
  for (const d of [7, 30, 90] as const) {
    qc.setQueryData(queryKeys.dashboard.redesignSummary(DEMO_STORE_ID, d), getMockDashboardSummary(d), FRESH)
  }

  // Pre-seed batch tracking (AutoTrackingBanner + AutomationCard)
  qc.setQueryData(queryKeys.batchTrackingOnboarding.config(DEMO_STORE_ID), mockBatchTrackingSetup, FRESH)
  qc.setQueryData(queryKeys.batchTrackingOnboarding.categories(DEMO_STORE_ID), mockCategories, FRESH)

  // Pre-seed batches infinite query (default dashboard filter)
  const defaultFilters = { filter: 'expiring', expiringDays: '90', status: 'active' }
  qc.setQueryData(
    queryKeys.batches.infinite(DEMO_STORE_ID, defaultFilters),
    { pages: [{ data: mockBatches, count: mockBatches.length, nextPage: undefined }], pageParams: [0] },
    FRESH
  )

  return { queryClient: qc, dehydratedState: dehydrate(qc) }
}
```

### Step 4 — Modify `fetchDashboardRedesignSummary`
**File**: `lib/queries/dashboard.ts`

At the top of `fetchDashboardRedesignSummary`, before any Supabase calls:
```ts
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  const { getMockDashboardSummary } = await import('@/lib/mocks/demo-data')
  return getMockDashboardSummary(daysFilter)
}
```

### Step 5 — Modify `fetchBatchesPageRPC`
**File**: `lib/queries/batches-rpc.ts`

At the top of `fetchBatchesPageRPC`, before any Supabase calls:
```ts
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  const { mockBatches } = await import('@/lib/mocks/demo-data')
  return { data: mockBatches, count: mockBatches.length, nextPage: undefined }
}
```

### Step 6 — Create DemoInitializer component
**File**: `components/demo/demo-initializer.tsx` *(new)*

```tsx
'use client'
import { useEffect } from 'react'
import { useStoreState } from '@/lib/stores/store-context'
import { mockStore, mockUserStores } from '@/lib/mocks/demo-data'

export function DemoInitializer() {
  const { setActiveStore, setUserStores, setLoadingStores } = useStoreState()

  useEffect(() => {
    setUserStores(mockUserStores)
    setActiveStore(mockStore)
    setLoadingStores(false)
  }, [setActiveStore, setUserStores, setLoadingStores])

  return null
}
```

### Step 7 — Create demo layout
**File**: `app/(demo)/layout.tsx` *(new)*

```tsx
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardNav } from '@/components/dashboard/dashboard-nav'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { HydrationBoundary } from '@tanstack/react-query'
import { createDemoPrefetch } from '@/lib/mocks/demo-prefetch'
import { DemoInitializer } from '@/components/demo/demo-initializer'

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  const { dehydratedState } = createDemoPrefetch()

  return (
    <HydrationBoundary state={dehydratedState}>
      <DemoInitializer />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-w-0">
          <DashboardNav />
          <div className="flex-1 overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrationBoundary>
  )
}
```

> Note: `createDemoPrefetch()` runs server-side here (Server Component). The `FRESH` updatedAt trick is fine on the server — the dehydrated state carries the timestamp to the client.

### Step 8 — Create demo page
**File**: `app/(demo)/demo/page.tsx` *(new)*

```tsx
import { DashboardContent } from '@/components/dashboard/dashboard-content'

export default function DemoPage() {
  return (
    <div className="container py-6 lg:py-8">
      <DashboardContent />
    </div>
  )
}
```

### Step 9 — Environment variable
**File**: `.env.example`
Add: `NEXT_PUBLIC_DEMO_MODE=false`

**For Vercel**: Set `NEXT_PUBLIC_DEMO_MODE=true` in the Vercel project environment variables.

**For local testing**: Add `NEXT_PUBLIC_DEMO_MODE=true` to `.env.local`.

---

## GitHub Repo Setup (separate task — do after demo mode works)

Goal: Create a new repo `seano424/lifo-app` and push this codebase to it.

```bash
# 1. Create the repo on GitHub (public)
gh repo create seano424/lifo-app --public --description "LIFO.AI — AI-powered food waste management platform (demo)"

# 2. Add the new remote
git remote add personal https://github.com/seano424/lifo-app.git

# 3. Push main branch
git push personal main
```

Then configure Vercel to deploy from `seano424/lifo-app`.

---

## Known Gotchas

1. **`createDemoPrefetch()` is called in a Server Component** — it's synchronous and doesn't need `await`. The `QueryClient` and `dehydrate` from `@tanstack/react-query` work fine server-side.

2. **Zustand `setActiveStore` writes to localStorage** — that's fine, no side effects for demo.

3. **`setActiveStoreCookie` server action** — called inside `useUserStores`'s `useEffect`. In demo mode, this is a no-op server action call. It won't crash — the cookie just won't be set. Since the demo layout doesn't read the active store cookie, this is harmless.

4. **`BillingBanner` and `DeletionWarningBanner`** — these are in the real dashboard layout (`app/(dashboard)/layout.tsx`) but intentionally excluded from the demo layout. Add them back if they show meaningful demo content.

5. **`QueryErrorBoundary`** — wrap the demo layout content in it as a safety net in case any mocked query is missing.

6. **TypeScript**: Use `as unknown as Store` / `as unknown as UserPreferences` / `as unknown as BatchWithProduct` for the mock objects. This is intentional — the auto-generated Supabase types have 50+ fields.

7. **`NEXT_PUBLIC_DEMO_MODE`** is a build-time env var (baked in at build). On Vercel, set it per-environment (Production = `true`, Preview = `true`, Development = `false`).

8. **The `updatedAt` future-date trick**: React Query v5's `setQueryData` accepts `{ updatedAt: number }` as a third argument. Setting it to `Date.now() + 86_400_000` makes data appear fresh for 24h, bypassing per-hook `staleTime`. Does NOT bypass `refetchInterval` — that's why Step 4 and 5 are still needed.

---

## File Checklist

| # | File | Action |
|---|------|--------|
| 1 | `lib/supabase/proxy.ts` | Add `/demo` to `isPublicRoute()` |
| 2 | `lib/mocks/demo-data.ts` | **Create** — all mock data |
| 3 | `lib/mocks/demo-prefetch.ts` | **Create** — demo QueryClient factory |
| 4 | `lib/queries/dashboard.ts` | Add demo-mode early return to `fetchDashboardRedesignSummary` |
| 5 | `lib/queries/batches-rpc.ts` | Add demo-mode early return to `fetchBatchesPageRPC` |
| 6 | `components/demo/demo-initializer.tsx` | **Create** — Zustand initializer |
| 7 | `app/(demo)/layout.tsx` | **Create** — demo layout |
| 8 | `app/(demo)/demo/page.tsx` | **Create** — demo page |
| 9 | `.env.example` | Add `NEXT_PUBLIC_DEMO_MODE=false` |
