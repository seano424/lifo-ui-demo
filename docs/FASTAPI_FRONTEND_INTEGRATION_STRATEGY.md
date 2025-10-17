# FastAPI Frontend Integration Strategy

**Version:** 1.0
**Date:** 2025-10-06
**Status:** Design Document

## Executive Summary

This document outlines the comprehensive frontend integration strategy for connecting the Next.js 15 frontend with the 26+ FastAPI endpoints. The strategy builds on existing patterns while introducing domain-specific organization and type-safe abstractions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Client Architecture](#client-architecture)
3. [Type Safety Strategy](#type-safety-strategy)
4. [React Query Integration](#react-query-integration)
5. [State Management](#state-management)
6. [Component Integration Patterns](#component-integration-patterns)
7. [Developer Experience](#developer-experience)
8. [Progressive Enhancement](#progressive-enhancement)
9. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Architecture Overview

### Current State Analysis

**Existing FastAPIClient (lib/services/fastapi-client.ts):**
- 866 lines covering 4 endpoint categories
- Basic patterns: alerts, analytics, dashboard, recommendations
- Supports both JWT tokens and service role keys
- Performance monitoring and timeout handling

**Missing Integrations:**
- Donations API (3 files: donations, donation_queries, compat_donation_wrapper)
- Automated Scoring (scheduling, job tracking)
- Mobile/Scanning (barcode, OCR, product recognition)
- Batch Operations (bulk creation, batch actions)
- CSV Operations (upload, duplicate detection)

**Existing Patterns:**
- Zustand stores for local UI state (scanning workflow, store context)
- React Query for server state (batches, products, todos)
- Domain-specific clients (OCR client)
- SSR-safe patterns with client-only hooks

### Proposed Architecture

```
lib/
├── api/
│   ├── fastapi/
│   │   ├── core/
│   │   │   ├── base-client.ts          # Shared client infrastructure
│   │   │   ├── types.ts                # Shared types & interfaces
│   │   │   └── error-handling.ts       # Centralized error handling
│   │   ├── clients/
│   │   │   ├── scoring-client.ts       # Alerts, analytics, automated scoring
│   │   │   ├── donation-client.ts      # Donation queries & recipient management
│   │   │   ├── scanning-client.ts      # Barcode, OCR, product recognition
│   │   │   ├── batch-client.ts         # Batch operations (create, actions)
│   │   │   ├── csv-client.ts           # CSV upload & validation
│   │   │   └── analytics-client.ts     # Dashboard & multi-store analytics
│   │   └── index.ts                    # Unified exports
│   └── ocr-client.ts                   # Existing (unchanged)
├── hooks/
│   ├── fastapi/
│   │   ├── use-scoring.ts              # Scoring hooks
│   │   ├── use-donations.ts            # Donation hooks
│   │   ├── use-scanning.ts             # Scanning hooks
│   │   ├── use-batch-operations.ts     # Batch operation hooks
│   │   └── use-csv-operations.ts       # CSV hooks
│   └── [existing hooks remain]
├── stores/
│   ├── donation-store.ts               # Donation workflow state
│   ├── batch-operation-store.ts        # Batch operation UI state
│   └── [existing stores remain]
└── queries/
    └── query-keys.ts                   # Extended with FastAPI keys
```

**Key Design Principles:**

1. **Domain Separation**: Group related endpoints into domain-specific clients
2. **Backward Compatibility**: Keep existing `fastapi-client.ts` initially, migrate gradually
3. **Type Safety**: Generate types from OpenAPI schema where possible
4. **Consistency**: Follow existing patterns (hooks, stores, query keys)
5. **Performance**: Optimize for mobile (<300ms response targets)

---

## 2. Client Architecture

### 2.1 Base Client Infrastructure

**File: `lib/api/fastapi/core/base-client.ts`**

```typescript
/**
 * Base FastAPI Client
 * Provides shared infrastructure for all domain clients
 */

interface RequestConfig {
  timeout?: number
  retries?: number
  signal?: AbortSignal
}

interface AuthOptions {
  useServiceRole?: boolean
  customToken?: string
}

export class BaseFastAPIClient {
  protected baseUrl: string
  protected defaultTimeout: number = 10000

  constructor() {
    const baseUrl =
      process.env.FASTAPI_URL ||
      process.env.NEXT_PUBLIC_FASTAPI_URL ||
      'http://localhost:8000'

    // Enforce HTTPS in production
    if (
      process.env.NODE_ENV === 'production' &&
      baseUrl.startsWith('http://') &&
      !baseUrl.startsWith('http://localhost') &&
      !baseUrl.startsWith('http://127.0.0.1')
    ) {
      throw new Error('FastAPI client requires HTTPS in production environment')
    }

    this.baseUrl = baseUrl
  }

  /**
   * Get authentication headers with automatic token detection
   */
  protected async getAuthHeaders(options: AuthOptions = {}): Promise<Record<string, string>> {
    const { useServiceRole, customToken } = options

    // Custom token (for specific use cases)
    if (customToken) {
      return {
        Authorization: `Bearer ${customToken}`,
        'Content-Type': 'application/json',
      }
    }

    // Service role key (admin operations)
    if (useServiceRole) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      if (!serviceKey) {
        throw new Error('Service role key not configured')
      }
      return {
        apikey: serviceKey,
        'Content-Type': 'application/json',
      }
    }

    // Default: User JWT token (client-side)
    if (typeof window !== 'undefined') {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session?.access_token) {
        throw new Error('Not authenticated - please log in')
      }

      return {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      }
    }

    // Server-side: Get from cookies
    const { createServerClient } = await import('@/lib/supabase/server')
    const supabase = createServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session?.access_token) {
      throw new Error('Not authenticated')
    }

    return {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Make authenticated GET request
   */
  protected async get<T>(
    path: string,
    params?: Record<string, string | number | boolean>,
    config: RequestConfig & AuthOptions = {},
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value))
        }
      })
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || this.defaultTimeout,
    )

    try {
      const headers = await this.getAuthHeaders(config)

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
        signal: config.signal || controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.transformError(error)
    }
  }

  /**
   * Make authenticated POST request
   */
  protected async post<T>(
    path: string,
    body?: unknown,
    config: RequestConfig & AuthOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || this.defaultTimeout,
    )

    try {
      const headers = await this.getAuthHeaders(config)

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: config.signal || controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.transformError(error)
    }
  }

  /**
   * Make authenticated PUT request
   */
  protected async put<T>(
    path: string,
    body?: unknown,
    config: RequestConfig & AuthOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || this.defaultTimeout,
    )

    try {
      const headers = await this.getAuthHeaders(config)

      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: config.signal || controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.transformError(error)
    }
  }

  /**
   * Make authenticated DELETE request
   */
  protected async delete<T>(
    path: string,
    config: RequestConfig & AuthOptions = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      config.timeout || this.defaultTimeout,
    )

    try {
      const headers = await this.getAuthHeaders(config)

      const response = await fetch(url, {
        method: 'DELETE',
        headers,
        signal: config.signal || controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        await this.handleError(response)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.transformError(error)
    }
  }

  /**
   * Handle HTTP errors with detailed messages
   */
  protected async handleError(response: Response): Promise<never> {
    let errorDetails = ''
    try {
      const errorData = await response.json()
      errorDetails = JSON.stringify(errorData)
    } catch {
      errorDetails = await response.text()
    }

    throw new Error(
      `FastAPI request failed: ${response.status} ${response.statusText} - ${errorDetails}`,
    )
  }

  /**
   * Transform errors into consistent format
   */
  protected transformError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error(`Request timeout after ${this.defaultTimeout}ms`)
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return new Error('FastAPI service unavailable')
      }
      if (error.message.includes('fetch failed')) {
        return new Error('Network connectivity issue')
      }
      return error
    }
    return new Error('Unknown error occurred')
  }

  /**
   * Check backend health
   */
  async checkHealth(): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return { healthy: true, responseTime }
      }

      return {
        healthy: false,
        responseTime,
        error: `HTTP ${response.status} ${response.statusText}`,
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { healthy: false, responseTime, error: errorMessage }
    }
  }
}
```

### 2.2 Domain-Specific Clients

#### Scoring Client

**File: `lib/api/fastapi/clients/scoring-client.ts`**

```typescript
import { BaseFastAPIClient } from '../core/base-client'

/**
 * Types for Scoring API
 */
export interface Alert {
  batch_id: string
  sku: string
  product_name: string
  category: string
  quantity: number
  days_to_expiry: number
  urgency_score: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  potential_loss: number
  recommendation: string
  suggested_discount?: number
}

export interface AlertsResponse {
  store_id: string
  alerts: Alert[]
  total_count: number
  threshold: number
  generated_at: string
  ai_insights?: {
    urgent_items: number
    high_priority_items: number
    total_potential_savings: number
  }
}

export interface AnalyticsResponse {
  store_id: string
  period_days: number
  analytics: Record<string, unknown>
  ai_insights: Array<{
    type: string
    message: string
    recommendation: string
  }>
  summary: {
    total_items: number
    items_at_risk: number
    total_value: number
    risk_percentage: number
  }
}

export interface ScoringSchedule {
  schedule_id: string
  store_id: string
  cron_expression: string
  enabled: boolean
  last_run?: string
  next_run?: string
  created_at: string
}

export interface ScoringJob {
  job_id: string
  store_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  items_processed?: number
  error_message?: string
}

/**
 * Scoring Client
 * Handles alerts, analytics, and automated scoring
 */
export class ScoringClient extends BaseFastAPIClient {
  /**
   * Get store alerts with filtering
   */
  async getAlerts(
    storeId: string,
    options: {
      threshold?: number
      urgency?: string
      category?: string
      limit?: number
    } = {},
  ): Promise<AlertsResponse> {
    return this.get<AlertsResponse>(`/api/v1/scoring/alerts/${storeId}`, options)
  }

  /**
   * Get store analytics
   */
  async getAnalytics(storeId: string, days: number = 30): Promise<AnalyticsResponse> {
    return this.get<AnalyticsResponse>(`/api/v1/scoring/analytics/${storeId}`, { days })
  }

  /**
   * Get AI recommendations
   */
  async getRecommendations(
    storeId: string,
    options: {
      category?: string
      limit?: number
    } = {},
  ): Promise<{
    store_id: string
    recommendations: unknown[]
    total_count: number
  }> {
    return this.get(`/api/v1/scoring/recommendations/${storeId}`, options)
  }

  /**
   * Trigger immediate scoring for store
   */
  async triggerScoring(storeId: string): Promise<ScoringJob> {
    return this.post(`/api/v1/scoring/trigger/${storeId}`)
  }

  /**
   * Get scoring schedules for store
   */
  async getSchedules(storeId: string): Promise<ScoringSchedule[]> {
    return this.get(`/api/v1/scoring/schedules/${storeId}`)
  }

  /**
   * Create scoring schedule
   */
  async createSchedule(
    storeId: string,
    cronExpression: string,
  ): Promise<ScoringSchedule> {
    return this.post(`/api/v1/scoring/schedules/${storeId}`, {
      cron_expression: cronExpression,
    })
  }

  /**
   * Update scoring schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: {
      cron_expression?: string
      enabled?: boolean
    },
  ): Promise<ScoringSchedule> {
    return this.put(`/api/v1/scoring/schedules/${scheduleId}`, updates)
  }

  /**
   * Delete scoring schedule
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    return this.delete(`/api/v1/scoring/schedules/${scheduleId}`)
  }

  /**
   * Get scoring job status
   */
  async getJobStatus(jobId: string): Promise<ScoringJob> {
    return this.get(`/api/v1/scoring/jobs/${jobId}`)
  }

  /**
   * Get all scoring jobs for store
   */
  async getJobs(
    storeId: string,
    options: {
      status?: string
      limit?: number
    } = {},
  ): Promise<ScoringJob[]> {
    return this.get(`/api/v1/scoring/jobs/${storeId}`, options)
  }
}

// Singleton instance
export const scoringClient = new ScoringClient()
```

#### Donation Client

**File: `lib/api/fastapi/clients/donation-client.ts`**

```typescript
import { BaseFastAPIClient } from '../core/base-client'

/**
 * Types for Donation API
 */
export interface DonationRecipient {
  recipient_id: string
  store_id: string
  organization_name: string
  contact_name?: string
  contact_phone?: string
  contact_email?: string
  address?: string
  active: boolean
  preferred_categories?: string[]
  created_at: string
  updated_at: string
}

export interface DonationSuitableItem {
  batch_id: string
  product_name: string
  category: string
  quantity: number
  days_to_expiry: number
  expiry_date: string
  estimated_value: number
  location_code?: string
  is_suitable: boolean
  suitability_score: number
  reason?: string
}

export interface DonationAction {
  action_id: string
  batch_id: string
  recipient_id: string
  quantity: number
  estimated_value: number
  scheduled_pickup?: string
  completed_at?: string
  notes?: string
  created_at: string
}

/**
 * Donation Client
 * Handles donation recipients and suitable item queries
 */
export class DonationClient extends BaseFastAPIClient {
  /**
   * Get all donation recipients for store
   */
  async getRecipients(storeId: string): Promise<DonationRecipient[]> {
    return this.get(`/api/v1/donations/recipients/${storeId}`)
  }

  /**
   * Create donation recipient
   */
  async createRecipient(
    storeId: string,
    data: Omit<DonationRecipient, 'recipient_id' | 'store_id' | 'created_at' | 'updated_at'>,
  ): Promise<DonationRecipient> {
    return this.post(`/api/v1/donations/recipients/${storeId}`, data)
  }

  /**
   * Update donation recipient
   */
  async updateRecipient(
    recipientId: string,
    updates: Partial<Omit<DonationRecipient, 'recipient_id' | 'store_id' | 'created_at'>>,
  ): Promise<DonationRecipient> {
    return this.put(`/api/v1/donations/recipients/${recipientId}`, updates)
  }

  /**
   * Delete donation recipient
   */
  async deleteRecipient(recipientId: string): Promise<void> {
    return this.delete(`/api/v1/donations/recipients/${recipientId}`)
  }

  /**
   * Query suitable items for donation
   */
  async querySuitableItems(
    storeId: string,
    options: {
      min_days_to_expiry?: number
      max_days_to_expiry?: number
      categories?: string[]
      min_quantity?: number
      recipient_id?: string
    } = {},
  ): Promise<{
    store_id: string
    items: DonationSuitableItem[]
    total_count: number
    total_estimated_value: number
  }> {
    return this.get(`/api/v1/donations/suitable-items/${storeId}`, options)
  }

  /**
   * Record donation action
   */
  async recordDonation(
    storeId: string,
    data: {
      batch_id: string
      recipient_id: string
      quantity: number
      scheduled_pickup?: string
      notes?: string
    },
  ): Promise<DonationAction> {
    return this.post(`/api/v1/donations/actions/${storeId}`, data)
  }

  /**
   * Get donation history
   */
  async getDonationHistory(
    storeId: string,
    options: {
      start_date?: string
      end_date?: string
      recipient_id?: string
      limit?: number
    } = {},
  ): Promise<DonationAction[]> {
    return this.get(`/api/v1/donations/history/${storeId}`, options)
  }

  /**
   * Get donation impact metrics
   */
  async getDonationImpact(
    storeId: string,
    options: {
      start_date?: string
      end_date?: string
    } = {},
  ): Promise<{
    total_donations: number
    total_items: number
    total_value: number
    recipient_count: number
    categories_donated: string[]
  }> {
    return this.get(`/api/v1/donations/impact/${storeId}`, options)
  }
}

// Singleton instance
export const donationClient = new DonationClient()
```

#### Scanning Client

**File: `lib/api/fastapi/clients/scanning-client.ts`**

```typescript
import { BaseFastAPIClient } from '../core/base-client'

/**
 * Types for Scanning API
 */
export interface BarcodeResult {
  barcode: string
  format: string
  confidence: number
  product_found: boolean
  product_data?: {
    name: string
    brand?: string
    category?: string
    image_url?: string
  }
}

export interface OCRExpiryResult {
  success: boolean
  expiry_date?: string
  confidence_score: number
  raw_ocr_text: string
  processing_time_ms: number
}

export interface ProductRecognitionResult {
  product_id?: string
  product_name?: string
  category?: string
  confidence: number
  cached: boolean
  alternative_matches?: Array<{
    name: string
    confidence: number
  }>
}

/**
 * Scanning Client
 * Handles barcode scanning, OCR, and product recognition
 */
export class ScanningClient extends BaseFastAPIClient {
  /**
   * Scan barcode and lookup product
   */
  async scanBarcode(
    storeId: string,
    barcode: string,
  ): Promise<BarcodeResult> {
    return this.get(`/api/v1/mobile/barcode/${storeId}`, { barcode })
  }

  /**
   * Extract expiry date from image
   */
  async extractExpiry(
    storeId: string,
    imageBlob: Blob,
    options: {
      confidence_threshold?: number
      max_processing_time_ms?: number
    } = {},
  ): Promise<OCRExpiryResult> {
    // Use existing OCR client which already handles this
    // This is a wrapper for consistency
    const { extractExpiryDate } = await import('@/lib/api/ocr-client')
    const result = await extractExpiryDate(imageBlob, storeId, options)

    return {
      success: !!result.extractedDate,
      expiry_date: result.extractedDate,
      confidence_score: result.confidence || 0,
      raw_ocr_text: result.rawOcrText || '',
      processing_time_ms: result.processingTime || 0,
    }
  }

  /**
   * Recognize product from image
   */
  async recognizeProduct(
    storeId: string,
    imageBlob: Blob,
    options: {
      use_cache?: boolean
      confidence_threshold?: number
    } = {},
  ): Promise<ProductRecognitionResult> {
    const formData = new FormData()
    formData.append('image', imageBlob, 'product-image.jpg')

    if (options.use_cache !== undefined) {
      formData.append('use_cache', String(options.use_cache))
    }
    if (options.confidence_threshold) {
      formData.append('confidence_threshold', String(options.confidence_threshold))
    }

    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${this.baseUrl}/api/v1/mobile/recognize/${storeId}`,
      {
        method: 'POST',
        body: formData,
        headers: {
          ...headers,
          // Remove Content-Type to let browser set it with boundary
          'Content-Type': undefined as any,
        },
      },
    )

    if (!response.ok) {
      await this.handleError(response)
    }

    return response.json()
  }

  /**
   * Get scanning session statistics
   */
  async getSessionStats(
    storeId: string,
    sessionId: string,
  ): Promise<{
    session_id: string
    items_scanned: number
    ocr_requests: number
    barcode_scans: number
    average_scan_time_ms: number
    started_at: string
    last_activity: string
  }> {
    return this.get(`/api/v1/mobile/session/${storeId}/${sessionId}`)
  }
}

// Singleton instance
export const scanningClient = new ScanningClient()
```

#### Batch Operations Client

**File: `lib/api/fastapi/clients/batch-client.ts`**

```typescript
import { BaseFastAPIClient } from '../core/base-client'

/**
 * Types for Batch Operations API
 */
export interface BatchCreateRequest {
  product_id: string
  batch_number: string
  expiry_date: string
  quantity: number
  cost_price?: number
  selling_price?: number
  location_code?: string
  supplier_code?: string
  notes?: string
}

export interface BatchCreateResponse {
  batch_id: string
  product_id: string
  batch_number: string
  created_at: string
  status: 'active' | 'pending'
}

export interface BatchActionRequest {
  action_type: 'discount' | 'donate' | 'dispose'
  quantity: number
  notes?: string
  discount_percentage?: number
  recipient_id?: string
}

export interface BatchActionResponse {
  action_id: string
  batch_id: string
  action_type: string
  quantity: number
  completed_at: string
  status: 'completed' | 'pending'
}

export interface BulkBatchCreateRequest {
  batches: BatchCreateRequest[]
  skip_duplicates?: boolean
  validate_products?: boolean
}

export interface BulkBatchCreateResponse {
  total_submitted: number
  successful: number
  failed: number
  created_batches: BatchCreateResponse[]
  errors: Array<{
    index: number
    error: string
    data: BatchCreateRequest
  }>
}

/**
 * Batch Operations Client
 * Handles batch creation and actions (discount, donate, dispose)
 */
export class BatchClient extends BaseFastAPIClient {
  /**
   * Create single batch
   */
  async createBatch(
    storeId: string,
    data: BatchCreateRequest,
  ): Promise<BatchCreateResponse> {
    return this.post(`/api/v1/batches/create/${storeId}`, data)
  }

  /**
   * Create multiple batches (bulk operation)
   */
  async createBatches(
    storeId: string,
    data: BulkBatchCreateRequest,
  ): Promise<BulkBatchCreateResponse> {
    return this.post(`/api/v1/batches/bulk/${storeId}`, data, {
      timeout: 30000, // 30 second timeout for bulk operations
    })
  }

  /**
   * Apply action to batch (discount, donate, dispose)
   */
  async applyAction(
    storeId: string,
    batchId: string,
    action: BatchActionRequest,
  ): Promise<BatchActionResponse> {
    return this.post(`/api/v1/batches/${batchId}/action/${storeId}`, action)
  }

  /**
   * Apply bulk actions to multiple batches
   */
  async applyBulkActions(
    storeId: string,
    actions: Array<{
      batch_id: string
      action: BatchActionRequest
    }>,
  ): Promise<{
    total_submitted: number
    successful: number
    failed: number
    results: BatchActionResponse[]
    errors: Array<{
      batch_id: string
      error: string
    }>
  }> {
    return this.post(`/api/v1/batches/bulk-actions/${storeId}`, { actions }, {
      timeout: 30000,
    })
  }

  /**
   * Get batch action history
   */
  async getActionHistory(
    storeId: string,
    options: {
      batch_id?: string
      action_type?: string
      start_date?: string
      end_date?: string
      limit?: number
    } = {},
  ): Promise<BatchActionResponse[]> {
    return this.get(`/api/v1/batches/actions/${storeId}`, options)
  }
}

// Singleton instance
export const batchClient = new BatchClient()
```

#### CSV Operations Client

**File: `lib/api/fastapi/clients/csv-client.ts`**

```typescript
import { BaseFastAPIClient } from '../core/base-client'

/**
 * Types for CSV Operations API
 */
export interface CSVUploadResponse {
  upload_id: string
  filename: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicates_found: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  preview: Array<Record<string, unknown>>
  validation_errors?: Array<{
    row: number
    field: string
    error: string
  }>
}

export interface CSVDuplicateCheckResponse {
  has_duplicates: boolean
  duplicate_count: number
  duplicates: Array<{
    row_number: number
    field: string
    value: string
    existing_id?: string
  }>
}

export interface CSVProcessingStatus {
  upload_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  rows_processed: number
  rows_total: number
  items_created: number
  error_message?: string
  started_at: string
  completed_at?: string
}

/**
 * CSV Operations Client
 * Handles CSV upload, validation, and duplicate checking
 */
export class CSVClient extends BaseFastAPIClient {
  /**
   * Upload and validate CSV file
   */
  async uploadCSV(
    storeId: string,
    file: File,
    options: {
      skip_validation?: boolean
      check_duplicates?: boolean
      auto_process?: boolean
    } = {},
  ): Promise<CSVUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)

    if (options.skip_validation !== undefined) {
      formData.append('skip_validation', String(options.skip_validation))
    }
    if (options.check_duplicates !== undefined) {
      formData.append('check_duplicates', String(options.check_duplicates))
    }
    if (options.auto_process !== undefined) {
      formData.append('auto_process', String(options.auto_process))
    }

    const headers = await this.getAuthHeaders()
    const response = await fetch(
      `${this.baseUrl}/api/v1/csv/upload/${storeId}`,
      {
        method: 'POST',
        body: formData,
        headers: {
          ...headers,
          'Content-Type': undefined as any,
        },
      },
    )

    if (!response.ok) {
      await this.handleError(response)
    }

    return response.json()
  }

  /**
   * Check for duplicate entries in CSV data
   */
  async checkDuplicates(
    storeId: string,
    data: Array<Record<string, unknown>>,
    options: {
      fields?: string[]
      ignore_case?: boolean
    } = {},
  ): Promise<CSVDuplicateCheckResponse> {
    return this.post(`/api/v1/csv/duplicates/${storeId}`, {
      data,
      ...options,
    })
  }

  /**
   * Get CSV processing status
   */
  async getProcessingStatus(uploadId: string): Promise<CSVProcessingStatus> {
    return this.get(`/api/v1/csv/status/${uploadId}`)
  }

  /**
   * Cancel CSV processing
   */
  async cancelProcessing(uploadId: string): Promise<void> {
    return this.delete(`/api/v1/csv/cancel/${uploadId}`)
  }

  /**
   * Get CSV upload history
   */
  async getUploadHistory(
    storeId: string,
    options: {
      limit?: number
      status?: string
    } = {},
  ): Promise<CSVUploadResponse[]> {
    return this.get(`/api/v1/csv/history/${storeId}`, options)
  }
}

// Singleton instance
export const csvClient = new CSVClient()
```

### 2.3 Unified Exports

**File: `lib/api/fastapi/index.ts`**

```typescript
/**
 * Unified FastAPI Client Exports
 * Single entry point for all FastAPI integrations
 */

// Export clients
export { BaseFastAPIClient } from './core/base-client'
export { scoringClient, ScoringClient } from './clients/scoring-client'
export { donationClient, DonationClient } from './clients/donation-client'
export { scanningClient, ScanningClient } from './clients/scanning-client'
export { batchClient, BatchClient } from './clients/batch-client'
export { csvClient, CSVClient } from './clients/csv-client'

// Export types
export type {
  Alert,
  AlertsResponse,
  AnalyticsResponse,
  ScoringSchedule,
  ScoringJob,
} from './clients/scoring-client'

export type {
  DonationRecipient,
  DonationSuitableItem,
  DonationAction,
} from './clients/donation-client'

export type {
  BarcodeResult,
  OCRExpiryResult,
  ProductRecognitionResult,
} from './clients/scanning-client'

export type {
  BatchCreateRequest,
  BatchCreateResponse,
  BatchActionRequest,
  BatchActionResponse,
  BulkBatchCreateRequest,
  BulkBatchCreateResponse,
} from './clients/batch-client'

export type {
  CSVUploadResponse,
  CSVDuplicateCheckResponse,
  CSVProcessingStatus,
} from './clients/csv-client'

// Legacy compatibility - re-export old client
export { fastApiClient, FastAPIClient } from '@/lib/services/fastapi-client'
```

---

## 3. Type Safety Strategy

### 3.1 Manual Type Definitions (Current Approach)

Define types alongside clients based on FastAPI Pydantic models:

```typescript
// Example: Scoring types match backend models
export interface Alert {
  batch_id: string
  sku: string
  product_name: string
  category: string
  quantity: number
  days_to_expiry: number
  urgency_score: number
  urgency_level: 'critical' | 'high' | 'medium' | 'low'
  potential_loss: number
  recommendation: string
  suggested_discount?: number
}
```

**Pros:**
- Simple, no build tooling required
- Full control over types
- Works with existing setup

**Cons:**
- Manual maintenance required
- Can drift from backend

### 3.2 OpenAPI Type Generation (Future Enhancement)

Generate types from FastAPI's OpenAPI schema:

```bash
# Install openapi-typescript
npm install -D openapi-typescript

# Generate types from FastAPI
npx openapi-typescript http://localhost:8000/openapi.json -o lib/api/fastapi/generated/schema.ts
```

**Usage:**

```typescript
import type { paths } from '@/lib/api/fastapi/generated/schema'

type AlertsResponse = paths['/api/v1/scoring/alerts/{store_id}']['get']['responses']['200']['content']['application/json']
```

**Pros:**
- Always in sync with backend
- Automated with CI/CD
- Type-safe query parameters

**Cons:**
- Requires build step
- Generated types can be verbose
- Needs backend to be running

### 3.3 Zod Schema Validation (Recommended for Production)

Add runtime validation with Zod:

```typescript
import { z } from 'zod'

// Define schema
const AlertSchema = z.object({
  batch_id: z.string().uuid(),
  sku: z.string().min(1),
  product_name: z.string().min(1),
  category: z.string(),
  quantity: z.number().int().positive(),
  days_to_expiry: z.number().int(),
  urgency_score: z.number().min(0).max(1),
  urgency_level: z.enum(['critical', 'high', 'medium', 'low']),
  potential_loss: z.number().nonnegative(),
  recommendation: z.string(),
  suggested_discount: z.number().optional(),
})

// Infer TypeScript type
export type Alert = z.infer<typeof AlertSchema>

// Validate at runtime
export function parseAlert(data: unknown): Alert {
  return AlertSchema.parse(data)
}
```

**Benefits:**
- Type safety + runtime validation
- Catches API contract violations
- Self-documenting schemas
- Better error messages

---

## 4. React Query Integration

### 4.1 Query Keys Organization

**Extend: `lib/queries/query-keys.ts`**

```typescript
export const queryKeys = {
  // ... existing keys ...

  // FastAPI Scoring
  scoring: {
    all: ['fastapi', 'scoring'] as const,
    alerts: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.scoring.all, 'alerts', storeId, filters] as const,
    analytics: (storeId: string, days: number) =>
      [...queryKeys.scoring.all, 'analytics', storeId, days] as const,
    recommendations: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.scoring.all, 'recommendations', storeId, filters] as const,
    schedules: (storeId: string) =>
      [...queryKeys.scoring.all, 'schedules', storeId] as const,
    jobs: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.scoring.all, 'jobs', storeId, filters] as const,
    jobStatus: (jobId: string) =>
      [...queryKeys.scoring.all, 'job-status', jobId] as const,
  },

  // FastAPI Donations
  donations: {
    all: ['fastapi', 'donations'] as const,
    recipients: (storeId: string) =>
      [...queryKeys.donations.all, 'recipients', storeId] as const,
    suitableItems: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.donations.all, 'suitable-items', storeId, filters] as const,
    history: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.donations.all, 'history', storeId, filters] as const,
    impact: (storeId: string, dateRange?: { start: string; end: string }) =>
      [...queryKeys.donations.all, 'impact', storeId, dateRange] as const,
  },

  // FastAPI Scanning
  scanning: {
    all: ['fastapi', 'scanning'] as const,
    barcode: (storeId: string, barcode: string) =>
      [...queryKeys.scanning.all, 'barcode', storeId, barcode] as const,
    sessionStats: (storeId: string, sessionId: string) =>
      [...queryKeys.scanning.all, 'session-stats', storeId, sessionId] as const,
  },

  // FastAPI Batch Operations
  batchOperations: {
    all: ['fastapi', 'batch-operations'] as const,
    actionHistory: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.batchOperations.all, 'action-history', storeId, filters] as const,
  },

  // FastAPI CSV
  csvOperations: {
    all: ['fastapi', 'csv'] as const,
    uploadHistory: (storeId: string, filters?: Record<string, unknown>) =>
      [...queryKeys.csvOperations.all, 'upload-history', storeId, filters] as const,
    processingStatus: (uploadId: string) =>
      [...queryKeys.csvOperations.all, 'processing-status', uploadId] as const,
  },
}
```

### 4.2 React Query Hooks

#### Scoring Hooks

**File: `lib/hooks/fastapi/use-scoring.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scoringClient } from '@/lib/api/fastapi'
import type { AlertsResponse, AnalyticsResponse, ScoringSchedule, ScoringJob } from '@/lib/api/fastapi'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { toast } from 'sonner'

