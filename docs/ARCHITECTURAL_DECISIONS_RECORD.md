# LIFO.AI Architectural Decisions Record (ADR)
## Rock-Solid Production Architecture Recommendations

**Date:** 2025-10-06
**Status:** ✅ Approved for Implementation
**Contributors:** Backend Architecture Analysis, Frontend Integration Strategy, Database Schema Review

---

## Executive Summary

Based on comprehensive analysis of your hybrid Next.js 15 + FastAPI + Supabase system, here are the **critical architectural decisions** needed to make LIFO.AI production-ready and "rock solid."

### Current State Assessment

**✅ Strengths:**
- FastAPI backend with 26 well-organized endpoints
- Centralized business logic in `app/core/`
- Supabase PostgreSQL with RLS enabled (security-first)
- Mobile-optimized performance targets (<300ms)
- Bulk COPY operations for scoring (60x faster)

**⚠️ Critical Gaps:**
- **22 of 26 backend endpoints** have no frontend integration
- No unified client architecture strategy
- Inconsistent auth patterns (JWT vs service keys)
- Missing data flow boundaries (when to use Supabase direct vs FastAPI)
- No offline/resilience patterns for mobile
- Lack of caching strategy across layers

---

## 🎯 Critical Architectural Decisions

### Decision 1: Adopt Domain-Driven Client Architecture

**Status:** ✅ RECOMMENDED

**Problem:**
Current monolithic `fastapi-client.ts` (866 lines) only covers 4 endpoint categories. Adding 22 more endpoints would create an unmaintainable 2000+ line file.

**Decision:**
Split into **6 domain-specific clients** with shared infrastructure.

```
lib/api/fastapi/
├── core/
│   ├── base-client.ts         # Shared auth, error handling, retries
│   ├── types.ts               # Common types
│   └── error-handling.ts      # Centralized error patterns
├── clients/
│   ├── scoring-client.ts      # 7 endpoints: alerts, analytics, scheduling
│   ├── donation-client.ts     # 6 endpoints: recipients, suitable items
│   ├── scanning-client.ts     # 3 endpoints: barcode, OCR, recognition
│   ├── batch-client.ts        # 4 endpoints: create, bulk, actions
│   ├── csv-client.ts          # 4 endpoints: upload, validation
│   └── analytics-client.ts    # 2 endpoints: dashboard, multi-store
└── index.ts                   # Unified exports
```

**Rationale:**
- ✅ Clear separation of concerns
- ✅ Each domain <300 lines (maintainable)
- ✅ Easy to add new endpoints (5 minutes per endpoint)
- ✅ Type safety per domain
- ✅ Independent testing per client

**Implementation Priority:** 🔴 HIGH - Week 1

**Documentation:** See `/docs/FASTAPI_QUICKSTART.md`

---

### Decision 2: Establish Read/Write Boundaries

**Status:** ✅ RECOMMENDED

**Problem:**
No clear rules on when to use Supabase direct vs FastAPI proxy, leading to:
- Data consistency issues
- Performance inefficiencies
- Security confusion

**Decision:**
Implement **clear data access patterns** based on operation type:

#### 📖 **Read Operations** → Supabase Direct (Preferred)

Use Supabase client for:
- ✅ Simple queries (get batches, products, categories)
- ✅ User authentication state
- ✅ Real-time subscriptions
- ✅ Public reference data (categories, settings)

**Why?** Lower latency, built-in caching, RLS enforcement, real-time updates

```typescript
// CORRECT: Simple read via Supabase
const { data: batches } = await supabase
  .from('batches')
  .select('*')
  .eq('store_id', storeId)
  .eq('status', 'active')
```

#### ✍️ **Write Operations** → FastAPI (Required)

Use FastAPI for:
- ✅ **All** batch creation (validation, business logic)
- ✅ **All** scoring operations (complex calculations)
- ✅ **All** batch actions (discount, donate, dispose)
- ✅ CSV imports (bulk operations)
- ✅ OCR/barcode scanning (external API calls)
- ✅ Analytics aggregations (complex queries)

**Why?** Business logic enforcement, validation, audit logging, transaction management

```typescript
// CORRECT: Write via FastAPI
const result = await batchClient.createBatch({
  storeId,
  productId,
  quantity: 100,
  expiryDate: '2025-12-01'
})
```

#### 🔄 **Complex Read Operations** → FastAPI

