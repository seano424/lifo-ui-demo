# FastAPI Frontend Architecture - Visual Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LIFO.AI Frontend                             │
│                     (Next.js 15 + React 19)                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   │
                  ┌────────────────┴────────────────┐
                  │                                  │
                  ▼                                  ▼
┌─────────────────────────────┐    ┌─────────────────────────────┐
│   React Components          │    │   React Server              │
│   (Client Components)       │    │   Components (RSC)          │
│                             │    │                             │
│  • Dashboard                │    │  • Data fetching            │
│  • Alerts                   │    │  • Server actions           │
│  • Donation Wizard          │    │  • Initial page loads       │
│  • Mobile Scanner           │    │                             │
└──────────┬──────────────────┘    └──────────┬──────────────────┘
           │                                  │
           │                                  │
           ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      State Management Layer                          │
│  ┌──────────────────────┐         ┌───────────────────────────┐   │
│  │   React Query        │         │   Zustand Stores          │   │
│  │   (Server State)     │         │   (UI State)              │   │
│  │                      │         │                           │   │
│  │  • Alerts data       │         │  • Donation workflow      │   │
│  │  • Recipients        │         │  • Scanning workflow      │   │
│  │  • Analytics         │         │  • Batch selections       │   │
│  │  • Caching           │         │  • Filter preferences     │   │
│  │  • Background sync   │         │  • Modal states           │   │
│  └──────────┬───────────┘         └───────────────────────────┘   │
└─────────────┼───────────────────────────────────────────────────────┘
              │
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     React Query Hooks Layer                          │
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ useAlerts() │  │useDonations()│  │useScanning() │   ...        │
│  └─────────────┘  └──────────────┘  └──────────────┘              │
│                                                                       │
│  • Automatic caching                                                 │
│  • Loading states                                                    │
│  • Error handling                                                    │
│  • Optimistic updates                                                │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   Domain-Specific Clients                            │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Scoring      │  │ Donation     │  │ Scanning     │             │
│  │ Client       │  │ Client       │  │ Client       │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │ Batch        │  │ CSV          │  │ Analytics    │             │
│  │ Client       │  │ Client       │  │ Client       │             │
│  └──────────────┘  └──────────────┘  └──────────────┘             │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Base FastAPI Client                             │
│                                                                       │
│  • Authentication (JWT + Service Role)                               │
│  • Error handling & retry logic                                      │
│  • Timeout management                                                │
│  • Request/response logging                                          │
│  • Performance monitoring                                            │
└─────────────┬───────────────────────────────────────────────────────┘
              │
              │ HTTP/HTTPS
              │
              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                               │