/**
 * Get store alerts with filtering
 */
export function useAlerts(
  options: {
    threshold?: number
    urgency?: string
    category?: string
    limit?: number
  } = {},
  config?: {
    enabled?: boolean
    refetchInterval?: number
  },
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
    refetchInterval: config?.refetchInterval || 60 * 1000, // 1 minute default
    retry: (failureCount, error: Error) => {
      if (error.message.includes('No active store')) return false
      return failureCount < 3
    },
  })
}

/**
 * Get store analytics
 */
export function useAnalytics(
  days: number = 30,
  config?: {
    enabled?: boolean
  },
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.analytics(storeId || '', days),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getAnalytics(storeId, days)
    },
    enabled: !!storeId && (config?.enabled ?? true),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: Error) => {
      if (error.message.includes('No active store')) return false
      return failureCount < 3
    },
  })
}

/**
 * Get AI recommendations
 */
export function useRecommendations(
  options: {
    category?: string
    limit?: number
  } = {},
  config?: {
    enabled?: boolean
  },
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.recommendations(storeId || '', options),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getRecommendations(storeId, options)
    },
    enabled: !!storeId && (config?.enabled ?? true),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get scoring schedules
 */
export function useScoringSchedules() {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.schedules(storeId || ''),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getSchedules(storeId)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get scoring jobs
 */
export function useScoringJobs(
  options: {
    status?: string
    limit?: number
  } = {},
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.jobs(storeId || '', options),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getJobs(storeId, options)
    },
    enabled: !!storeId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refresh every 30s for job status
  })
}

