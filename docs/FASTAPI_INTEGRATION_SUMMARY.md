# FastAPI Frontend Integration - Quick Reference

**Full Documentation:** See `FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md`

## TL;DR

Transform your 866-line single-file FastAPI client into a scalable, type-safe, domain-driven architecture that covers all 26+ endpoints with React Query hooks and Zustand stores.

## Architecture at a Glance

```
lib/api/fastapi/
├── core/
│   └── base-client.ts              # Shared fetch/auth logic
├── clients/
│   ├── scoring-client.ts           # Alerts, analytics, automated scoring
│   ├── donation-client.ts          # Recipients, suitable items, actions
│   ├── scanning-client.ts          # Barcode, OCR, product recognition
│   ├── batch-client.ts             # Batch CRUD, bulk operations
│   └── csv-client.ts               # Upload, validation, duplicates
└── index.ts                        # Unified exports
```

## Quick Start

### 1. Import and Use

```typescript
// Before (old way)
import { fastApiClient } from '@/lib/services/fastapi-client'
const alerts = await fastApiClient.getStoreAlerts(storeId, token)

// After (new way)
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'
const { data: alerts, isLoading } = useAlerts({ limit: 10 })
```

### 2. Client Usage

```typescript
import { scoringClient, donationClient, batchClient } from '@/lib/api/fastapi'

// Direct client usage (for server components or actions)
const alerts = await scoringClient.getAlerts(storeId, { threshold: 0.7 })
const recipients = await donationClient.getRecipients(storeId)
const batch = await batchClient.createBatch(storeId, batchData)
```

### 3. React Query Hooks (Recommended)

```typescript
import {
  useAlerts,
  useDonationRecipients,
  useSuitableDonationItems,
  useScoringActions
} from '@/lib/hooks/fastapi'

function MyComponent() {
  // Queries
  const { data: alerts, isLoading } = useAlerts({ urgency: 'critical' })
  const { data: recipients } = useDonationRecipients()
  const { data: items } = useSuitableDonationItems({ min_days_to_expiry: 2 })

  // Mutations
  const { triggerScoring, recordDonation } = useScoringActions()

  return (
    <button onClick={() => triggerScoring()}>
      Run Scoring
    </button>
  )
}
```

## Key Features

### 1. Type Safety

```typescript
// All responses are fully typed
const alerts: AlertsResponse = await scoringClient.getAlerts(storeId)
alerts.ai_insights?.total_potential_savings // TypeScript autocomplete works!

// Runtime validation with Zod (optional)
const AlertSchema = z.object({ /* ... */ })
type Alert = z.infer<typeof AlertSchema>
```

### 2. Authentication Handling

```typescript
// Automatic token management
class BaseFastAPIClient {
  protected async getAuthHeaders(options?: AuthOptions) {
    // Automatically detects:
    // - User JWT tokens (client-side)
    // - Service role keys (server-side admin)
    // - Custom tokens (special cases)
  }
}
```

### 3. Error Handling

```typescript
try {
  const alerts = await scoringClient.getAlerts(storeId)
} catch (error) {
  // Consistent error format
  if (error.message.includes('timeout')) {
    // Handle timeout
  } else if (error.message.includes('unavailable')) {
    // Handle service down
  }
}
```

### 4. Caching & Invalidation

```typescript
// React Query automatically caches
const { data } = useAlerts() // Cached for 30s

// Invalidate after mutations
const { triggerScoring } = useScoringActions()
// Automatically invalidates related queries on success
```

### 5. Optimistic Updates

```typescript
const { recordDonation } = useDonationActions()

// Mutation with optimistic update
recordDonation(donationData)
// UI updates immediately, rolls back on error
```

## Domain Breakdown

### Scoring (7 endpoints)
- `GET /alerts/{store_id}` - Get urgent alerts
- `GET /analytics/{store_id}` - Get analytics
- `GET /recommendations/{store_id}` - Get AI recommendations
- `POST /trigger/{store_id}` - Trigger immediate scoring
- `GET /schedules/{store_id}` - Get scoring schedules
- `POST /schedules/{store_id}` - Create scoring schedule
- `GET /jobs/{store_id}` - Get scoring job status

