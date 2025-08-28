# LIFO Application API Documentation

## Architecture Overview

The LIFO application uses a multi-layer API architecture:

**Frontend (React) → React Query → Next.js API Routes → Python FastAPI → Supabase Database**

This documentation covers both the Next.js API routes and how they integrate with the Python FastAPI backend for a complete picture of the system's data flow.

## API Layers

### Layer 1: React Query Hooks

React Query hooks in the frontend make requests to Next.js API routes. These hooks provide caching, automatic refetching, and optimistic updates.

### Layer 2: Next.js API Routes (This Document's Focus)

Next.js API routes act as a proxy layer, handling authentication, calling Python API endpoints when needed, and directly interfacing with Supabase for simpler operations.

### Layer 3: Python FastAPI Backend

The Python microservice (running on port 8001) handles AI scoring, OCR processing, and complex analytics. Next.js routes call these endpoints server-side.

### Layer 4: Supabase Database

The PostgreSQL database with Row Level Security, storing all inventory, user, and analytics data.

## Data Flow Example

When a user views actionable batches:

1. `useActionableBatches()` hook calls `/api/insights/actionable`
2. Next.js route authenticates user and calls Python API `/api/v1/analytics/store/{store_id}`
3. Python API calculates scores and returns actionable items
4. Next.js route transforms data and returns to frontend
5. React Query caches result and UI renders

## Next.js API Routes

### Alerts API

**Endpoint**: `/api/alerts`  
**Methods**: GET  
**Purpose**: Retrieves inventory alerts for items approaching expiry dates.  
**Status**: Currently disabled (returns 501)  
**Integration**: Will proxy to Python API `/api/v1/mobile/mobile-summary` for urgent alerts  
**Request Parameters**: storeId, threshold, urgencyLevel, category  
**Response**: Alert array with urgency levels, action suggestions, and summary statistics

### Analytics API

**Endpoint**: `/api/analytics`  
**Methods**: GET  
**Purpose**: Provides comprehensive store performance analytics.  
**Integration**: Proxies to Python API `/api/v1/analytics/store/{store_id}`  
**Request Parameters**: storeId, timeframe (1d/7d/30d/90d), metricType  
**Response**: Analytics object containing requested metrics  
**Key Functions**: Overview analytics, waste analytics, revenue analytics, category analytics

### Store Insights (To Be Implemented)

**Endpoint**: `/api/insights/store`  
**Methods**: GET  
**Purpose**: Get high-level store insights and KPIs.  
**Integration**: Will proxy to Python API `/api/v1/analytics/dashboard/{store_id}`  
**Request Parameters**: storeId  
**Response**: Store health score, summary statistics, category breakdowns

### Actionable Batches (To Be Implemented)

**Endpoint**: `/api/insights/actionable`  
**Methods**: GET  
**Purpose**: Get detailed list of batches requiring action.  
**Integration**: Will proxy to Python API with scoring calculations  
**Request Parameters**: storeId, limit, urgencyFilter  
**Response**: Array of batches with AI scores, recommendations, and urgency levels

### Batch Actions

**Endpoint**: `/api/actions/batch`  
**Methods**: POST  
**Purpose**: Record user actions on inventory batches.  
**Integration**: Writes to `batch_actions` table and updates inventory  
**Request Body**: batchId, action (discount/donate/dispose), recipientId, notes  
**Response**: Action confirmation, updated batch status

### PIN Session Authentication

**Endpoint**: `/api/auth/pin-session`  
**Methods**: POST, GET  
**Purpose**: Authenticates employees using PIN/username system.  
**Request Body**: username, pin  
**Response**: Session tokens, user information, authentication status

### Business Check

**Endpoint**: `/api/business/check`  
**Methods**: POST  
**Purpose**: Validates if a business already exists in the system.  
**Request Body**: name, address, city, postalCode, country  
**Response**: exists boolean, store data if found

### Contact Form

**Endpoint**: `/api/contact`  
**Methods**: POST  
**Purpose**: Handles contact form submissions.  
**Request Body**: name, email, subject, message  
**Response**: success status, messageId

### CSV Operations

#### Sample Download

**Endpoint**: `/api/csv/sample`  
**Methods**: GET  
**Purpose**: Generates sample CSV file for inventory uploads.  
**Response**: CSV file download with sample inventory data

#### CSV Upload