/**
 * Get specific job status
 */
export function useScoringJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: queryKeys.scoring.jobStatus(jobId || ''),
    queryFn: () => {
      if (!jobId) throw new Error('No job ID provided')
      return scoringClient.getJobStatus(jobId)
    },
    enabled: !!jobId,
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 5 * 1000, // Refresh every 5s while job is running
  })
}

/**
 * Scoring Actions (Mutations)
 */
export function useScoringActions() {
  const queryClient = useQueryClient()
  const storeId = useActiveStoreId()

  const triggerScoring = useMutation({
    mutationFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.triggerScoring(storeId)
    },
    onSuccess: (job) => {
      toast.success('Scoring job started', {
        description: `Job ID: ${job.job_id}`,
      })
      // Invalidate jobs list
      queryClient.invalidateQueries({
        queryKey: queryKeys.scoring.jobs(storeId || '', {}),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to trigger scoring', {
        description: error.message,
      })
    },
  })

  const createSchedule = useMutation({
    mutationFn: (cronExpression: string) => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.createSchedule(storeId, cronExpression)
    },
    onSuccess: () => {
      toast.success('Schedule created successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.scoring.schedules(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to create schedule', {
        description: error.message,
      })
    },
  })

  const updateSchedule = useMutation({
    mutationFn: ({
      scheduleId,
      updates,
    }: {
      scheduleId: string
      updates: {
        cron_expression?: string
        enabled?: boolean
      }
    }) => scoringClient.updateSchedule(scheduleId, updates),
    onSuccess: () => {
      toast.success('Schedule updated successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.scoring.schedules(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update schedule', {
        description: error.message,
      })
    },
  })

  const deleteSchedule = useMutation({
    mutationFn: (scheduleId: string) => scoringClient.deleteSchedule(scheduleId),
    onSuccess: () => {
      toast.success('Schedule deleted successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.scoring.schedules(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to delete schedule', {
        description: error.message,
      })
    },
  })

  return {
    triggerScoring: triggerScoring.mutate,
    createSchedule: createSchedule.mutate,
    updateSchedule: updateSchedule.mutate,
    deleteSchedule: deleteSchedule.mutate,
    isTriggeringScoring: triggerScoring.isPending,
    isCreatingSchedule: createSchedule.isPending,
    isUpdatingSchedule: updateSchedule.isPending,
    isDeletingSchedule: deleteSchedule.isPending,
  }
}
```

#### Donation Hooks

**File: `lib/hooks/fastapi/use-donations.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { donationClient } from '@/lib/api/fastapi'
import type { DonationRecipient, DonationAction } from '@/lib/api/fastapi'
import { queryKeys } from '@/lib/queries/query-keys'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { toast } from 'sonner'