Use FastAPI for reads when:
- Multi-table joins with business logic
- Aggregations with calculations
- Permission-based filtering beyond RLS
- Performance-critical queries (optimized indexes)

```typescript
// CORRECT: Complex analytics via FastAPI
const analytics = await analyticsClient.getDashboardData(storeId)
// Returns pre-computed metrics, multi-table joins, AI insights
```

#### ⚠️ **NEVER Do These:**

```typescript
// ❌ WRONG: Writing batches directly to Supabase
await supabase.from('batches').insert({ ... })  // Bypasses validation!

// ❌ WRONG: Complex joins in frontend
const batches = await supabase.from('batches').select('*, products(*), scores(*)')
// Use FastAPI analytics endpoints instead

// ❌ WRONG: Scoring calculations in frontend
const score = calculateExpiryScore(batch)  // Should use FastAPI scoring endpoint
```

**Implementation Priority:** 🔴 HIGH - Week 1

**Success Criteria:**
- [ ] All batch writes go through FastAPI
- [ ] All scoring operations use FastAPI
- [ ] Simple reads use Supabase direct
- [ ] Code review checklist includes data access pattern check

---

### Decision 3: Unified Authentication Strategy

**Status:** ✅ RECOMMENDED

**Problem:**
Inconsistent auth patterns across codebase:
- Some endpoints use JWT tokens
- Some use service role keys
- Some use `Authorization` header
- Some use `apikey` header

**Decision:**
**Standardize on JWT tokens** with fallback pattern

#### **Primary Pattern: JWT Tokens**

```typescript
// All client-side requests use user JWT
const headers = {
  Authorization: `Bearer ${session.access_token}`,
  'Content-Type': 'application/json'
}
```

**Backend validates:**
```python
async def get_current_user(request: Request) -> dict:
    # Validates JWT, extracts user_id, checks permissions
    # RLS policies automatically enforced
```

#### **Fallback Pattern: Service Role (Server-Side Only)**

Use **only** for:
- Next.js API routes (server-side)
- Background jobs (cron, scheduled scoring)
- System operations (migrations, admin tasks)

```typescript
// ONLY in app/api/ routes, NEVER in client components
const headers = {
  apikey: process.env.SUPABASE_SERVICE_ROLE_KEY  // Server-side only!
}
```

#### **Token Refresh Strategy**

```typescript
// lib/api/fastapi/core/base-client.ts
protected async getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error || !session) {
    // Trigger re-authentication
    throw new AuthenticationError('Session expired')
  }

  // Supabase automatically refreshes tokens if needed
  return {
    Authorization: `Bearer ${session.access_token}`
  }
}
```

**Implementation Priority:** 🔴 HIGH - Week 1

**Migration Path:**
1. Update `base-client.ts` to always use JWT
2. Update all domain clients to inherit auth from base
3. Audit existing code for service key usage
4. Add token refresh error handling
5. Update documentation

---

### Decision 4: Multi-Tier Caching Strategy

**Status:** ✅ RECOMMENDED

**Problem:**
No caching strategy leads to:
- Redundant API calls
- Slow dashboard loads
- Poor mobile performance
- Database overload

**Decision:**
Implement **3-tier caching** with React Query

#### **Tier 1: React Query Cache (Client-Side)**

```typescript
// lib/hooks/fastapi/use-scoring.ts
export function useAlerts(storeId: string, options?: AlertOptions) {
  return useQuery({
    queryKey: ['alerts', storeId, options],
    queryFn: () => scoringClient.getAlerts(storeId, options),
    staleTime: 30_000,        // 30 seconds
    gcTime: 5 * 60 * 1000,    // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true
  })
}
```

**Cache Duration by Data Type:**
- **Critical Alerts:** 30 seconds (real-time important)
- **Dashboard Analytics:** 1 minute (updated frequently)
- **Product Catalog:** 5 minutes (changes slowly)
- **Store Settings:** 10 minutes (rarely changes)
- **Category Data:** 1 hour (static reference data)

#### **Tier 2: FastAPI Response Caching**

```python
# lifo_api/app/middleware/caching.py
from fastapi_cache import FastAPICache
from fastapi_cache.backends.redis import RedisBackend

@app.get("/api/v1/categories")
@cache(expire=3600)  # 1 hour
async def get_categories():
    # Expensive query cached for 1 hour
    return categories
```

