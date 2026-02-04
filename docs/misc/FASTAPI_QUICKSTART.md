# FastAPI Frontend Integration - Quick Start Guide

**Get up and running in 5 minutes**

## What You're Building

Transform this monolithic client:
```typescript
// Old way (866 lines, 4 endpoints)
import { fastApiClient } from '@/lib/services/fastapi-client'
const alerts = await fastApiClient.getStoreAlerts(storeId, token, options)
```

Into this scalable architecture:
```typescript
// New way (domain-specific, 26+ endpoints, type-safe)
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'
const { data: alerts, isLoading } = useAlerts({ urgency: 'critical' })
```

---

## Step 1: Create Base Client (15 minutes)

### File: `lib/api/fastapi/core/base-client.ts`

```typescript
export class BaseFastAPIClient {
  protected baseUrl: string
  protected defaultTimeout: number = 10000

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
  }

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      return {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    }

    throw new Error('Not authenticated')
  }

  protected async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value))
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout)

    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }
  }

  protected async post<T>(path: string, body?: unknown): Promise<T> {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  }
}
```

**Test it:**
```bash
# Create a simple test
npm test lib/api/fastapi/core/base-client.test.ts
```

---

## Step 2: Create Your First Domain Client (10 minutes)

### File: `lib/api/fastapi/clients/scoring-client.ts`

```typescript
import { BaseFastAPIClient } from '../core/base-client'

// Types
export interface Alert {
  batch_id: string
  sku: string
  product_name: string
  days_to_expiry: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
}

export interface AlertsResponse {
  store_id: string
  alerts: Alert[]
  total_count: number
}

// Client
export class ScoringClient extends BaseFastAPIClient {
  async getAlerts(
    storeId: string,
    options?: {
      threshold?: number
      urgency?: string
      limit?: number
    }
  ): Promise<AlertsResponse> {
    return this.get<AlertsResponse>(
      `/api/v1/scoring/alerts/${storeId}`,
      options
    )
  }
}

// Singleton
export const scoringClient = new ScoringClient()
```

**Test it:**
```typescript
const alerts = await scoringClient.getAlerts('store-123', { limit: 10 })
console.log(alerts.total_count) // Works!
```

---

## Step 3: Add Query Keys (5 minutes)

### File: `lib/queries/query-keys.ts` (add to existing)

```typescript
export const queryKeys = {
  // ... existing keys ...

  // Add FastAPI keys
  scoring: {
    all: ['fastapi', 'scoring'] as const,
    alerts: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.scoring.all, 'alerts', storeId, filters] as const,
    analytics: (storeId: string, days: number) =>
      [...queryKeys.scoring.all, 'analytics', storeId, days] as const,
  },
}
```

---

## Step 4: Create React Query Hook (10 minutes)

### File: `lib/hooks/fastapi/use-scoring.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scoringClient } from '@/lib/api/fastapi/clients/scoring-client'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { toast } from 'sonner'

export function useAlerts(
  options?: {
    threshold?: number
    urgency?: string
    limit?: number
  },
  config?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.alerts(storeId || '', options),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getAlerts(storeId, options)
    },
    enabled: !!storeId && (config?.enabled ?? true),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: config?.refetchInterval || 60 * 1000, // 1 minute
  })
}

export function useScoringActions() {
  const queryClient = useQueryClient()
  const storeId = useActiveStoreId()

  const triggerScoring = useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error('No active store')
      return scoringClient.triggerScoring(storeId)
    },
    onSuccess: () => {
      toast.success('Scoring triggered successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.scoring.alerts(storeId || '', {}),
      })
    },
  })

  return {
    triggerScoring: triggerScoring.mutate,
    isTriggeringScoring: triggerScoring.isPending,
  }
}
```

---

## Step 5: Use in Component (5 minutes)

### File: `components/dashboard/alerts-section.tsx`

```typescript
'use client'

import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function AlertsSection() {
  const { data, isLoading, error } = useAlerts({
    urgency: 'critical',
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full mt-2" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load alerts</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts ({data?.total_count || 0})</CardTitle>
      </CardHeader>
      <CardContent>
        {data?.alerts.map(alert => (
          <div key={alert.batch_id} className="p-3 border rounded mb-2">
            <p className="font-medium">{alert.product_name}</p>
            <p className="text-sm text-muted-foreground">
              {alert.days_to_expiry} days • {alert.urgency_level}
            </p>
            <p className="text-sm">{alert.recommendation}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

**Use it:**
```typescript
// In your page or layout
import { AlertsSection } from '@/components/dashboard/alerts-section'

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <AlertsSection />
    </div>
  )
}
```

---

## Done! 🎉

You now have:
- ✅ Type-safe FastAPI client
- ✅ React Query hook
- ✅ Automatic caching
- ✅ Loading states
- ✅ Error handling

## Next Steps

### Add More Endpoints

```typescript
// In scoring-client.ts
async getAnalytics(storeId: string, days: number = 30) {
  return this.get<AnalyticsResponse>(
    `/api/v1/scoring/analytics/${storeId}`,
    { days }
  )
}

// Create hook
export function useAnalytics(days: number = 30) {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: queryKeys.scoring.analytics(storeId || '', days),
    queryFn: () => scoringClient.getAnalytics(storeId!, days),
    enabled: !!storeId,
  })
}
```

### Add Mutations

```typescript
// In scoring-client.ts
async triggerScoring(storeId: string) {
  return this.post<{ job_id: string }>(
    `/api/v1/scoring/trigger/${storeId}`
  )
}

// In hook
const mutation = useMutation({
  mutationFn: (storeId: string) => scoringClient.triggerScoring(storeId),
  onSuccess: () => {
    toast.success('Scoring triggered!')
    queryClient.invalidateQueries({ queryKey: queryKeys.scoring.all })
  },
})
```

### Add Other Domain Clients

Repeat steps 2-5 for:
- **Donation Client** (`donation-client.ts`)
- **Scanning Client** (`scanning-client.ts`)
- **Batch Client** (`batch-client.ts`)
- **CSV Client** (`csv-client.ts`)

---

## Common Patterns

### Pattern 1: Dependent Queries

```typescript
const { data: recipients } = useDonationRecipients()
const firstRecipientId = recipients?.[0]?.recipient_id

const { data: items } = useSuitableDonationItems(
  { recipient_id: firstRecipientId },
  { enabled: !!firstRecipientId } // Only fetch when recipient selected
)
```

### Pattern 2: Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['data'] })

    // Snapshot previous
    const previous = queryClient.getQueryData(['data'])

    // Optimistically update
    queryClient.setQueryData(['data'], newData)

    return { previous }
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['data'], context?.previous)
  },
})
```

### Pattern 3: Polling

```typescript
const { data } = useQuery({
  queryKey: ['job-status', jobId],
  queryFn: () => getJobStatus(jobId),
  refetchInterval: (data) => {
    // Stop polling when complete
    return data?.status === 'completed' ? false : 5000
  },
})
```

### Pattern 4: Prefetching

```typescript
const queryClient = useQueryClient()

// Prefetch on hover
<button
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.scoring.analytics(storeId, 30),
      queryFn: () => scoringClient.getAnalytics(storeId, 30),
    })
  }}