/**
 * Get donation recipients for store
 */
export function useDonationRecipients() {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.donations.recipients(storeId || ''),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.getRecipients(storeId)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get suitable items for donation
 */
export function useSuitableDonationItems(
  options: {
    min_days_to_expiry?: number
    max_days_to_expiry?: number
    categories?: string[]
    min_quantity?: number
    recipient_id?: string
  } = {},
  config?: {
    enabled?: boolean
  },
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.donations.suitableItems(storeId || '', options),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.querySuitableItems(storeId, options)
    },
    enabled: !!storeId && (config?.enabled ?? true),
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Get donation history
 */
export function useDonationHistory(
  options: {
    start_date?: string
    end_date?: string
    recipient_id?: string
    limit?: number
  } = {},
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.donations.history(storeId || '', options),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.getDonationHistory(storeId, options)
    },
    enabled: !!storeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get donation impact metrics
 */
export function useDonationImpact(
  options: {
    start_date?: string
    end_date?: string
  } = {},
) {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.donations.impact(
      storeId || '',
      options.start_date && options.end_date
        ? { start: options.start_date, end: options.end_date }
        : undefined,
    ),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.getDonationImpact(storeId, options)
    },
    enabled: !!storeId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })
}

/**
 * Donation Actions (Mutations)
 */