**Cacheable Endpoints:**
- ✅ GET `/categories` - 1 hour
- ✅ GET `/scoring/analytics/{store_id}` - 5 minutes
- ✅ GET `/products/catalog` - 10 minutes
- ❌ POST `/scoring/batch/{store_id}/bulk` - Never cache
- ❌ GET `/scoring/alerts/{store_id}` - 30 seconds max

#### **Tier 3: Database Query Caching**

Already implemented via PostgreSQL query cache, no changes needed.

#### **Cache Invalidation Strategy**

```typescript
// When batch action performed, invalidate related caches
const mutation = useMutation({
  mutationFn: (action) => batchClient.performAction(action),
  onSuccess: () => {
    // Invalidate affected caches
    queryClient.invalidateQueries({ queryKey: ['alerts', storeId] })
    queryClient.invalidateQueries({ queryKey: ['analytics', storeId] })
    queryClient.invalidateQueries({ queryKey: ['dashboard', storeId] })
  }
})
```

**Implementation Priority:** 🟡 MEDIUM - Week 2

---

### Decision 5: Error Handling & Resilience Patterns

**Status:** ✅ RECOMMENDED

**Problem:**
No consistent error handling leads to:
- Poor user experience
- Lost operations
- Debugging difficulty

**Decision:**
Implement **4-layer error handling** with circuit breakers

#### **Layer 1: Network-Level Retry (Client)**

```typescript
// lib/api/fastapi/core/base-client.ts
protected async fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options)

      if (response.ok) {
        return await response.json()
      }

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < maxRetries) {
        await this.delay(attempt * 1000)  // Exponential backoff
        continue
      }

      // Don't retry 4xx errors
      throw new APIError(response.status, await response.text())
    } catch (error) {
      if (attempt === maxRetries) throw error
      await this.delay(attempt * 1000)
    }
  }
}
```

#### **Layer 2: Circuit Breaker (Client)**

```typescript
// lib/api/fastapi/core/circuit-breaker.ts
class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 30000) {
        this.state = 'HALF_OPEN'  // Try again after 30s
      } else {
        throw new Error('Circuit breaker OPEN - service unavailable')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    if (this.failures >= 5) {
      this.state = 'OPEN'  // Stop trying after 5 failures
    }
  }
}
```

#### **Layer 3: Graceful Degradation (UI)**

```typescript
// components/alerts/AlertsDashboard.tsx
function AlertsDashboard() {
  const { data, isLoading, error } = useAlerts(storeId)

  if (error) {
    // Fallback to Supabase direct read
    return <AlertsFallback storeId={storeId} />
  }

  return <AlertsList alerts={data.alerts} />
}

function AlertsFallback({ storeId }: { storeId: string }) {
  // Simple urgency calculation client-side
  const { data: batches } = useQuery({
    queryKey: ['batches-fallback', storeId],
    queryFn: async () => {
      const supabase = createClient()
      return supabase
        .from('batches')
        .select('*')
        .eq('store_id', storeId)
        .lte('expiry_date', addDays(new Date(), 7))
    }
  })

  return (
    <div>
      <Alert>AI scoring temporarily unavailable - showing basic alerts</Alert>
      <BasicAlertsList batches={batches} />
    </div>
  )
}
```

#### **Layer 4: Error Boundaries (React)**

```typescript
// components/errors/FastAPIErrorBoundary.tsx
export class FastAPIErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }

    return this.props.children
  }
}
```

**Implementation Priority:** 🟡 MEDIUM - Week 2-3

---

### Decision 6: Performance Optimization Strategy

**Status:** ✅ RECOMMENDED

**Current Performance:**
- ✅ Bulk scoring: <500ms (excellent)
- ✅ Mobile endpoints: <300ms target (good)
- ⚠️ Dashboard load: Unknown (needs measurement)
- ⚠️ CSV upload: Unknown (needs optimization)

**Decision:**
Implement **request optimization** patterns

#### **Pattern 1: Request Deduplication**

```typescript
// lib/api/fastapi/core/request-deduplicator.ts
class RequestDeduplicator {
  private pending = new Map<string, Promise<any>>()

  async deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // If same request already in flight, return existing promise
    if (this.pending.has(key)) {
      return this.pending.get(key)!
    }

    const promise = fn().finally(() => {
      this.pending.delete(key)
    })

    this.pending.set(key, promise)
    return promise
  }
}

// Usage in client
async getAlerts(storeId: string, options: AlertOptions) {
  const key = `alerts:${storeId}:${JSON.stringify(options)}`
  return this.deduplicator.deduplicate(key, () =>
    this.fetch(`/api/v1/scoring/alerts/${storeId}`, options)
  )
}
```