│                      (Python + PostgreSQL)                           │
│                                                                       │
│  /api/v1/scoring/*    (7 endpoints)                                 │
│  /api/v1/donations/*  (6 endpoints)                                 │
│  /api/v1/mobile/*     (3 endpoints)                                 │
│  /api/v1/batches/*    (4 endpoints)                                 │
│  /api/v1/csv/*        (4 endpoints)                                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Client Architecture Detail

```
┌────────────────────────────────────────────────────────────────────┐
│                    lib/api/fastapi/                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   core/base-client.ts                       │   │
│  │                                                              │   │
│  │  class BaseFastAPIClient {                                  │   │
│  │    protected baseUrl: string                                │   │
│  │    protected defaultTimeout: number                         │   │
│  │                                                              │   │
│  │    protected async getAuthHeaders()                         │   │
│  │    protected async get<T>(path, params, config)            │   │
│  │    protected async post<T>(path, body, config)             │   │
│  │    protected async put<T>(path, body, config)              │   │
│  │    protected async delete<T>(path, config)                 │   │
│  │    protected async handleError(response)                    │   │
│  │    protected transformError(error)                          │   │
│  │    async checkHealth()                                      │   │
│  │  }                                                           │   │
│  └────────────────────┬───────────────────────────────────────┘   │
│                       │                                             │
│                       │ extends                                     │
│                       │                                             │
│  ┌────────────────────┴───────────────────────────────────────┐   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  clients/scoring-client.ts                        │      │   │
│  │  │  class ScoringClient extends BaseFastAPIClient   │      │   │
│  │  │    + getAlerts()                                  │      │   │
│  │  │    + getAnalytics()                              │      │   │
│  │  │    + getRecommendations()                        │      │   │
│  │  │    + triggerScoring()                            │      │   │
│  │  │    + getSchedules() / create / update / delete   │      │   │
│  │  │    + getJobs() / getJobStatus()                  │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  clients/donation-client.ts                       │      │   │
│  │  │  class DonationClient extends BaseFastAPIClient  │      │   │
│  │  │    + getRecipients()                              │      │   │
│  │  │    + createRecipient() / update / delete         │      │   │
│  │  │    + querySuitableItems()                        │      │   │
│  │  │    + recordDonation()                            │      │   │
│  │  │    + getDonationHistory()                        │      │   │
│  │  │    + getDonationImpact()                         │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  clients/scanning-client.ts                       │      │   │
│  │  │  class ScanningClient extends BaseFastAPIClient  │      │   │
│  │  │    + scanBarcode()                               │      │   │
│  │  │    + extractExpiry()                             │      │   │
│  │  │    + recognizeProduct()                          │      │   │
│  │  │    + getSessionStats()                           │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  clients/batch-client.ts                          │      │   │
│  │  │  class BatchClient extends BaseFastAPIClient     │      │   │
│  │  │    + createBatch()                               │      │   │
│  │  │    + createBatches() (bulk)                      │      │   │
│  │  │    + applyAction() / applyBulkActions()         │      │   │
│  │  │    + getActionHistory()                          │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  │                                                              │   │
│  │  ┌──────────────────────────────────────────────────┐      │   │
│  │  │  clients/csv-client.ts                            │      │   │
│  │  │  class CSVClient extends BaseFastAPIClient       │      │   │
│  │  │    + uploadCSV()                                 │      │   │
│  │  │    + checkDuplicates()                           │      │   │
│  │  │    + getProcessingStatus()                       │      │   │
│  │  │    + cancelProcessing()                          │      │   │
│  │  │    + getUploadHistory()                          │      │   │
│  │  └──────────────────────────────────────────────────┘      │   │
│  │                                                              │   │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                      index.ts                               │   │
│  │  • Export all clients                                       │   │
│  │  • Export all types                                         │   │
│  │  • Singleton instances                                      │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

## React Query Integration Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Component Usage                              │
│                                                                   │
│  function AlertsDashboard() {                                    │
│    const { data, isLoading } = useAlerts({ urgency: 'critical' })│
│    return <AlertsList alerts={data.alerts} />                   │
│  }                                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              lib/hooks/fastapi/use-scoring.ts                    │
│                                                                   │
│  export function useAlerts(options, config) {                    │
│    const storeId = useActiveStoreId()                           │
│                                                                   │
│    return useQuery({                                             │
│      queryKey: queryKeys.scoring.alerts(storeId, options),     │
│      queryFn: () => scoringClient.getAlerts(storeId, options), │
│      enabled: !!storeId,                                        │
│      staleTime: 30 * 1000,                                      │
│      refetchInterval: 60 * 1000,                                │
│    })                                                            │
│  }                                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│          lib/api/fastapi/clients/scoring-client.ts               │
│                                                                   │
│  class ScoringClient extends BaseFastAPIClient {                │
│    async getAlerts(storeId, options) {                          │
│      return this.get<AlertsResponse>(                           │
│        `/api/v1/scoring/alerts/${storeId}`,                    │
│        options                                                   │
│      )                                                           │
│    }                                                             │
│  }                                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ uses
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           lib/api/fastapi/core/base-client.ts                    │
│                                                                   │
│  protected async get<T>(path, params, config) {                 │
│    const url = new URL(`${this.baseUrl}${path}`)               │
│    const headers = await this.getAuthHeaders(config)           │
│                                                                   │
│    const response = await fetch(url, {                          │
│      method: 'GET',                                              │
│      headers,                                                    │
│      signal: controller.signal,                                 │
│    })                                                            │
│                                                                   │
│    if (!response.ok) await this.handleError(response)          │
│    return await response.json()                                 │
│  }                                                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP GET
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FastAPI Backend                                 │
│                                                                   │
│  @router.get("/alerts/{store_id}")                              │
│  async def get_alerts(store_id: str, ...)                       │
│    # Process request                                             │
│    return AlertsResponse(...)                                    │
└─────────────────────────────────────────────────────────────────┘
```

## State Management Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Component Tree                              │
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │ Dashboard   │    │ Donation    │    │ Mobile      │        │
│  │ Component   │    │ Wizard      │    │ Scanner     │        │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘        │
│         │                  │                   │                 │
│         ├──────────────────┼───────────────────┤                 │
│         │                  │                   │                 │
└─────────┼──────────────────┼───────────────────┼─────────────────┘
          │                  │                   │
          │                  │                   │
    ┌─────▼──────┐    ┌──────▼─────┐    ┌──────▼─────┐
    │  React     │    │  Zustand   │    │  Zustand   │
    │  Query     │    │  Donation  │    │  Scanning  │
    │  Cache     │    │  Store     │    │  Store     │
    └────────────┘    └────────────┘    └────────────┘
         │                  │                  │
         │                  │                  │
         │ Server State     │ UI State         │ UI State
         │                  │                  │
         ▼                  ▼                  ▼
    ┌─────────────────────────────────────────────────┐
    │  • Alerts            │ • currentStep            │
    │  • Recipients        │ • selectedRecipient      │
    │  • Analytics         │ • selectedItems          │
    │  • Batch history     │ • scheduledPickup        │
    │                      │                          │
    │  Auto-cached         │ Ephemeral                │
    │  Background sync     │ Reset on navigation      │
    └─────────────────────────────────────────────────┘
```

## Donation Workflow State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│             Donation Workflow (Zustand Store)                     │
│                                                                    │
│  ┌────────────────┐                                              │
│  │ select-recipient│                                              │
│  │                │  selectRecipient()                           │
│  │  [Choose who   │ ─────────────┐                              │
│  │   to donate to]│               │                              │
│  └────────────────┘               │                              │
│                                    │                              │
│                                    ▼                              │
│                          ┌────────────────┐                      │
│                          │ select-items   │                      │
│                          │                │                      │
│                          │ [Choose what   │                      │
│                          │  to donate]    │                      │
│                          └────────┬───────┘                      │
│                                   │                              │
│                                   │ addItem()                    │
│                                   │ removeItem()                 │
│                                   │                              │
│                                   ▼                              │
│                          ┌────────────────┐                      │
│                          │schedule-pickup │                      │
│                          │                │                      │
│                          │ [Set pickup    │                      │
│                          │  date/time]    │                      │
│                          └────────┬───────┘                      │
│                                   │                              │
│                                   │ setScheduledPickup()         │
│                                   │                              │
│                                   ▼                              │
│                          ┌────────────────┐                      │
│                          │ confirmation   │                      │
│                          │                │                      │
│                          │ [Review and    │ ─── completeWorkflow()│
│                          │  confirm]      │                      │
│                          └────────┬───────┘                      │
│                                   │                              │
│                                   │ recordDonation() (mutation)  │
│                                   │                              │
│                                   ▼                              │
│                          ┌────────────────┐                      │
│                          │   complete     │                      │
│                          │                │                      │
│                          │ [Success!]     │                      │
│                          └────────────────┘                      │
│                                                                    │
│  State:                                                           │
│    • selectedRecipient: DonationRecipient | null                 │
│    • selectedItems: Array<{item, quantity}>                      │
│    • scheduledPickup?: string                                    │
│    • notes?: string                                              │
│    • isProcessing: boolean                                       │
│    • error: string | null                                        │
│                                                                    │
│  Actions:                                                         │
│    • selectRecipient() / addItem() / removeItem()               │
│    • setScheduledPickup() / setNotes()                          │
│    • completeWorkflow() / resetWorkflow()                       │
│    • canProceed(): boolean                                       │
└──────────────────────────────────────────────────────────────────┘
```

## Data Flow Example: Recording a Donation

```
┌─────────────────────────────────────────────────────────────────┐
│  1. User clicks "Confirm Donation" in DonationWizard component  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Component calls mutation                                     │
│     const { recordDonation } = useDonationActions()            │
│     recordDonation({ batch_id, recipient_id, quantity, ... })  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. React Query mutation starts                                  │
│     • onMutate: Optimistically update UI (remove from list)     │
│     • Calls donationClient.recordDonation()                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. DonationClient makes HTTP request                            │
│     POST /api/v1/donations/actions/{store_id}                   │
│     Headers: { Authorization: Bearer <token> }                  │
│     Body: { batch_id, recipient_id, quantity, ... }            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. FastAPI backend processes request                            │
│     • Validates auth token                                       │
│     • Validates data                                            │
│     • Updates database                                          │
│     • Returns: DonationAction { action_id, ... }                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. React Query mutation completes                               │
│     • onSuccess: Invalidate related queries                     │
│       - suitableItems (remove from list)                        │
│       - donationHistory (add to history)                        │
│       - donationImpact (update metrics)                         │
│       - batches (quantity changed)                              │
│     • Show success toast                                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. UI automatically updates                                     │
│     • All components using invalidated queries refetch          │
│     • Donation wizard moves to "complete" step                  │
│     • Dashboard metrics update                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Cache Invalidation Strategy

```
┌──────────────────────────────────────────────────────────────────┐
│                    Mutation Events                                │
│                                                                    │
│  ┌────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │ Record         │   │ Create         │   │ Update Batch   │  │
│  │ Donation       │   │ Recipient      │   │ Quantity       │  │
│  └────────┬───────┘   └────────┬───────┘   └────────┬───────┘  │
│           │                    │                    │            │
└───────────┼────────────────────┼────────────────────┼────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Query Invalidation                               │
│                                                                    │
│  Donation Recorded:             Recipient Created:                │
│  • suitableItems ✓             • recipients ✓                    │
│  • donationHistory ✓                                              │
│  • donationImpact ✓            Batch Updated:                    │
│  • batches.byStore ✓           • batches.byStore ✓              │
│  • batches.detail ✓            • batches.detail ✓               │
│  • alerts ✓                    • batches.todo ✓                  │
│  • analytics ✓                 • todos.filtered ✓                │
│                                 • alerts ✓                        │
│                                 • analytics ✓                     │
└──────────────────────────────────────────────────────────────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Automatic Refetching                             │
│                                                                    │
│  • Components using invalidated queries refetch automatically    │
│  • Stale data is replaced with fresh data                        │
│  • Loading states shown during refetch                           │
└──────────────────────────────────────────────────────────────────┘
```

## Mobile Scanning Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     Mobile Scanner Component                      │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Camera/Barcode Scanner                     │ │
│  │  • HTML5 getUserMedia API                                  │ │
│  │  • ZXing barcode detection                                 │ │
│  │  • Real-time video processing                              │ │
│  └────────────────────┬───────────────────────────────────────┘ │
│                       │                                          │
│                       │ onBarcodeDetected(barcode)              │
│                       ▼                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              Scanning Workflow Store (Zustand)             │ │
│  │  • currentStep: 'barcode' | 'product' | 'ocr' | ...       │ │
│  │  • scannedProduct: { barcode, productName, ... }          │ │
│  │  • expiryInfo: { extractedDate, confidence, ... }         │ │
│  │  • batchData: { quantity, costPrice, ... }                │ │
│  └────────────────────┬───────────────────────────────────────┘ │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        │ Step 1: Lookup product
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  scanningClient.scanBarcode(storeId, barcode)                    │
│  ───────────────────────────────────────────────────────────────│
│  FastAPI: GET /api/v1/mobile/barcode/{store_id}?barcode=...     │
│  Response: { product_found: true, product_data: {...} }         │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ Step 2: Extract expiry (OCR)
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  scanningClient.extractExpiry(storeId, imageBlob)                │
│  ───────────────────────────────────────────────────────────────│
│  FastAPI: POST /api/v1/ocr/scan/ocr-expiry/{store_id}           │
│  • Google Vision API integration                                 │
│  • Date extraction with confidence scoring                       │
│  Response: { expiry_date: "2025-10-15", confidence: 0.92 }      │
└───────────────────────┬──────────────────────────────────────────┘
                        │
                        │ Step 3: Create batch
                        ▼
┌──────────────────────────────────────────────────────────────────┐
│  batchClient.createBatch(storeId, batchData)                     │
│  ───────────────────────────────────────────────────────────────│
│  FastAPI: POST /api/v1/batches/create/{store_id}                │
│  • Validates product exists                                      │
│  • Creates batch record                                          │
│  • Triggers scoring (if enabled)                                 │
│  Response: { batch_id, status: "active", ... }                  │
└──────────────────────────────────────────────────────────────────┘
```

## Performance Optimization Patterns

```
┌──────────────────────────────────────────────────────────────────┐
│                    Performance Strategies                         │
│                                                                    │
│  1. Prefetching                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  When user hovers over "Alerts", prefetch analytics:       │ │
│  │  queryClient.prefetchQuery({                                │ │
│  │    queryKey: queryKeys.scoring.analytics(storeId, 30),     │ │
│  │    queryFn: () => scoringClient.getAnalytics(storeId, 30), │ │
│  │  })                                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  2. Debouncing                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Search input debounced (300ms):                            │ │
│  │  const debouncedSearch = useDebouncedValue(search, 300)    │ │
│  │  const { data } = useAlerts({ search: debouncedSearch })   │ │
│  │  // Reduces API calls from 10/sec to 3.3/sec              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  3. Pagination/Infinite Scroll                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useInfiniteQuery for large lists:                          │ │
│  │  const { data, hasNextPage, fetchNextPage } =              │ │
│  │    useInfiniteQuery({                                       │ │
│  │      queryKey: ['alerts'],                                  │ │
│  │      queryFn: ({ pageParam = 0 }) => fetchPage(pageParam), │ │
│  │      getNextPageParam: (lastPage) => lastPage.nextPage,    │ │
│  │    })                                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  4. Stale-While-Revalidate                                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Show cached data while fetching fresh data:                │ │
│  │  staleTime: 30 * 1000,        // Use cache for 30s         │ │
│  │  cacheTime: 5 * 60 * 1000,    // Keep in memory for 5min   │ │
│  │  refetchInterval: 60 * 1000,  // Background refresh 1min   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  5. Request Deduplication                                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React Query automatically deduplicates:                    │ │
│  │  • Multiple components using same query = 1 request         │ │
│  │  • Requests with same queryKey within 5ms = 1 request      │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                   Error Handling Layers                           │
│                                                                    │
│  Layer 1: Network/Fetch Errors                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  BaseFastAPIClient.transformError()                         │ │
│  │  • ECONNREFUSED → "Service unavailable"                     │ │
│  │  • AbortError → "Request timeout"                           │ │
│  │  • Network error → "Connectivity issue"                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│  Layer 2: HTTP Status Errors                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  BaseFastAPIClient.handleError()                            │ │
│  │  • 401 → "Authentication required"                          │ │
│  │  • 403 → "Permission denied"                                │ │
│  │  • 404 → "Resource not found"                               │ │
│  │  • 500 → "Server error"                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│  Layer 3: React Query Retry Logic                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  retry: (failureCount, error) => {                          │ │
│  │    if (isAuthError(error)) return false  // Don't retry     │ │
│  │    if (is4xxError(error)) return false   // Client error    │ │
│  │    return failureCount < 3               // Retry 3x        │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│  Layer 4: Component Error Handling                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  const { data, error, isError } = useAlerts()              │ │
│  │  if (isError) {                                             │ │
│  │    return <ErrorBoundary error={error} />                   │ │
│  │  }                                                           │ │
│  └────────────────────────────────────────────────────────────┘ │
│                           │                                       │
│                           ▼                                       │
│  Layer 5: User Feedback                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Toast notifications (sonner)                             │ │
│  │  • Error messages in UI                                     │ │
│  │  • Fallback content/empty states                            │ │
│  │  • Retry buttons                                            │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Type Safety Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Type Definitions                             │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Option 1: Manual Types (Current)                           │ │
│  │  ───────────────────────────────────────────────────────────│ │
│  │  // lib/api/fastapi/clients/scoring-client.ts              │ │
│  │  export interface Alert {                                   │ │
│  │    batch_id: string                                         │ │
│  │    sku: string                                              │ │
│  │    urgency_level: 'critical' | 'high' | 'medium' | 'low'  │ │
│  │    // ... other fields                                      │ │
│  │  }                                                           │ │
│  │                                                              │ │
│  │  Pros: Simple, no build step                                │ │
│  │  Cons: Can drift from backend                               │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Option 2: OpenAPI Generated (Future)                       │ │
│  │  ───────────────────────────────────────────────────────────│ │
│  │  // Generated from FastAPI /openapi.json                    │ │
│  │  import type { paths } from '@/lib/api/fastapi/generated'  │ │
│  │                                                              │ │
│  │  type AlertsResponse =                                      │ │
│  │    paths['/api/v1/scoring/alerts/{store_id}']['get']       │ │
│  │      ['responses']['200']['content']['application/json']    │ │
│  │                                                              │ │
│  │  Pros: Always in sync, automated                            │ │
│  │  Cons: Verbose types, requires build step                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Option 3: Zod Schemas (Recommended)                        │ │
│  │  ───────────────────────────────────────────────────────────│ │
│  │  import { z } from 'zod'                                    │ │
│  │                                                              │ │
│  │  const AlertSchema = z.object({                             │ │
│  │    batch_id: z.string().uuid(),                             │ │
│  │    sku: z.string().min(1),                                  │ │
│  │    urgency_level: z.enum(['critical', 'high', ...]),        │ │
│  │  })                                                          │ │
│  │                                                              │ │
│  │  // Infer TypeScript type                                   │ │
│  │  type Alert = z.infer<typeof AlertSchema>                   │ │
│  │                                                              │ │
│  │  // Runtime validation                                      │ │
│  │  const alert = AlertSchema.parse(data)                      │ │
│  │                                                              │ │
│  │  Pros: Type safety + runtime validation                     │ │
│  │  Cons: More code, but worth it                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                      Production Setup                             │
│                                                                    │
│  User Browser                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Next.js App (Vercel)                                       │ │
│  │  • Client-side React components                             │ │
│  │  • Server components (RSC)                                  │ │
│  │  • Edge middleware                                          │ │
│  └────────────┬───────────────────────────────────────────────┘ │
│               │                                                   │
│               │ HTTPS                                             │
│               ▼                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  FastAPI Backend (Cloud Run / Railway)                      │ │
│  │  • Python service                                            │ │
│  │  • Uvicorn ASGI server                                      │ │
│  │  • Auto-scaling                                              │ │
│  └────────────┬───────────────────────────────────────────────┘ │
│               │                                                   │
│               │                                                   │
│               ▼                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Supabase PostgreSQL                                         │ │
│  │  • Database                                                  │ │
│  │  • Real-time subscriptions                                  │ │
│  │  • Row Level Security                                       │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Monitoring & Analytics                                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  • Sentry (error tracking)                                  │ │
│  │  • Vercel Analytics (performance)                           │ │
│  │  • PostHog (user behavior)                                 │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

**For detailed implementation guides, see:**

- `FASTAPI_FRONTEND_INTEGRATION_STRATEGY.md` (Full documentation)
- `FASTAPI_INTEGRATION_SUMMARY.md` (Quick reference)