export function useDonationActions() {
  const queryClient = useQueryClient()
  const storeId = useActiveStoreId()

  const createRecipient = useMutation({
    mutationFn: (data: Omit<DonationRecipient, 'recipient_id' | 'store_id' | 'created_at' | 'updated_at'>) => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.createRecipient(storeId, data)
    },
    onSuccess: () => {
      toast.success('Recipient created successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.recipients(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to create recipient', {
        description: error.message,
      })
    },
  })

  const updateRecipient = useMutation({
    mutationFn: ({
      recipientId,
      updates,
    }: {
      recipientId: string
      updates: Partial<Omit<DonationRecipient, 'recipient_id' | 'store_id' | 'created_at'>>
    }) => donationClient.updateRecipient(recipientId, updates),
    onSuccess: () => {
      toast.success('Recipient updated successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.recipients(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to update recipient', {
        description: error.message,
      })
    },
  })

  const deleteRecipient = useMutation({
    mutationFn: (recipientId: string) => donationClient.deleteRecipient(recipientId),
    onSuccess: () => {
      toast.success('Recipient deleted successfully')
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.recipients(storeId || ''),
      })
    },
    onError: (error: Error) => {
      toast.error('Failed to delete recipient', {
        description: error.message,
      })
    },
  })

  const recordDonation = useMutation({
    mutationFn: (data: {
      batch_id: string
      recipient_id: string
      quantity: number
      scheduled_pickup?: string
      notes?: string
    }) => {
      if (!storeId) throw new Error('No active store selected')
      return donationClient.recordDonation(storeId, data)
    },
    onMutate: async (data) => {
      // Optimistic update: Remove from suitable items
      await queryClient.cancelQueries({
        queryKey: queryKeys.donations.suitableItems(storeId || '', {}),
      })

      const previousItems = queryClient.getQueryData(
        queryKeys.donations.suitableItems(storeId || '', {}),
      )

      queryClient.setQueryData(
        queryKeys.donations.suitableItems(storeId || '', {}),
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            items: old.items?.filter((item: any) => item.batch_id !== data.batch_id),
            total_count: (old.total_count || 0) - 1,
          }
        },
      )

      return { previousItems }
    },
    onSuccess: () => {
      toast.success('Donation recorded successfully')
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.suitableItems(storeId || '', {}),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.history(storeId || '', {}),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.donations.impact(storeId || ''),
      })
      // Also invalidate batch queries since quantity changed
      queryClient.invalidateQueries({
        queryKey: queryKeys.batches.byStore(storeId || ''),
      })
    },
    onError: (error: Error, _variables, context) => {
      // Rollback optimistic update
      if (context?.previousItems) {
        queryClient.setQueryData(
          queryKeys.donations.suitableItems(storeId || '', {}),
          context.previousItems,
        )
      }
      toast.error('Failed to record donation', {
        description: error.message,
      })
    },
  })

  return {
    createRecipient: createRecipient.mutate,
    updateRecipient: updateRecipient.mutate,
    deleteRecipient: deleteRecipient.mutate,
    recordDonation: recordDonation.mutate,
    isCreatingRecipient: createRecipient.isPending,
    isUpdatingRecipient: updateRecipient.isPending,
    isDeletingRecipient: deleteRecipient.isPending,
    isRecordingDonation: recordDonation.isPending,
  }
}
```

### 4.3 Cache Invalidation Strategy

```typescript
/**
 * Cache invalidation patterns for FastAPI data
 */

// Pattern 1: Invalidate after mutations
queryClient.invalidateQueries({
  queryKey: queryKeys.scoring.alerts(storeId, {}),
})

// Pattern 2: Prefetch related data
queryClient.prefetchQuery({
  queryKey: queryKeys.donations.suitableItems(storeId, {}),
  queryFn: () => donationClient.querySuitableItems(storeId),
  staleTime: 2 * 60 * 1000,
})

// Pattern 3: Optimistic updates (donations example above)
// Update cache immediately, rollback on error

// Pattern 4: Background refetching
const { data } = useAlerts({}, {
  refetchInterval: 60 * 1000, // Refresh every minute
  refetchIntervalInBackground: false, // Only when tab is active
})

// Pattern 5: Dependent queries
const { data: recipients } = useDonationRecipients()
const { data: suitableItems } = useSuitableDonationItems(
  { recipient_id: recipients?.[0]?.recipient_id },
  { enabled: !!recipients?.[0]?.recipient_id },
)
```

---

## 5. State Management

### 5.1 State Allocation Strategy

**React Query (Server State):**
- Alerts, analytics, recommendations
- Donation recipients, suitable items, history
- Scoring schedules and job status
- CSV upload history and processing status
- Batch action history

**Zustand (Client/UI State):**
- Donation workflow steps
- Batch operation selections
- CSV upload progress UI
- Filter preferences
- Expanded/collapsed sections

### 5.2 Donation Workflow Store

**File: `lib/stores/donation-workflow-store.ts`**

```typescript
import { create } from 'zustand'
import { devtools, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import type { DonationRecipient, DonationSuitableItem } from '@/lib/api/fastapi'

export type DonationStep =
  | 'select-recipient' // Choose donation recipient
  | 'select-items' // Choose items to donate
  | 'schedule-pickup' // Schedule pickup time
  | 'confirmation' // Review and confirm
  | 'complete' // Success state

export interface DonationWorkflowState {
  // Current state
  currentStep: DonationStep
  storeId: string | null

  // Selected data
  selectedRecipient: DonationRecipient | null
  selectedItems: Array<{
    item: DonationSuitableItem
    quantity: number
  }>
  scheduledPickup?: string
  notes?: string

  // UI state
  isProcessing: boolean
  error: string | null

  // Actions
  setStoreId: (storeId: string) => void
  setCurrentStep: (step: DonationStep) => void
  selectRecipient: (recipient: DonationRecipient) => void
  addItem: (item: DonationSuitableItem, quantity: number) => void
  removeItem: (batchId: string) => void
  updateItemQuantity: (batchId: string, quantity: number) => void
  setScheduledPickup: (date: string) => void
  setNotes: (notes: string) => void
  completeWorkflow: () => void
  resetWorkflow: () => void
  setError: (error: string | null) => void
  canProceed: () => boolean
}

const initialState = {
  currentStep: 'select-recipient' as DonationStep,
  storeId: null,
  selectedRecipient: null,
  selectedItems: [],
  scheduledPickup: undefined,
  notes: undefined,
  isProcessing: false,
  error: null,
}

export const useDonationWorkflowStore = create<DonationWorkflowState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        setStoreId: (storeId: string) =>
          set(state => {
            state.storeId = storeId
          }),

        setCurrentStep: (step: DonationStep) =>
          set(state => {
            state.currentStep = step
            state.error = null
          }),

        selectRecipient: (recipient: DonationRecipient) =>
          set(state => {
            state.selectedRecipient = recipient
            state.currentStep = 'select-items'
          }),

        addItem: (item: DonationSuitableItem, quantity: number) =>
          set(state => {
            const existingIndex = state.selectedItems.findIndex(
              si => si.item.batch_id === item.batch_id,
            )

            if (existingIndex >= 0) {
              state.selectedItems[existingIndex].quantity = quantity
            } else {
              state.selectedItems.push({ item, quantity })
            }
          }),

        removeItem: (batchId: string) =>
          set(state => {
            state.selectedItems = state.selectedItems.filter(
              si => si.item.batch_id !== batchId,
            )
          }),

        updateItemQuantity: (batchId: string, quantity: number) =>
          set(state => {
            const item = state.selectedItems.find(si => si.item.batch_id === batchId)
            if (item) {
              item.quantity = quantity
            }
          }),

        setScheduledPickup: (date: string) =>
          set(state => {
            state.scheduledPickup = date
          }),

        setNotes: (notes: string) =>
          set(state => {
            state.notes = notes
          }),

        completeWorkflow: () =>
          set(state => {
            state.currentStep = 'complete'
            state.isProcessing = false
          }),

        resetWorkflow: () => set(initialState),

        setError: (error: string | null) =>
          set(state => {
            state.error = error
            state.isProcessing = false
          }),

        canProceed: () => {
          const state = get()
          switch (state.currentStep) {
            case 'select-recipient':
              return !!state.selectedRecipient
            case 'select-items':
              return state.selectedItems.length > 0
            case 'schedule-pickup':
              return true // Optional step
            case 'confirmation':
              return true
            default:
              return false
          }
        },
      })),
    ),
  ),
)

// SSR-safe hooks (following scanning-workflow-store pattern)
// ... implement similar to scanning workflow store
```

### 5.3 Syncing FastAPI Data with Supabase Real-time

```typescript
/**
 * Sync FastAPI data with Supabase real-time subscriptions
 * Example: When batch quantity changes via Supabase, refetch FastAPI alerts
 */

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { queryKeys } from '@/lib/queries/query-keys'