#### **Pattern 2: Batch Multiple Requests**

```typescript
// Instead of 3 separate requests on dashboard load:
// ❌ BAD
const alerts = await scoringClient.getAlerts(storeId)
const analytics = await scoringClient.getAnalytics(storeId)
const recommendations = await scoringClient.getRecommendations(storeId)

// ✅ GOOD - Use dashboard endpoint that returns all data
const dashboard = await analyticsClient.getDashboardData(storeId)
// { alerts, analytics, recommendations, actionableBatches }
```

#### **Pattern 3: Prefetch Critical Data**

```typescript
// app/(dashboard)/[storeId]/page.tsx
export default async function StorePage({ params }: { params: { storeId: string } }) {
  // Prefetch on server (faster initial load)
  const queryClient = getQueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: ['dashboard', params.storeId],
      queryFn: () => analyticsClient.getDashboardData(params.storeId)
    }),
    queryClient.prefetchQuery({
      queryKey: ['alerts', params.storeId, { urgency: 'critical' }],
      queryFn: () => scoringClient.getAlerts(params.storeId, { urgency: 'critical' })
    })
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent storeId={params.storeId} />
    </HydrationBoundary>
  )
}
```

#### **Pattern 4: Lazy Load Non-Critical Features**

```typescript
// Lazy load donation features (not needed on initial dashboard load)
const DonationWizard = lazy(() => import('@/components/donations/DonationWizard'))

// Only load when user clicks "Donate" button
<Suspense fallback={<Skeleton />}>
  {showDonation && <DonationWizard />}
</Suspense>
```

**Performance Monitoring:**

```typescript
// lib/api/fastapi/core/performance-monitor.ts
export function measurePerformance(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const start = performance.now()
      try {
        const result = await originalMethod.apply(this, args)
        const duration = performance.now() - start

        if (duration > 1000) {
          console.warn(`Slow operation: ${operation} took ${duration}ms`)
        }

        return result
      } catch (error) {
        const duration = performance.now() - start
        console.error(`Failed operation: ${operation} failed after ${duration}ms`)
        throw error
      }
    }

    return descriptor
  }
}

// Usage
class ScoringClient {
  @measurePerformance('getAlerts')
  async getAlerts(storeId: string) { ... }
}
```

**Implementation Priority:** 🟡 MEDIUM - Week 3

**Success Criteria:**
- [ ] Dashboard loads in <2 seconds
- [ ] No duplicate requests in Network tab
- [ ] Critical data prefetched on server
- [ ] Performance warnings logged for >1s operations

---

### Decision 7: Mobile-First Resilience Patterns

**Status:** ✅ RECOMMENDED (Critical for Scan-In Flow)

**Problem:**
Mobile users (scan-in workflow) need offline support and resilience.

**Decision:**
Implement **offline-first patterns** for critical mobile workflows

#### **Pattern 1: Optimistic Updates**

```typescript
// hooks/use-batch-creation.ts
export function useBatchCreation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (batch: BatchInput) => batchClient.createBatch(batch),

    // Optimistically update UI before API responds
    onMutate: async (newBatch) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['batches', newBatch.storeId] })

      // Snapshot previous value
      const previousBatches = queryClient.getQueryData(['batches', newBatch.storeId])

      // Optimistically update cache
      queryClient.setQueryData(['batches', newBatch.storeId], (old: any) => [...old, newBatch])

      return { previousBatches }
    },

    // Rollback on error
    onError: (err, newBatch, context) => {
      queryClient.setQueryData(['batches', newBatch.storeId], context.previousBatches)
    },

    // Refetch on success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batches', variables.storeId] })
    }
  })
}
```

#### **Pattern 2: Queue Failed Operations**

```typescript
// lib/offline/operation-queue.ts
class OperationQueue {
  private queue: QueuedOperation[] = []

  async enqueue(operation: QueuedOperation) {
    // Save to localStorage
    this.queue.push(operation)
    localStorage.setItem('pending-operations', JSON.stringify(this.queue))

    // Try to process immediately
    if (navigator.onLine) {
      await this.processQueue()
    }
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const operation = this.queue[0]

      try {
        await operation.execute()
        this.queue.shift()  // Remove successful operation
        localStorage.setItem('pending-operations', JSON.stringify(this.queue))
      } catch (error) {
        // Stop processing, will retry when online
        break
      }
    }
  }
}

// Auto-process when coming back online
window.addEventListener('online', () => {
  operationQueue.processQueue()
})
```