**Endpoint**: `/api/inventory/upload`  
**Methods**: POST  
**Purpose**: Bulk CSV inventory upload with optimized processing.  
**Integration**: After upload, calls Python API for scoring calculation  
**Request**: file (CSV), storeId, defaultExpiryDate (optional)  
**Response**: Processing results, performance metrics, errors array

### Email Services

#### PIN Reset Email

**Endpoint**: `/api/email/send-pin-reset`  
**Methods**: POST, GET  
**Purpose**: Sends PIN reset emails to employees.  
**Request Body**: credentials object, storeId  
**Response**: success status, messageId

#### Welcome Email

**Endpoint**: `/api/email/send-welcome`  
**Methods**: POST, GET  
**Purpose**: Sends welcome emails to new employees.  
**Request Body**: credentials object, storeId  
**Response**: success status, messageId

#### Unified Email Send

**Endpoint**: `/api/email/send`  
**Methods**: POST, GET  
**Purpose**: Unified email sending service.  
**Request Body**: type, credentials, store_id, delivery_id  
**Response**: success status, messageId, message

### Employee Management

**Endpoint**: `/api/employees/create`  
**Methods**: POST, GET  
**Purpose**: Creates new employee accounts with proper permissions.  
**Request Body**: firstName, lastName, email, username, role, storeId, pin  
**Response**: user_id, credentials, success status

### Inventory Management

#### Inventory Operations

**Endpoint**: `/api/inventory`  
**Methods**: GET, POST  
**Purpose**: Manages inventory data retrieval and updates.  
**Integration**: GET will call Python API for scored inventory data  
**GET Request**: storeId, page, limit, category, status  
**POST Request**: batchId, action, value, storeId  
**Response**: Inventory array with AI scores and recommendations

### Mobile Scanning (To Be Implemented)

#### Scan In

**Endpoint**: `/api/scan/in`  
**Methods**: POST  
**Purpose**: Register new inventory via scanning.  
**Integration**: Proxies to Python API `/api/v1/scan/scan-in/{store_id}`  
**Request Body**: productSku, barcode, expiryDate, quantity, prices  
**Response**: batchId, initial score, recommendations

#### Scan Out

**Endpoint**: `/api/scan/out`  
**Methods**: POST  
**Purpose**: Track inventory removal (sales, donations, disposal).  
**Integration**: Proxies to Python API `/api/v1/scan/scan-out/{store_id}/{batch_id}`  
**Request Body**: action, quantity, destination, notes  
**Response**: Transaction confirmation, updated scores

### OCR Processing (To Be Implemented)

#### OCR Scan

**Endpoint**: `/api/ocr/scan`  
**Methods**: POST  
**Purpose**: Process product images for data extraction.  
**Integration**: Proxies to Python API `/api/v1/ocr/scan/full-ocr/{store_id}`  
**Request**: image file, analysisType  
**Response**: Extracted barcode, expiry date, product name, confidence scores

### Onboarding

**Endpoint**: `/api/onboarding`  
**Methods**: POST  
**Purpose**: Handles store onboarding process.  
**Request Body**: userId, store object, user object  
**Response**: success status, storeId, storeCode, mode

### Score Recalculation

**Endpoint**: `/api/scores/recalculate`  
**Methods**: POST  
**Purpose**: Triggers AI scoring recalculation.  
**Integration**: Can use local TypeScript implementation or Python API  
**Request Body**: storeId, batchIds (optional)  
**Response**: Processing summary, batch scores, urgency statistics

### Store Management

**Endpoint**: `/api/stores`  
**Methods**: GET, POST  
**Purpose**: Manages store creation and retrieval.  
**GET Response**: stores array  
**POST Request**: store_name, store_code, store_type, address details  
**POST Response**: created store object, success message

## Python FastAPI Integration Points

The following Python API endpoints are available for integration through Next.js proxy routes:

### Mobile & Dashboard APIs

- `GET /api/v1/mobile/mobile-summary/{store_id}` - Fast mobile dashboard data
- `POST /api/v1/mobile/batch-quick-score/{batch_id}` - Real-time batch scoring
- `GET /api/v1/analytics/dashboard/{store_id}` - Dashboard overview data
- `GET /api/v1/analytics/store/{store_id}` - Comprehensive store analytics

### Scanning Workflow APIs