export function useSyncFastAPIWithSupabase(storeId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  useEffect(() => {
    // Subscribe to batch changes
    const channel = supabase
      .channel(`batches:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'inventory',
          table: 'batches',
          filter: `store_id=eq.${storeId}`,
        },
        payload => {
          console.log('Batch changed, refetching FastAPI data:', payload)

          // Invalidate FastAPI queries that depend on batch data
          queryClient.invalidateQueries({
            queryKey: queryKeys.scoring.alerts(storeId, {}),
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.scoring.analytics(storeId, 30),
          })
          queryClient.invalidateQueries({
            queryKey: queryKeys.donations.suitableItems(storeId, {}),
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [storeId, queryClient, supabase])
}
```

---

## 6. Component Integration Patterns

### 6.1 Alerts Dashboard Component

```typescript
/**
 * components/dashboard/alerts-section.tsx
 * Example of integrating FastAPI alerts with existing components
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertTriangle, Package, TrendingDown } from 'lucide-react'

export function AlertsSection() {
  const { data, isLoading, error } = useAlerts({
    urgency: 'critical',
    limit: 10,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Critical Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Critical Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Failed to load alerts. Please try again later.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Critical Alerts ({data?.total_count || 0})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.alerts.map(alert => (
          <div
            key={alert.batch_id}
            className="flex items-start justify-between p-3 rounded-lg border"
          >
            <div className="flex items-start gap-3">
              <Package className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div>
                <p className="font-medium">{alert.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  {alert.category} • SKU: {alert.sku}
                </p>
                <p className="text-sm mt-1">{alert.recommendation}</p>
              </div>
            </div>
            <div className="text-right space-y-1">
              <Badge variant={alert.urgency_level === 'critical' ? 'destructive' : 'warning'}>
                {alert.urgency_level}
              </Badge>
              <p className="text-sm font-medium">
                {alert.days_to_expiry} days
              </p>
              {alert.suggested_discount && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  {alert.suggested_discount}% off
                </p>
              )}
            </div>
          </div>
        ))}

        {data?.ai_insights && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium">AI Insights</p>
            <div className="grid grid-cols-3 gap-4 mt-2">
              <div>
                <p className="text-2xl font-bold">{data.ai_insights.urgent_items}</p>
                <p className="text-xs text-muted-foreground">Urgent Items</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{data.ai_insights.high_priority_items}</p>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  €{data.ai_insights.total_potential_savings.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">Potential Savings</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

### 6.2 Donation Workflow Component

```typescript
/**
 * components/donations/donation-wizard.tsx
 * Multi-step donation workflow
 */

'use client'

import { useDonationWorkflowStore } from '@/lib/stores/donation-workflow-store'
import { useDonationRecipients, useSuitableDonationItems, useDonationActions } from '@/lib/hooks/fastapi/use-donations'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function DonationWizard() {
  const currentStep = useDonationWorkflowStore(state => state.currentStep)
  const canProceed = useDonationWorkflowStore(state => state.canProceed())
  const setCurrentStep = useDonationWorkflowStore(state => state.setCurrentStep)
  const { recordDonation, isRecordingDonation } = useDonationActions()

  const handleNext = () => {
    const steps: typeof currentStep[] = ['select-recipient', 'select-items', 'schedule-pickup', 'confirmation']
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1])
    } else {
      // On confirmation, submit donation
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const state = useDonationWorkflowStore.getState()
    // Submit each selected item
    state.selectedItems.forEach(({ item, quantity }) => {
      recordDonation({
        batch_id: item.batch_id,
        recipient_id: state.selectedRecipient!.recipient_id,
        quantity,
        scheduled_pickup: state.scheduledPickup,
        notes: state.notes,
      })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Donate Food Items</CardTitle>
      </CardHeader>
      <CardContent>
        {currentStep === 'select-recipient' && <RecipientSelection />}
        {currentStep === 'select-items' && <ItemSelection />}
        {currentStep === 'schedule-pickup' && <PickupScheduling />}
        {currentStep === 'confirmation' && <DonationConfirmation />}
        {currentStep === 'complete' && <DonationComplete />}

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => {/* go back logic */}}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!canProceed || isRecordingDonation}>
            {currentStep === 'confirmation' ? 'Confirm Donation' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function RecipientSelection() {
  const { data: recipients, isLoading } = useDonationRecipients()
  const selectRecipient = useDonationWorkflowStore(state => state.selectRecipient)

  // ... render recipient list
}

function ItemSelection() {
  const selectedRecipient = useDonationWorkflowStore(state => state.selectedRecipient)
  const { data: suitableItems, isLoading } = useSuitableDonationItems({
    recipient_id: selectedRecipient?.recipient_id,
    min_days_to_expiry: 1,
    max_days_to_expiry: 7,
  })
  const addItem = useDonationWorkflowStore(state => state.addItem)

  // ... render suitable items with checkboxes
}

// ... other step components
```

### 6.3 Mobile Scanning Integration

```typescript
/**
 * components/scanning/mobile-scanner.tsx
 * Integrate FastAPI scanning with existing workflow
 */

'use client'

import { useState } from 'react'
import { useScanningWorkflowStore } from '@/lib/stores/scanning-workflow-store'
import { scanningClient } from '@/lib/api/fastapi'
import { BarcodeScanner } from '@/components/barcode/barcode-scanner'

export function MobileScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const storeId = useScanningWorkflowStore(state => state.storeId)
  const setBarcodeScanned = useScanningWorkflowStore(state => state.setBarcodeScanned)
  const setError = useScanningWorkflowStore(state => state.setError)

  const handleBarcodeDetected = async (barcode: string) => {
    if (!storeId) {
      setError('No store selected')
      return
    }

    setIsScanning(true)

    try {
      // Use FastAPI to lookup product
      const result = await scanningClient.scanBarcode(storeId, barcode)

      if (result.product_found && result.product_data) {
        // Product found - set in workflow store
        setBarcodeScanned(barcode, {
          format: result.format,
          rawValue: barcode,
          cornerPoints: [],
        })

        // Also set product data
        const { setProductLookupResult } = useScanningWorkflowStore.getState()
        setProductLookupResult({
          found: true,
          product: {
            code: barcode,
            product_name: result.product_data.name,
            brands: result.product_data.brand,
            categories: result.product_data.category,
            image_url: result.product_data.image_url,
          },
        })
      } else {
        // Product not found - still allow manual entry
        setBarcodeScanned(barcode, {
          format: result.format,
          rawValue: barcode,
          cornerPoints: [],
        })
      }
    } catch (error) {
      console.error('Barcode scan failed:', error)
      setError(error instanceof Error ? error.message : 'Scan failed')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <BarcodeScanner
      onBarcodeDetected={handleBarcodeDetected}
      isProcessing={isScanning}
    />
  )
}
```

---

## 7. Developer Experience

### 7.1 Easy Endpoint Addition

**Step-by-step guide for adding new endpoints:**

1. **Add types to domain client**:

```typescript
// lib/api/fastapi/clients/scoring-client.ts
export interface NewFeatureResponse {
  // ... types
}
```

2. **Add method to client**:

```typescript
export class ScoringClient extends BaseFastAPIClient {
  async getNewFeature(storeId: string): Promise<NewFeatureResponse> {
    return this.get(`/api/v1/scoring/new-feature/${storeId}`)
  }
}
```

3. **Add query key**:

```typescript
// lib/queries/query-keys.ts
scoring: {
  // ... existing keys
  newFeature: (storeId: string) =>
    [...queryKeys.scoring.all, 'new-feature', storeId] as const,
}
```

4. **Create hook**:

```typescript
// lib/hooks/fastapi/use-scoring.ts
export function useNewFeature() {
  const storeId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.scoring.newFeature(storeId || ''),
    queryFn: () => {
      if (!storeId) throw new Error('No active store selected')
      return scoringClient.getNewFeature(storeId)
    },
    enabled: !!storeId,
  })
}
```

5. **Use in component**:

```typescript
import { useNewFeature } from '@/lib/hooks/fastapi/use-scoring'

export function NewFeatureComponent() {
  const { data, isLoading } = useNewFeature()
  // ... render
}
```

### 7.2 Type Generation Script

**File: `scripts/generate-fastapi-types.sh`**

```bash
#!/bin/bash

# Generate TypeScript types from FastAPI OpenAPI schema
# Usage: npm run generate:types

set -e

echo "Starting FastAPI server (if not running)..."
cd lifo_api
uvicorn app.main:app --host 0.0.0.0 --port 8000 &
FASTAPI_PID=$!

# Wait for server to be ready
echo "Waiting for FastAPI server..."
for i in {1..30}; do
  if curl -s http://localhost:8000/health > /dev/null; then
    echo "FastAPI server is ready"
    break
  fi
  sleep 1
done

# Generate types
echo "Generating types from OpenAPI schema..."
cd ..
npx openapi-typescript http://localhost:8000/openapi.json \
  -o lib/api/fastapi/generated/schema.ts \
  --alphabetize

# Kill FastAPI server
echo "Stopping FastAPI server..."
kill $FASTAPI_PID

echo "Type generation complete!"
```

Add to `package.json`:

```json
{
  "scripts": {
    "generate:types": "./scripts/generate-fastapi-types.sh"
  }
}
```

### 7.3 Testing Strategy

#### Unit Tests for Clients

```typescript
// __tests__/lib/api/fastapi/scoring-client.test.ts

import { scoringClient } from '@/lib/api/fastapi'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('http://localhost:8000/api/v1/scoring/alerts/:storeId', (req, res, ctx) => {
    return res(
      ctx.json({
        store_id: 'test-store',
        alerts: [],
        total_count: 0,
        threshold: 0.7,
        generated_at: new Date().toISOString(),
      }),
    )
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('ScoringClient', () => {
  it('should fetch alerts successfully', async () => {
    const result = await scoringClient.getAlerts('test-store', { limit: 10 })

    expect(result.store_id).toBe('test-store')
    expect(result.alerts).toEqual([])
    expect(result.total_count).toBe(0)
  })

  it('should handle errors gracefully', async () => {
    server.use(
      rest.get('http://localhost:8000/api/v1/scoring/alerts/:storeId', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ detail: 'Internal server error' }))
      }),
    )

    await expect(scoringClient.getAlerts('test-store')).rejects.toThrow('FastAPI request failed')
  })
})
```

#### Integration Tests with React Query

```typescript
// __tests__/lib/hooks/fastapi/use-scoring.test.tsx

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useAlerts', () => {
  it('should fetch and cache alerts', async () => {
    const { result } = renderHook(() => useAlerts({ limit: 5 }), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
    expect(result.current.data?.alerts).toBeInstanceOf(Array)
  })
})
```

---

## 8. Progressive Enhancement

### 8.1 Offline-First Patterns

```typescript
/**
 * Offline support for mobile scanning
 * Cache scan results locally, sync when online
 */