### Donations (6 endpoints)
- `GET /recipients/{store_id}` - List recipients
- `POST /recipients/{store_id}` - Create recipient
- `PUT /recipients/{recipient_id}` - Update recipient
- `GET /suitable-items/{store_id}` - Query suitable items
- `POST /actions/{store_id}` - Record donation
- `GET /history/{store_id}` - Get donation history

### Scanning (3 endpoints)
- `GET /barcode/{store_id}` - Scan barcode
- `POST /ocr-expiry/{store_id}` - Extract expiry date (OCR)
- `POST /recognize/{store_id}` - Recognize product from image

### Batch Operations (4 endpoints)
- `POST /create/{store_id}` - Create single batch
- `POST /bulk/{store_id}` - Create multiple batches
- `POST /{batch_id}/action` - Apply action (discount/donate/dispose)
- `GET /actions/{store_id}` - Get action history

### CSV Operations (4 endpoints)
- `POST /upload/{store_id}` - Upload CSV
- `POST /duplicates/{store_id}` - Check duplicates
- `GET /status/{upload_id}` - Get processing status
- `GET /history/{store_id}` - Get upload history

## Component Examples

### Alerts Dashboard

```typescript
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'

export function AlertsDashboard() {
  const { data, isLoading, error } = useAlerts({
    urgency: 'critical',
    limit: 10,
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      {data?.alerts.map(alert => (
        <AlertCard key={alert.batch_id} alert={alert} />
      ))}
    </div>
  )
}
```

### Donation Workflow

```typescript
import { useDonationWorkflowStore } from '@/lib/stores/donation-workflow-store'
import { useDonationActions } from '@/lib/hooks/fastapi/use-donations'

export function DonationWizard() {
  const currentStep = useDonationWorkflowStore(state => state.currentStep)
  const { recordDonation, isRecordingDonation } = useDonationActions()

  // Multi-step wizard UI
  return <WizardLayout currentStep={currentStep} />
}
```

### Mobile Scanning

```typescript
import { scanningClient } from '@/lib/api/fastapi'

export function MobileScanner() {
  const handleBarcode = async (barcode: string) => {
    const result = await scanningClient.scanBarcode(storeId, barcode)

    if (result.product_found) {
      // Product found in database
      setProduct(result.product_data)
    } else {
      // Show manual entry form
      showManualEntry()
    }
  }

  return <BarcodeScanner onDetect={handleBarcode} />
}
```

## Performance Patterns

### Prefetching

```typescript
// Prefetch next page data
queryClient.prefetchQuery({
  queryKey: queryKeys.donations.suitableItems(storeId, {}),
  queryFn: () => donationClient.querySuitableItems(storeId),
})
```

### Debouncing

```typescript
import { useDebouncedValue } from '@/hooks/use-debounce'

const [filters, setFilters] = useState({ search: '' })
const debouncedFilters = useDebouncedValue(filters, 300)
const { data } = useAlerts(debouncedFilters)
```

### Background Refetching

```typescript
const { data } = useAlerts({}, {
  refetchInterval: 60 * 1000, // Refresh every minute
  refetchIntervalInBackground: false, // Only when tab active
})
```

## State Management Philosophy

### Use React Query For:
- Server data (alerts, recipients, analytics)
- Cached API responses
- Background syncing
- Optimistic updates

### Use Zustand For:
- UI state (modals, tabs, filters)
- Workflow steps (donation wizard, scanning flow)
- User preferences (collapsed sections, view modes)
- Form drafts

### Don't Duplicate:
❌ Don't store server data in Zustand
❌ Don't store UI state in React Query
✅ Use each tool for its strength

## Testing Strategy

### Client Tests