- `POST /api/v1/scan/scan-in/{store_id}` - Register new inventory
- `POST /api/v1/scan/scan-out/{store_id}/{batch_id}` - Track inventory removal

### OCR & Vision APIs

- `POST /api/v1/vision/analyze-image/{store_id}` - Advanced image analysis
- `POST /api/v1/ocr/scan/full-ocr/{store_id}` - Complete OCR analysis
- `POST /api/v1/ocr/scan/ocr-expiry/{store_id}` - Expiry date extraction
- `POST /api/v1/ocr/scan/text-extraction/{store_id}` - Text extraction for manual entry

### Scoring & Analytics APIs

- `POST /api/v1/scoring/calculate-score` - Calculate batch urgency score
- `GET /api/v1/csv/template` - Get CSV template
- `POST /api/v1/csv/upload` - Process CSV upload

## React Query Integration

### Hooks and Data Flow

#### Store Insights Hook

```typescript
useStoreInsights(storeId)
  → GET /api/insights/store
  → Python API /api/v1/analytics/dashboard/{store_id}
  → Returns: Store health metrics, summaries
```

#### Actionable Batches Hook

```typescript
useActionableBatches(storeId)
  → GET /api/insights/actionable
  → Python API (scoring calculations)
  → Returns: Batches with AI scores and recommendations
```

#### Donation Action Mutation

```typescript
useDonationAction()
  → POST /api/actions/batch
  → Updates batch_actions table
  → Invalidates: storeInsights, donations, batches queries
  → UI automatically updates counts
```

### Cache Configuration

- Store Insights: 2 minute stale time (changes frequently)
- Actionable Batches: 1 minute stale time (very dynamic)
- Donation Recipients: 5 minute stale time (rarely changes)
- Auto-refetch on window focus for all queries
- Background refetching every 2-5 minutes for dashboard data

### Query Invalidation Flow

After any mutation (discount applied, donation made, etc.):

1. Mutation succeeds
2. Relevant queries are invalidated
3. React Query automatically refetches
4. UI updates without manual state management

## Notification System Flow

### Daily Summary

Data flow: Python API calculates daily metrics → Next.js API fetches and caches → Frontend displays summary card

### Expiring Soon

Data flow: Database view filters expiring items → Python API adds urgency scores → Next.js API transforms data → UI shows alert badges

### Recently Expired

Data flow: Direct database query for expired items → Next.js API formats response → UI displays critical alerts

### Ready for Discount

Data flow: Python scoring algorithm identifies candidates → Next.js API fetches list → UI shows action buttons → User clicks discount → Mutation updates database → Queries invalidated → Count updates automatically

### Perfect for Donation

Data flow: AI scoring identifies donation candidates → Next.js API includes recipient list → UI shows donation dialog → User selects recipient → Action recorded in batch_actions → Analytics updated

### Action History

Data flow: batch_actions table stores all actions → Next.js API queries with date range → UI displays timeline of actions with effectiveness scores

## Authentication Flow

All API routes follow this authentication pattern:

1. Frontend includes Supabase JWT in request headers
2. Next.js API route validates JWT
3. Next.js API uses service role key for Python API calls
4. Python API validates service role authentication
5. Database RLS policies enforce final access control

## Error Handling

Consistent error handling across all layers:

- Frontend: Toast notifications for user-facing errors
- Next.js API: Structured error responses with status codes
- Python API: Detailed error messages with error_id for tracking
- Database: Constraint violations returned as readable messages

## Performance Optimizations

### Caching Strategy

- Next.js API implements response caching for slow-changing data
- React Query provides client-side caching with smart invalidation
- Python API uses Redis for expensive calculations
- Database uses materialized views for complex aggregations

### Batch Processing

- CSV uploads processed in chunks
- Bulk scoring calculations batched for efficiency
- Action recordings use bulk inserts

### Real-time Updates

- Optimistic updates in React Query for instant UI feedback
- Background refetching for dashboard metrics
- WebSocket support planned for live inventory updates

## Security Considerations

### API Key Management

- Python API URL and keys stored in environment variables
- Service role key never exposed to frontend
- JWT tokens validated at each layer

### Data Validation

- Input validation in Next.js routes
- Additional validation in Python API
- Database constraints as final validation layer

### Rate Limiting

- Next.js API implements rate limiting per user
- Python API has separate rate limits by endpoint category
- Database connection pooling prevents overload