import { useOnlineStatus } from '@/hooks/use-online-status'
import { useEffect } from 'react'

// Custom hook for online status
function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

// Persist mutations while offline
export function useOfflineAwareMutation() {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data) => {
      if (!isOnline) {
        // Store in IndexedDB for later
        await storeOfflineMutation(data)
        throw new Error('Offline - will sync when online')
      }

      return await submitToFastAPI(data)
    },
    onError: (error) => {
      if (error.message.includes('Offline')) {
        toast.info('Action saved offline. Will sync when online.', {
          duration: 5000,
        })
      }
    },
  })
}

// Sync offline mutations when back online
export function useOfflineSync() {
  const isOnline = useOnlineStatus()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (isOnline) {
      syncOfflineMutations(queryClient)
    }
  }, [isOnline, queryClient])
}
```

### 8.2 Graceful Degradation

```typescript
/**
 * Fallback patterns when FastAPI is unavailable
 */

export function useAlertsWithFallback() {
  const { data: fastApiAlerts, isLoading, error } = useAlerts()
  const { data: supabaseAlerts } = useSupabaseAlerts() // Fallback to Supabase query

  // Use FastAPI data if available, otherwise fall back to Supabase
  const alerts = error ? supabaseAlerts : fastApiAlerts

  return {
    alerts,
    isLoading,
    source: error ? 'supabase' : 'fastapi',
  }
}

// Health check component
export function APIHealthIndicator() {
  const { data: health } = useQuery({
    queryKey: ['fastapi', 'health'],
    queryFn: () => scoringClient.checkHealth(),
    refetchInterval: 60 * 1000, // Check every minute
    retry: false,
  })

  if (!health?.healthy) {
    return (
      <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-2 rounded-lg">
        <p className="text-sm font-medium">Using fallback data</p>
        <p className="text-xs">FastAPI is temporarily unavailable</p>
      </div>
    )
  }

  return null
}
```

### 8.3 Performance Optimization

```typescript
/**
 * Performance patterns for mobile
 */

// Prefetch related data
export function useAlertsPrefetch() {
  const queryClient = useQueryClient()
  const storeId = useActiveStoreId()

  useEffect(() => {
    if (storeId) {
      // Prefetch analytics when viewing alerts
      queryClient.prefetchQuery({
        queryKey: queryKeys.scoring.analytics(storeId, 30),
        queryFn: () => scoringClient.getAnalytics(storeId, 30),
        staleTime: 5 * 60 * 1000,
      })
    }
  }, [storeId, queryClient])
}

// Debounce search/filter inputs
import { useDebouncedValue } from '@/hooks/use-debounce'

export function useFilteredAlerts() {
  const [filters, setFilters] = useState({ category: '', urgency: '' })
  const debouncedFilters = useDebouncedValue(filters, 300) // 300ms debounce

  const { data } = useAlerts(debouncedFilters)

  return { data, setFilters }
}

// Pagination for large lists
export function usePaginatedAlerts() {
  const [page, setPage] = useState(0)
  const pageSize = 20

  const { data, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: queryKeys.scoring.alerts('store-id', { limit: pageSize }),
    queryFn: ({ pageParam = 0 }) => {
      return scoringClient.getAlerts('store-id', {
        limit: pageSize,
        offset: pageParam * pageSize,
      })
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.alerts.length === pageSize ? pages.length : undefined
    },
    initialPageParam: 0,
  })

  return { data, hasNextPage, fetchNextPage, page, setPage }
}
```

---

## 9. Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Goals:**
- Set up base client infrastructure
- Implement scoring client (most used)
- Create query keys and hooks
- Document patterns

**Tasks:**
1. Create `lib/api/fastapi/core/base-client.ts`
2. Implement `ScoringClient` with all methods
3. Add query keys for scoring
4. Create `use-scoring.ts` hooks
5. Write tests for base client
6. Update documentation

**Success Criteria:**
- All existing scoring endpoints work through new client
- Tests pass
- Components can use new hooks

### Phase 2: Domain Clients (Week 2)

**Goals:**
- Implement remaining domain clients
- Create comprehensive hooks
- Add Zustand stores for workflows

**Tasks:**
1. Implement `DonationClient`
2. Implement `ScanningClient`
3. Implement `BatchClient`
4. Implement `CSVClient`
5. Create workflow stores (donation, batch operations)
6. Add query keys for all domains
7. Write domain-specific hooks

**Success Criteria:**
- All 26 endpoints accessible through clients
- Type-safe hooks available
- Workflow stores functional

### Phase 3: Component Integration (Week 3)

**Goals:**
- Integrate clients into existing components
- Build new UI for missing features
- Ensure mobile optimization

**Tasks:**
1. Update dashboard components to use new hooks
2. Build donation workflow UI
3. Integrate scanning with mobile scanner
4. Add batch operation bulk actions UI
5. Implement CSV upload with progress tracking
6. Test on mobile devices

**Success Criteria:**
- All features accessible in UI
- Mobile performance <300ms
- Smooth user experience

### Phase 4: Testing & Polish (Week 4)

**Goals:**
- Comprehensive test coverage
- Performance optimization
- Documentation completion

**Tasks:**
1. Write unit tests for all clients
2. Write integration tests for hooks
3. Add E2E tests for critical workflows
4. Performance profiling and optimization
5. Error handling improvements
6. Complete API documentation
7. Create developer guide

**Success Criteria:**
- >85% test coverage
- All mobile endpoints <300ms
- Documentation complete
- Zero critical bugs

### Phase 5: Advanced Features (Week 5+)

**Goals:**
- Offline support
- Type generation
- Advanced caching

**Tasks:**
1. Implement offline mutation queue
2. Add IndexedDB caching
3. Set up OpenAPI type generation
4. Implement Zod validation
5. Add telemetry and monitoring
6. Optimize bundle size

**Success Criteria:**
- Offline mode functional
- Types auto-generated
- Runtime validation active
- Monitoring in place

---

## 10. Migration Strategy

### 10.1 Backward Compatibility

Keep existing `fastapi-client.ts` during migration:

```typescript
// lib/services/fastapi-client.ts (legacy)

/**
 * @deprecated Use domain-specific clients instead
 * import { scoringClient } from '@/lib/api/fastapi'
 */
export class FastAPIClient {
  // ... existing implementation

  /**
   * @deprecated Use scoringClient.getAlerts()
   */
  async getStoreAlerts(...args) {
    console.warn('Deprecated: Use scoringClient.getAlerts() instead')
    return this.getAlerts(...args)
  }
}
```

### 10.2 Gradual Migration

```typescript
// components/dashboard/alerts.tsx

// Before:
import { fastApiClient } from '@/lib/services/fastapi-client'
const alerts = await fastApiClient.getStoreAlerts(storeId, token)

// After:
import { useAlerts } from '@/lib/hooks/fastapi/use-scoring'
const { data: alerts } = useAlerts()
```

**Migration Checklist:**
- [ ] Week 1: New code uses new clients only
- [ ] Week 2: Start migrating existing components
- [ ] Week 3: Update all dashboard components
- [ ] Week 4: Deprecation warnings added
- [ ] Week 5: Remove legacy client (after full migration)

---

## 11. Monitoring & Observability

### 11.1 Client-Side Monitoring

```typescript
/**
 * Track FastAPI performance and errors
 */

import { useEffect } from 'react'

export function useFastAPIMonitoring() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const cache = queryClient.getQueryCache()

    const unsubscribe = cache.subscribe(event => {
      if (event?.type === 'updated' && event?.action?.type === 'error') {
        const query = event.query
        if (query.queryKey[0] === 'fastapi') {
          // Log to monitoring service
          console.error('FastAPI Query Error:', {
            queryKey: query.queryKey,
            error: query.state.error,
            meta: query.meta,
          })

          // Send to Sentry, LogRocket, etc.
          if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(query.state.error, {
              tags: {
                type: 'fastapi-error',
                endpoint: String(query.queryKey[1]),
              },
            })
          }
        }
      }

      if (event?.type === 'updated' && event?.action?.type === 'success') {
        const query = event.query
        if (query.queryKey[0] === 'fastapi' && query.state.dataUpdateCount === 1) {
          // Track successful queries
          const duration = query.state.dataUpdatedAt - query.state.fetchStatus
          console.log('FastAPI Query Success:', {
            queryKey: query.queryKey,
            duration,
          })
        }
      }
    })

    return unsubscribe
  }, [queryClient])
}
```

### 11.2 Performance Tracking

```typescript
/**
 * Track key performance metrics
 */