```typescript
import { scoringClient } from '@/lib/api/fastapi'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('*/api/v1/scoring/alerts/:storeId', (req, res, ctx) => {
    return res(ctx.json({ alerts: [], total_count: 0 }))
  }),
)

test('fetches alerts', async () => {
  const result = await scoringClient.getAlerts('test-store')
  expect(result.alerts).toEqual([])
})
```

### Hook Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'

test('useAlerts fetches and caches data', async () => {
  const { result } = renderHook(() => useAlerts(), { wrapper: QueryWrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toBeDefined()
})
```

## Migration Path

### Week 1: Foundation
- ✅ Base client infrastructure
- ✅ Scoring client (most used)
- ✅ Query keys and hooks

### Week 2: Domain Clients
- ✅ Donation, scanning, batch, CSV clients
- ✅ All hooks and stores
- ✅ Type definitions

### Week 3: Component Integration
- ✅ Update existing components
- ✅ Build new UIs
- ✅ Mobile optimization

### Week 4: Testing & Polish
- ✅ Unit tests
- ✅ Integration tests
- ✅ Performance optimization

### Week 5: Advanced Features
- ✅ Offline support
- ✅ Type generation
- ✅ Monitoring

## Adding New Endpoints (5-Minute Guide)

### Step 1: Add to Client

```typescript
// lib/api/fastapi/clients/scoring-client.ts
export class ScoringClient extends BaseFastAPIClient {
  async getNewFeature(storeId: string): Promise<FeatureResponse> {
    return this.get(`/api/v1/scoring/new-feature/${storeId}`)
  }
}
```

### Step 2: Add Query Key

```typescript
// lib/queries/query-keys.ts
scoring: {
  // ...
  newFeature: (storeId: string) =>
    [...queryKeys.scoring.all, 'new-feature', storeId] as const,
}
```

### Step 3: Create Hook

```typescript
// lib/hooks/fastapi/use-scoring.ts
export function useNewFeature() {
  const storeId = useActiveStoreId()
  return useQuery({
    queryKey: queryKeys.scoring.newFeature(storeId || ''),
    queryFn: () => scoringClient.getNewFeature(storeId!),
    enabled: !!storeId,
  })
}
```

### Step 4: Use in Component

```typescript
import { useNewFeature } from '@/lib/hooks/fastapi/use-scoring'

function MyComponent() {
  const { data, isLoading } = useNewFeature()
  return <div>{data?.result}</div>
}
```

## Production Checklist

- [ ] All clients tested
- [ ] Error boundaries in place
- [ ] Loading states handled
- [ ] Mobile performance <300ms
- [ ] Offline mode (optional)
- [ ] Monitoring/telemetry
- [ ] Documentation complete
- [ ] Type generation automated
- [ ] Test coverage >85%

## Common Patterns

### Handle Loading States

```typescript
const { data, isLoading, error } = useAlerts()

if (isLoading) return <LoadingSpinner />
if (error) return <ErrorBoundary error={error} />
if (!data?.alerts.length) return <EmptyState />

return <AlertsList alerts={data.alerts} />
```

### Dependent Queries

```typescript
const { data: recipients } = useDonationRecipients()
const recipientId = recipients?.[0]?.recipient_id

const { data: items } = useSuitableDonationItems(
  { recipient_id: recipientId },
  { enabled: !!recipientId }, // Only fetch when recipient selected
)
```

### Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries({ queryKey: ['data'] })

    // Snapshot previous value
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

### Polling

```typescript
const { data } = useScoringJobStatus(jobId, {
  refetchInterval: (data) => {
    // Stop polling when job completes
    return data?.status === 'completed' ? false : 5000
  },
})
```

## Resources

- **Full Documentation:** `docs/FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md`
- **React Query Docs:** https://tanstack.com/query/latest
- **Zustand Docs:** https://github.com/pmndrs/zustand
- **FastAPI Backend:** `lifo_api/app/api/v1/`

## Questions?

Contact the development team or check the full strategy document for detailed explanations, code examples, and implementation guidance.

---

**Remember:** Start small (Phase 1), iterate quickly, and gradually migrate existing code. The architecture supports both old and new patterns during transition.