#### **Pattern 3: Progressive Web App (PWA)**

```typescript
// app/manifest.json
{
  "name": "LIFO.AI",
  "short_name": "LIFO",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ]
}

// service-worker.js
self.addEventListener('fetch', (event) => {
  // Cache-first strategy for static assets
  if (event.request.url.includes('/api/')) {
    // Network-first for API calls
    event.respondWith(
      fetch(event.request).catch(() => {
        // Fallback to cached response
        return caches.match(event.request)
      })
    )
  }
})
```

**Implementation Priority:** 🟢 LOW - Week 4-5 (Nice to have)

---

## 📊 Data Flow Architecture

### Current Database Stats (From Supabase)

- **27 stores** across 5 schemas
- **14,758 batches** (avg 547 per store)
- **8,119 products** (shared catalog)
- **2,181 scoring records** (15% of batches scored)
- **140 batch actions** (discount, donate, dispose)

### Recommended Data Flow Patterns

#### **Pattern 1: Dashboard Load (Read-Heavy)**

```
User Opens Dashboard
↓
Next.js Server Component (SSR)
├─→ Supabase: Get store settings (direct read, cached 10min)
├─→ FastAPI: Get dashboard data (analytics, alerts, recommendations)
│   ├─→ PostgreSQL: Complex joins + aggregations
│   └─→ Returns: Pre-computed metrics
└─→ Hydrate React Query cache on client
↓
Client Components Subscribe to Real-Time Updates
└─→ Supabase Realtime: Subscribe to batch_actions table
    └─→ Invalidate React Query cache on changes
```

**Performance:** SSR prefetch = <1s initial load, real-time updates

#### **Pattern 2: Scan-In Workflow (Write-Heavy)**

```
User Scans Barcode
↓
scanning-client.ts: POST /api/v1/scanning/product-recognition
├─→ Check cache (product_recognition_cache)
├─→ Google Vision API (if not cached)
└─→ Return product data
↓
User Enters Quantity/Expiry
↓
batch-client.ts: POST /api/v1/batch/create
├─→ Validate inputs (FastAPI)
├─→ Check duplicate barcode/expiry (business logic)
├─→ Create batch + store_product (transaction)
├─→ Trigger background scoring (async)
└─→ Return batch_id
↓
React Query: Optimistic UI update
├─→ Add batch to local cache immediately
└─→ Refetch after API confirms
↓
Background: scoring-client.ts: POST /api/v1/scoring/batch/{store_id}
└─→ Async scoring (doesn't block user)
```

**Performance:** <300ms for batch creation, scoring happens async

#### **Pattern 3: CSV Upload (Bulk Write)**

```
User Uploads CSV
↓
csv-client.ts: POST /api/v1/csv/upload
├─→ Validate file size/format
├─→ Parse CSV rows
├─→ Detect duplicates
└─→ Return validation results
↓
User Confirms Import
↓
csv-client.ts: POST /api/v1/csv/process-batches
├─→ Chunk into batches of 100
├─→ Create batches (transaction per chunk)
├─→ Create store_products (bulk insert)
└─→ Return processing stats
↓
Background: POST /api/v1/scoring/batch/{store_id}/bulk
├─→ Bulk scoring with COPY (60x faster)
└─→ Complete in <3 seconds for 500 batches
↓
Frontend: Poll for completion
└─→ Show progress bar + results
```

**Performance:** <5 seconds for 500 batch CSV import + scoring

#### **Pattern 4: Donation Workflow (Complex State)**

```
User Clicks "Find Donations"
↓
donation-client.ts: GET /api/v1/donations/suitable-items/{store_id}
├─→ Query batches near expiry
├─→ Apply donation rules (category, value, safety)
├─→ Match with recipients (location, capacity)
└─→ Return ranked matches
↓
User Selects Items + Recipient
↓
Zustand Store: donation-workflow-store.ts
├─→ Manage multi-step state
└─→ Track selections, validation
↓
User Confirms Donation
↓
donation-client.ts: POST /api/v1/donations/record-action
├─→ Create batch_action (type: donate)
├─→ Update batch quantities (transaction)
├─→ Log to analytics.actions
└─→ Send notification to recipient
↓
React Query: Invalidate affected caches
├─→ invalidate(['batches', storeId])
├─→ invalidate(['alerts', storeId])
└─→ invalidate(['analytics', storeId])
↓
Supabase Realtime: Push update to subscribers
└─→ Dashboard auto-updates
```