export function usePerformanceTracking() {
  const { data: alerts, dataUpdatedAt } = useAlerts()

  useEffect(() => {
    if (dataUpdatedAt) {
      const duration = Date.now() - dataUpdatedAt

      // Track in analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'fastapi_alerts_load',
          value: duration,
          event_category: 'API Performance',
        })
      }

      // Warn if slow
      if (duration > 300) {
        console.warn('Slow FastAPI response:', duration, 'ms')
      }
    }
  }, [dataUpdatedAt])
}
```

---

## 12. Security Considerations

### 12.1 Token Management

```typescript
/**
 * Secure token handling
 */

// Never expose service role key client-side
const getServiceRoleKey = () => {
  if (typeof window !== 'undefined') {
    throw new Error('Service role key cannot be accessed client-side')
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY
}

// Use short-lived JWT tokens
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession()

  // Check token expiry
  if (session && session.expires_at) {
    const expiresIn = session.expires_at - Date.now() / 1000
    if (expiresIn < 60) {
      // Less than 1 minute, refresh
      await supabase.auth.refreshSession()
    }
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
  }
}
```

### 12.2 Input Validation

```typescript
/**
 * Validate inputs before sending to API
 */

import { z } from 'zod'

const BatchCreateSchema = z.object({
  product_id: z.string().uuid(),
  batch_number: z.string().min(1).max(50),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().int().positive().max(999999),
  cost_price: z.number().nonnegative().optional(),
  selling_price: z.number().nonnegative().optional(),
})

export async function createBatchSafe(storeId: string, data: unknown) {
  // Validate input
  const validated = BatchCreateSchema.parse(data)

  // Sanitize batch_number (prevent injection)
  validated.batch_number = validated.batch_number.replace(/[^a-zA-Z0-9-_]/g, '')

  return batchClient.createBatch(storeId, validated)
}
```

### 12.3 Rate Limiting

```typescript
/**
 * Client-side rate limiting
 */

import pThrottle from 'p-throttle'

// Limit to 10 requests per second per client
const throttle = pThrottle({
  limit: 10,
  interval: 1000,
})

export const rateLimitedPost = throttle(async (url: string, data: unknown) => {
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data),
  })
})
```

---

## Appendix A: Complete File Structure

```
lib/
├── api/
│   ├── fastapi/
│   │   ├── core/
│   │   │   ├── base-client.ts       (1,200 lines)
│   │   │   ├── types.ts             (300 lines)
│   │   │   └── error-handling.ts    (200 lines)
│   │   ├── clients/
│   │   │   ├── scoring-client.ts    (400 lines)
│   │   │   ├── donation-client.ts   (350 lines)
│   │   │   ├── scanning-client.ts   (300 lines)
│   │   │   ├── batch-client.ts      (350 lines)
│   │   │   ├── csv-client.ts        (300 lines)
│   │   │   └── analytics-client.ts  (250 lines)
│   │   ├── generated/
│   │   │   └── schema.ts            (auto-generated)
│   │   └── index.ts                 (50 lines)
│   └── ocr-client.ts                (existing, 392 lines)
├── hooks/
│   ├── fastapi/
│   │   ├── use-scoring.ts           (400 lines)
│   │   ├── use-donations.ts         (350 lines)
│   │   ├── use-scanning.ts          (250 lines)
│   │   ├── use-batch-operations.ts  (300 lines)
│   │   └── use-csv-operations.ts    (200 lines)
│   └── [existing hooks]
├── stores/
│   ├── donation-workflow-store.ts   (500 lines)
│   ├── batch-operation-store.ts     (400 lines)
│   ├── scanning-workflow-store.ts   (existing, 794 lines)
│   └── [other stores]
├── queries/
│   └── query-keys.ts                (extended, +150 lines)
└── services/
    └── fastapi-client.ts            (existing, deprecated)

Total New Code: ~5,800 lines
Total Updated Code: ~150 lines
```

## Appendix B: API Coverage Matrix

| Domain | Endpoint | Client | Hook | Component | Status |
|--------|----------|--------|------|-----------|--------|
| Scoring | GET /alerts/{store_id} | scoringClient.getAlerts | useAlerts | AlertsSection | ✅ Ready |
| Scoring | GET /analytics/{store_id} | scoringClient.getAnalytics | useAnalytics | AnalyticsDashboard | ✅ Ready |
| Scoring | GET /recommendations/{store_id} | scoringClient.getRecommendations | useRecommendations | RecommendationsCard | ✅ Ready |
| Scoring | POST /trigger/{store_id} | scoringClient.triggerScoring | useScoringActions | ScoringTriggerButton | ✅ Ready |
| Scoring | GET /schedules/{store_id} | scoringClient.getSchedules | useScoringSchedules | ScheduleManager | ✅ Ready |
| Scoring | POST /schedules/{store_id} | scoringClient.createSchedule | useScoringActions | CreateScheduleForm | ✅ Ready |
| Scoring | GET /jobs/{store_id} | scoringClient.getJobs | useScoringJobs | JobsTable | ✅ Ready |
| Donations | GET /recipients/{store_id} | donationClient.getRecipients | useDonationRecipients | RecipientList | ✅ Ready |
| Donations | POST /recipients/{store_id} | donationClient.createRecipient | useDonationActions | AddRecipientForm | ✅ Ready |
| Donations | GET /suitable-items/{store_id} | donationClient.querySuitableItems | useSuitableDonationItems | ItemSelector | ✅ Ready |
| Donations | POST /actions/{store_id} | donationClient.recordDonation | useDonationActions | DonationWizard | ✅ Ready |
| Donations | GET /history/{store_id} | donationClient.getDonationHistory | useDonationHistory | HistoryTable | ✅ Ready |
| Donations | GET /impact/{store_id} | donationClient.getDonationImpact | useDonationImpact | ImpactDashboard | ✅ Ready |
| Scanning | GET /barcode/{store_id} | scanningClient.scanBarcode | - | MobileScanner | ✅ Ready |
| Scanning | POST /ocr-expiry/{store_id} | scanningClient.extractExpiry | - | ExpiryScanner | ✅ Ready |
| Scanning | POST /recognize/{store_id} | scanningClient.recognizeProduct | - | ProductRecognition | ✅ Ready |
| Batch | POST /create/{store_id} | batchClient.createBatch | - | CreateBatchForm | ✅ Ready |
| Batch | POST /bulk/{store_id} | batchClient.createBatches | - | BulkUploader | ✅ Ready |
| Batch | POST /{batch_id}/action | batchClient.applyAction | - | BatchActions | ✅ Ready |
| Batch | GET /actions/{store_id} | batchClient.getActionHistory | - | ActionHistory | ✅ Ready |
| CSV | POST /upload/{store_id} | csvClient.uploadCSV | useCSVUpload | CSVUploader | ✅ Ready |
| CSV | POST /duplicates/{store_id} | csvClient.checkDuplicates | useCSVDuplicateCheck | DuplicateChecker | ✅ Ready |
| CSV | GET /status/{upload_id} | csvClient.getProcessingStatus | useCSVProcessingStatus | StatusTracker | ✅ Ready |
| CSV | GET /history/{store_id} | csvClient.getUploadHistory | useCSVUploadHistory | HistoryView | ✅ Ready |

**Coverage: 26/26 endpoints (100%)**

---

## Appendix C: Performance Benchmarks

Target response times for mobile:

| Endpoint Category | Target (p95) | Current | Status |
|-------------------|--------------|---------|--------|
| Alerts (simple) | <200ms | TBD | 🟡 Testing |
| Alerts (filtered) | <300ms | TBD | 🟡 Testing |
| Analytics | <400ms | TBD | 🟡 Testing |
| Barcode scan | <150ms | TBD | 🟡 Testing |
| OCR expiry | <2000ms | TBD | 🟡 Testing |
| Batch create | <250ms | TBD | 🟡 Testing |
| Bulk batch (10) | <1000ms | TBD | 🟡 Testing |
| CSV upload (100 rows) | <3000ms | TBD | 🟡 Testing |
| Donation query | <300ms | TBD | 🟡 Testing |

---

## Conclusion

This comprehensive integration strategy provides:

1. **Scalable architecture** with domain-specific clients
2. **Type safety** through TypeScript and optional Zod validation
3. **Developer-friendly** patterns for adding new endpoints
4. **Production-ready** error handling, caching, and offline support
5. **Mobile-optimized** performance patterns
6. **Backward compatibility** during migration

The modular design allows incremental adoption while maintaining existing functionality. Each domain client is independent, making it easy to test, maintain, and extend.

**Next Steps:**
1. Review and approve this strategy
2. Begin Phase 1 implementation (base client + scoring)
3. Iterate based on feedback
4. Complete remaining phases

**Questions or feedback?** Contact the development team.