>
  View Analytics
</button>
```

---

## Troubleshooting

### Issue: "No active store selected"

**Fix:** Ensure user has selected a store:
```typescript
const storeId = useActiveStoreId()
if (!storeId) {
  return <div>Please select a store</div>
}
```

### Issue: Queries not refetching after mutation

**Fix:** Invalidate queries:
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: queryKeys.scoring.all, // Invalidate all scoring queries
  })
}
```

### Issue: SSR hydration errors with Zustand

**Fix:** Use SSR-safe pattern:
```typescript
const [isClient, setIsClient] = useState(false)

useEffect(() => {
  setIsClient(true)
}, [])

if (!isClient) {
  return <div>Loading...</div> // Server-side render placeholder
}

// Now safe to use Zustand
const data = useStore(state => state.data)
```

### Issue: Request timeouts

**Fix:** Increase timeout for slow endpoints:
```typescript
class MyClient extends BaseFastAPIClient {
  async slowOperation() {
    return this.get('/slow', {}, { timeout: 30000 }) // 30 seconds
  }
}
```

---

## Testing

### Unit Test Example

```typescript
import { scoringClient } from '@/lib/api/fastapi/clients/scoring-client'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('*/api/v1/scoring/alerts/:storeId', (req, res, ctx) => {
    return res(ctx.json({
      store_id: 'test-store',
      alerts: [],
      total_count: 0,
    }))
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('fetches alerts', async () => {
  const result = await scoringClient.getAlerts('test-store')
  expect(result.alerts).toEqual([])
  expect(result.total_count).toBe(0)
})
```

### Hook Test Example

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'

const createWrapper = () => {
  const queryClient = new QueryClient()
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

test('useAlerts fetches data', async () => {
  const { result } = renderHook(() => useAlerts(), {
    wrapper: createWrapper(),
  })

  expect(result.current.isLoading).toBe(true)

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true)
  })

  expect(result.current.data).toBeDefined()
})
```

---

## Performance Tips

1. **Use staleTime**: Avoid unnecessary refetches
   ```typescript
   staleTime: 5 * 60 * 1000, // 5 minutes
   ```

2. **Debounce search inputs**:
   ```typescript
   const debouncedSearch = useDebouncedValue(search, 300)
   const { data } = useAlerts({ search: debouncedSearch })
   ```

3. **Enable background refetching**:
   ```typescript
   refetchInterval: 60 * 1000, // Refresh every minute
   refetchIntervalInBackground: false, // Only when tab active
   ```

4. **Use pagination for large lists**:
   ```typescript
   useInfiniteQuery({
     queryKey: ['alerts'],
     queryFn: ({ pageParam = 0 }) => fetchPage(pageParam),
     getNextPageParam: (lastPage) => lastPage.nextPage,
   })
   ```

---

## Resources

- **Full Documentation:** `docs/FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md`
- **Architecture Diagrams:** `docs/FASTAPI_ARCHITECTURE_DIAGRAM.md`
- **Implementation Checklist:** `docs/FASTAPI_IMPLEMENTATION_CHECKLIST.md`
- **Quick Reference:** `docs/FASTAPI_INTEGRATION_SUMMARY.md`

- **React Query Docs:** https://tanstack.com/query/latest
- **FastAPI OpenAPI:** http://localhost:8000/docs (when running)

---

## Need Help?

**Common Questions:**

**Q: How do I add a new endpoint?**
A: Follow the 4-step pattern: Client method → Query key → Hook → Component

**Q: Should I use client directly or hook?**
A: Use hooks in components, use client directly in server actions/components

**Q: How do I handle errors?**
A: Use error boundaries + check `isError` in hooks

**Q: How do I test this?**
A: Use MSW for mocking + React Testing Library for hooks

**Q: Where do mutations go?**
A: In hooks with `useMutation`, invalidate related queries in `onSuccess`

---

**You're ready to build! Start with Phase 1 from the implementation checklist.**