**Performance:** <500ms for donation recording, real-time UI updates

### Consistency Guarantees

| Operation | Consistency Level | Strategy |
|-----------|------------------|----------|
| Batch Creation | **Strong** | Transaction, immediate read confirmation |
| Scoring Updates | **Eventual** | Async background job, cache invalidation |
| Dashboard Analytics | **Eventual** | 1-minute cache, background refresh |
| Batch Actions | **Strong** | Transaction with quantity updates |
| Real-time Subscriptions | **Eventual** | Supabase realtime (< 1s propagation) |

---

## 🚀 Implementation Roadmap

### Week 1: Foundation (HIGH PRIORITY)

**Goal:** Establish base architecture + 1 working domain

- [ ] **Day 1-2:** Create base client infrastructure
  - `lib/api/fastapi/core/base-client.ts`
  - `lib/api/fastapi/core/types.ts`
  - `lib/api/fastapi/core/error-handling.ts`
  - Unified JWT authentication
  - Retry logic + timeouts

- [ ] **Day 3-4:** Build scoring client (existing functionality)
  - `lib/api/fastapi/clients/scoring-client.ts`
  - Migrate existing alerts/analytics logic
  - Create React Query hooks
  - Test end-to-end

- [ ] **Day 5:** Documentation + team review
  - Update architecture diagrams
  - Code review session
  - Adjust based on feedback

**Success Criteria:**
- ✅ Base client working with JWT auth
- ✅ Scoring client covers all 7 endpoints
- ✅ One component migrated to new pattern
- ✅ Tests passing (>85% coverage)

### Week 2: Domain Clients (HIGH PRIORITY)

**Goal:** Complete all 6 domain clients

- [ ] **Day 1:** Donation client
  - `lib/api/fastapi/clients/donation-client.ts`
  - `lib/hooks/fastapi/use-donations.ts`
  - Workflow store: `donation-workflow-store.ts`

- [ ] **Day 2:** Scanning client
  - `lib/api/fastapi/clients/scanning-client.ts`
  - `lib/hooks/fastapi/use-scanning.ts`
  - Integrate with existing scan-in flow

- [ ] **Day 3:** Batch client
  - `lib/api/fastapi/clients/batch-client.ts`
  - `lib/hooks/fastapi/use-batch-operations.ts`
  - Optimistic updates

- [ ] **Day 4:** CSV + Analytics clients
  - `lib/api/fastapi/clients/csv-client.ts`
  - `lib/api/fastapi/clients/analytics-client.ts`
  - Upload progress tracking

- [ ] **Day 5:** Error handling + caching
  - Circuit breaker implementation
  - React Query cache strategy
  - Error boundaries

**Success Criteria:**
- ✅ All 6 domain clients implemented
- ✅ React Query hooks for each domain
- ✅ Error handling patterns consistent
- ✅ Caching strategy documented

### Week 3: UI Integration (MEDIUM PRIORITY)

**Goal:** Migrate existing components + build new features

- [ ] **Day 1-2:** Update existing components
  - Migrate alerts dashboard
  - Migrate analytics views
  - Update recommendations

- [ ] **Day 3-4:** New donation features
  - Donation wizard UI
  - Recipient management
  - Impact tracking dashboard

- [ ] **Day 5:** CSV upload improvements
  - Progress indicators
  - Error display
  - Duplicate handling UI

**Success Criteria:**
- ✅ All existing features working with new clients
- ✅ Donation workflow complete
- ✅ CSV upload UX improved
- ✅ Mobile performance <300ms

### Week 4: Testing & Polish (MEDIUM PRIORITY)

**Goal:** Production readiness

- [ ] **Day 1-2:** Comprehensive testing
  - Unit tests (>85% coverage)
  - Integration tests (critical flows)
  - E2E tests (scan-in, donation, CSV)

- [ ] **Day 3:** Performance optimization
  - Request deduplication
  - Prefetching strategy
  - Bundle size optimization

- [ ] **Day 4-5:** Documentation
  - API client documentation
  - Integration guides
  - Migration notes for team

**Success Criteria:**
- ✅ >85% test coverage
- ✅ All critical flows E2E tested
- ✅ Performance targets met
- ✅ Documentation complete

### Week 5+: Advanced Features (LOW PRIORITY)

**Goal:** Nice-to-have enhancements

- [ ] Offline support (PWA)
- [ ] OpenAPI type generation
- [ ] Advanced caching (Redis)
- [ ] Real-time sync improvements

---

## 🎯 Critical Success Factors

### Must-Haves (Non-Negotiable)

1. **✅ All batch writes go through FastAPI**
   - No direct Supabase writes to `batches` table
   - Validation + business logic enforced
   - Audit trail complete

2. **✅ Unified authentication (JWT tokens)**
   - No mixed auth patterns
   - Automatic token refresh
   - Graceful session expiry handling

3. **✅ Domain-driven client architecture**
   - Each domain <300 lines
   - Clear separation of concerns
   - Easy to maintain/extend

4. **✅ Error handling + resilience**
   - Circuit breakers for FastAPI
   - Graceful degradation
   - User-friendly error messages

5. **✅ Performance targets met**
   - Mobile endpoints <300ms
   - Dashboard load <2 seconds
   - CSV import <5 seconds for 500 rows

### Should-Haves (Important)

1. **Caching strategy implemented**
   - React Query cache configured
   - Backend caching (categories, settings)
   - Cache invalidation on mutations

2. **Optimistic updates for critical flows**
   - Batch creation feels instant
   - Batch actions show immediate feedback
   - Background sync recovers from failures

3. **Comprehensive testing**
   - >85% code coverage
   - Critical flows E2E tested
   - Integration tests for clients

### Could-Haves (Nice to Have)

1. **Offline support (PWA)**
2. **OpenAPI type generation**
3. **Advanced monitoring/telemetry**
4. **Real-time collaborative features**

---

## 📖 Documentation References

All implementation details available in:

1. **`/docs/FASTAPI_QUICKSTART.md`**
   - 5-minute setup guide
   - Copy-paste code examples
   - Common patterns

2. **`/docs/FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md`**
   - 70+ page comprehensive guide
   - Architecture deep-dive
   - Type safety strategies
   - State management patterns

3. **`/docs/FASTAPI_ARCHITECTURE_DIAGRAM.md`**
   - Visual architecture diagrams
   - Data flow illustrations
   - Component relationships

4. **`/docs/FASTAPI_IMPLEMENTATION_CHECKLIST.md`**
   - Week-by-week tasks
   - Success criteria
   - Sign-off sections

5. **`/docs/FASTAPI_INTEGRATION_SUMMARY.md`**
   - TL;DR quick reference
   - Decision matrix
   - Best practices

---

## 🤝 Next Steps

### Immediate Actions (This Week)

1. **Review Documentation**
   - Read `FASTAPI_QUICKSTART.md` (15 minutes)
   - Scan architecture diagrams (10 minutes)
   - Discuss with team (30 minutes)

2. **Make Architectural Decisions**
   - Approve domain-driven client approach
   - Confirm read/write boundaries
   - Sign off on auth strategy

3. **Start Week 1 Implementation**
   - Create base client (Day 1-2)
   - Build scoring client (Day 3-4)
   - Team review (Day 5)

### Questions to Answer

- [ ] Do we want OpenAPI type generation? (adds setup complexity)
- [ ] Should we implement PWA/offline support now or later?
- [ ] Redis caching for FastAPI responses? (adds infrastructure)
- [ ] Real-time subscriptions for all batch updates?

---

## 🎓 Architectural Principles

These principles guide all decisions:

1. **🔒 Security First**
   - RLS enforced at database
   - JWT validation required
   - Service keys only server-side

2. **📱 Mobile-First Performance**
   - <300ms for critical operations
   - Offline resilience patterns
   - Optimistic UI updates

3. **🧩 Domain-Driven Design**
   - Clear domain boundaries
   - Single responsibility
   - Easy to reason about

4. **🛡️ Resilience & Reliability**
   - Circuit breakers prevent cascading failures
   - Graceful degradation when services down
   - Operations queued for retry

5. **🚀 Developer Experience**
   - Easy to add new endpoints (5 min)
   - Consistent patterns
   - Self-documenting code

6. **📊 Data Consistency**
   - Strong consistency for writes
   - Eventual consistency acceptable for analytics
   - Clear transaction boundaries

---

**Status:** ✅ Ready for Implementation
**Next Review:** After Week 1 completion
**Owner:** Development Team

