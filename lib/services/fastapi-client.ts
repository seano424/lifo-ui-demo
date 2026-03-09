/**
 * FastAPI Client Service Layer
 * Handles communication between Next.js and FastAPI backend
 * Phase 1: Basic proxy with fallback support
 */

interface FastAPIAlert {
  batch_id: string
  sku: string
  product_name: string
  category: string
  quantity: number
  days_to_expiry: number
  urgency_score: number
  urgency_level: string
  potential_loss: number
  recommendation: string
  suggested_discount?: number
}

interface FastAPIAlertsResponse {
  store_id: string
  alerts: FastAPIAlert[]
  total_count: number
  threshold: number
  generated_at: string
  ai_insights?: {
    urgent_items: number
    high_priority_items: number
    total_potential_savings: number
  }
}

interface FastAPIAnalyticsResponse {
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

interface ActionableBatch {
  batch_id: string
  product_name: string
  expiry_date: string
  urgency: 'critical' | 'high' | 'medium' | 'low'
  recommendation: string
  discount_percent: number
  reason: string
  location_code: string
  current_quantity: number
  potential_loss: number
  composite_score: number
}

// UUID v4 format validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class FastAPIClient {
  private baseUrl: string
  private timeout: number

  constructor() {
    const baseUrl =
      process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

    // Enforce HTTPS in production environments (but allow localhost for development/builds)
    if (
      process.env.NODE_ENV === 'production' &&
      baseUrl.startsWith('http://') &&
      !baseUrl.startsWith('http://localhost') &&
      !baseUrl.startsWith('http://127.0.0.1')
    ) {
      throw new Error('FastAPI client requires HTTPS in production environment')
    }

    this.baseUrl = baseUrl
    // Optimized timeout: 8 seconds for better performance
    this.timeout = 10000 // Increased to 10s now that scoring is decoupled
  }

  /**
   * Enhanced error handling with categorization
   */
  private handleFetchError(error: unknown, operation: string): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error(`${operation} timeout after ${this.timeout}ms`)
      }
      if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        return new Error(`${operation} failed - FastAPI service unavailable`)
      }
      if (error.message.includes('fetch failed')) {
        return new Error(`${operation} failed - Network connectivity issue`)
      }
      return error
    }
    return new Error(`${operation} failed with unknown error`)
  }

  /**
   * Validate UUID format for enhanced security
   */
  private validateUUID(value: string, fieldName: string): void {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      throw new Error(`${fieldName} is required and must be a non-empty string`)
    }
    if (!UUID_REGEX.test(value)) {
      throw new Error(`Invalid ${fieldName} format`)
    }
  }

  /**
   * Get store alerts from FastAPI backend
   */
  async getStoreAlerts(
    storeId: string,
    token: string,
    options: {
      threshold?: number
      urgency?: string
      category?: string
      limit?: number
    } = {},
  ): Promise<FastAPIAlertsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/alerts/${storeId}`)

    // Security middleware now supports all parameters
    if (options.threshold) url.searchParams.set('threshold', options.threshold.toString())
    if (options.limit) url.searchParams.set('limit', options.limit.toString())
    if (options.urgency) url.searchParams.set('urgency', options.urgency)
    if (options.category) url.searchParams.set('category', options.category)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Debug logging (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FastAPI] Request URL: ${url.toString()}`)
      console.log(`[FastAPI] Token length: ${token.length}`)
      console.log(`[FastAPI] Store ID: ${storeId}`)
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`[FastAPI] Response status: ${response.status}`)
        console.log(`[FastAPI] Response headers:`, Object.fromEntries(response.headers.entries()))
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Get error details from response
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(
          `FastAPI alerts request failed: ${response.status} ${response.statusText} - ${errorDetails}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAlertsResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get store alerts using user JWT token (Phase 2 - user-specific authentication)
   */
  async getStoreAlertsWithUserToken(
    storeId: string,
    userToken: string,
    options: {
      threshold?: number
      urgency?: string
      category?: string
      limit?: number
    } = {},
  ): Promise<FastAPIAlertsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/alerts/${storeId}`)

    // Full parameter support (security middleware now fixed)
    if (options.threshold) url.searchParams.set('threshold', options.threshold.toString())
    if (options.limit) url.searchParams.set('limit', options.limit.toString())
    if (options.urgency) url.searchParams.set('urgency', options.urgency)
    if (options.category) url.searchParams.set('category', options.category)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Get publishable key from environment
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FastAPI] Request URL: ${url.toString()}`)
      console.log(`[FastAPI] Using user JWT token (length: ${userToken.length})`)
      console.log(`[FastAPI] Publishable key present: ${!!publishableKey}`)
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`, // Use Authorization header for user tokens
          'Content-Type': 'application/json',
          ...(publishableKey && { apikey: publishableKey }), // Add apikey header for new Supabase API keys
        },
        signal: controller.signal,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`[FastAPI] Response status: ${response.status}`)
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Get error details from response
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(
          `FastAPI alerts request failed: ${response.status} ${response.statusText} - ${errorDetails}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAlertsResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get store alerts using service role key (Phase 1 fallback)
   */
  async getStoreAlertsWithServiceKey(
    storeId: string,
    serviceRoleKey: string,
    options: {
      threshold?: number
      urgency?: string
      category?: string
      limit?: number
    } = {},
  ): Promise<FastAPIAlertsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/alerts/${storeId}`)

    // Security middleware now fixed - can use all parameters together!
    if (options.threshold) url.searchParams.set('threshold', options.threshold.toString())
    if (options.limit) url.searchParams.set('limit', options.limit.toString())
    if (options.urgency) url.searchParams.set('urgency', options.urgency)
    if (options.category) url.searchParams.set('category', options.category)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Debug logging (can be removed in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[FastAPI] Request URL: ${url.toString()}`)
      console.log(`[FastAPI] Using service role key`)
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey, // Use apikey header for service role
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      if (process.env.NODE_ENV === 'development') {
        console.log(`[FastAPI] Response status: ${response.status}`)
      }

      clearTimeout(timeoutId)

      if (!response.ok) {
        // Get error details from response
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(
          `FastAPI alerts request failed: ${response.status} ${response.statusText} - ${errorDetails}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAlertsResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get store analytics using user JWT token (Phase 2)
   */
  async getStoreAnalyticsWithUserToken(
    storeId: string,
    userToken: string,
    days: number = 30,
  ): Promise<FastAPIAnalyticsResponse> {
    // Use scoring analytics endpoint which is confirmed working
    const url = new URL(`${this.baseUrl}/api/v1/scoring/analytics/${storeId}`)
    url.searchParams.set('days', days.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI analytics request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAnalyticsResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get store analytics using service role key (Phase 1 fallback)
   */
  async getStoreAnalyticsWithServiceKey(
    storeId: string,
    serviceRoleKey: string,
    days: number = 30,
  ): Promise<FastAPIAnalyticsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/analytics/${storeId}`)
    url.searchParams.set('days', days.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey, // Use apikey header for service role
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI analytics request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAnalyticsResponse
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Store analytics with service key')
    }
  }

  /**
   * Get store analytics from FastAPI backend (legacy method)
   */
  async getStoreAnalytics(
    storeId: string,
    token: string,
    days: number = 30,
  ): Promise<FastAPIAnalyticsResponse> {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/analytics/${storeId}`)
    url.searchParams.set('days', days.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI analytics request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data as FastAPIAnalyticsResponse
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get dashboard data with actionable batches using user JWT token
   * ENHANCED: Now includes individual batch recommendations from scoring
   */
  async getDashboardDataWithUserToken(
    storeId: string,
    userToken: string,
  ): Promise<{
    store_id: string
    summary: Record<string, unknown>
    alerts: Record<string, unknown>
    top_categories: Record<string, unknown>[]
    recent_activity: Record<string, unknown>[]
    actionable_batches: ActionableBatch[]
    last_updated: string
  }> {
    const url = new URL(`${this.baseUrl}/api/v1/analytics/dashboard/${storeId}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Get publishable key from environment
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...(publishableKey && { apikey: publishableKey }), // Add apikey header for new Supabase API keys
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI dashboard request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get dashboard data with actionable batches using service key
   * ENHANCED: Now includes individual batch recommendations from scoring
   */
  async getDashboardDataWithServiceKey(
    storeId: string,
    serviceRoleKey: string,
  ): Promise<{
    store_id: string
    summary: Record<string, unknown>
    alerts: Record<string, unknown>
    top_categories: Record<string, unknown>[]
    recent_activity: Record<string, unknown>[]
    actionable_batches: ActionableBatch[]
    last_updated: string
  }> {
    const url = new URL(`${this.baseUrl}/api/v1/analytics/dashboard/${storeId}`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          apikey: serviceRoleKey, // Use apikey header for service role
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI dashboard request failed: ${response.status} ${response.statusText}`,
        )
      }

      const data = await response.json()
      return data
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Get AI recommendations from FastAPI backend using user JWT token
   */
  async getAIRecommendationsWithUserToken(
    storeId: string,
    userToken: string,
    options: {
      category?: string
      limit?: number
    } = {},
  ) {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/recommendations/${storeId}`)

    if (options.category) url.searchParams.set('category', options.category)
    if (options.limit) url.searchParams.set('limit', options.limit.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    // Get publishable key from environment
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...(publishableKey && { apikey: publishableKey }), // Add apikey header for new Supabase API keys
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        // For 404 or missing data, return empty recommendations instead of throwing
        if (response.status === 404 || response.status === 204) {
          return { store_id: storeId, recommendations: [], total_count: 0 }
        }
        throw new Error(
          `FastAPI recommendations request failed: ${response.status} ${response.statusText}`,
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      // Return empty recommendations instead of throwing for graceful degradation
      if (process.env.NODE_ENV === 'development') {
        console.warn('AI recommendations failed, returning empty:', error)
      }
      return { store_id: storeId, recommendations: [], total_count: 0 }
    }
  }

  /**
   * Get AI recommendations from FastAPI backend (legacy method)
   */
  async getAIRecommendations(
    storeId: string,
    token: string,
    options: {
      category?: string
      limit?: number
    } = {},
  ) {
    const url = new URL(`${this.baseUrl}/api/v1/scoring/recommendations/${storeId}`)

    if (options.category) url.searchParams.set('category', options.category)
    if (options.limit) url.searchParams.set('limit', options.limit.toString())

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(
          `FastAPI recommendations request failed: ${response.status} ${response.statusText}`,
        )
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('FastAPI request timeout')
      }

      throw error instanceof Error ? error : new Error('FastAPI request failed')
    }
  }

  /**
   * Test connection to FastAPI backend with enhanced monitoring
   */
  async testConnection(): Promise<{ healthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now()
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 second timeout for health check
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        return { healthy: true, responseTime }
      } else {
        return {
          healthy: false,
          responseTime,
          error: `HTTP ${response.status} ${response.statusText}`,
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.warn('FastAPI health check failed:', errorMessage)
      return { healthy: false, responseTime, error: errorMessage }
    }
  }

  /**
   * Performance monitoring wrapper for critical operations
   */
  async withPerformanceMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now()
    try {
      const result = await operation()
      const duration = Date.now() - startTime

      if (process.env.NODE_ENV === 'development' && duration > 3000) {
        console.warn(`[FastAPI] Slow operation detected: ${operationName} took ${duration}ms`)
      }

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[FastAPI] Operation failed: ${operationName} (${duration}ms)`, error)
      throw error
    }
  }

  /**
   * Extra headers required when the backend is served through an ngrok tunnel.
   * ngrok free tier returns an HTML interstitial page for browser requests unless
   * this header is present, which causes JSON.parse to blow up with "Unexpected token '<'".
   * Always included — ignored harmlessly by non-ngrok servers.
   */
  private get ngrokHeaders(): Record<string, string> {
    return { 'ngrok-skip-browser-warning': '1' }
  }

  /**
   * Check if FastAPI is enabled via environment variables
   */
  static isEnabled(): boolean {
    return process.env.ENABLE_FASTAPI === 'true' || process.env.NODE_ENV === 'development'
  }

  // =====================================================================
  // Square POS Integration Methods
  // =====================================================================

  /**
   * Initiate Square OAuth connection flow
   * Returns authorization URL to redirect user to Square
   */
  async initiateSquareConnect(
    userToken: string,
  ): Promise<import('@/lib/types/integrations').OAuthAuthorizeResponse> {
    const url = `${this.baseUrl}/api/v1/integrations/square/connect`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to initiate Square connection: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square OAuth initiation')
    }
  }

  /**
   * Get Square connection status for current user
   * No store_id required - finds user's active connections
   */
  async getSquareStatus(
    userToken: string,
  ): Promise<import('@/lib/types/integrations').SquareConnectionStatus> {
    const url = `${this.baseUrl}/api/v1/integrations/square/status`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to get Square status: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square status check')
    }
  }

  /**
   * List all Square connections for a store
   */
  async listSquareConnections(
    storeId: string,
    userToken: string,
  ): Promise<import('@/lib/types/integrations').ConnectionListResponse> {
    // Validate inputs with UUID format checking
    this.validateUUID(storeId, 'Store ID')

    // URL encode the storeId to prevent injection
    const encodedStoreId = encodeURIComponent(storeId)
    const url = `${this.baseUrl}/api/v1/integrations/square/connections?store_id=${encodedStoreId}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to list Square connections: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square connections list')
    }
  }

  /**
   * Disconnect Square integration
   */
  async disconnectSquare(
    connectionId: string,
    userToken: string,
  ): Promise<import('@/lib/types/integrations').DisconnectResponse> {
    // Validate inputs with UUID format checking
    this.validateUUID(connectionId, 'Connection ID')

    const url = `${this.baseUrl}/api/v1/integrations/square/disconnect`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        body: JSON.stringify({ connection_id: connectionId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to disconnect Square: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square disconnect')
    }
  }

  /**
   * Trigger Square catalog sync
   */
  async syncSquareCatalog(
    connectionId: string,
    fullSync: boolean,
    userToken: string,
  ): Promise<import('@/lib/types/integrations').SyncStats> {
    // Validate inputs with UUID format checking
    this.validateUUID(connectionId, 'Connection ID')

    // URL encode the connectionId to prevent injection
    const encodedConnectionId = encodeURIComponent(connectionId)
    const url = `${this.baseUrl}/api/v1/integrations/square/connections/${encodedConnectionId}/sync/catalog?full_sync=${fullSync}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to sync catalog: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square catalog sync')
    }
  }

  /**
   * Trigger Square inventory sync
   */
  async syncSquareInventory(
    connectionId: string,
    fullSync: boolean,
    userToken: string,
  ): Promise<import('@/lib/types/integrations').SyncStats> {
    // Validate inputs with UUID format checking
    this.validateUUID(connectionId, 'Connection ID')

    // URL encode the connectionId to prevent injection
    const encodedConnectionId = encodeURIComponent(connectionId)
    const url = `${this.baseUrl}/api/v1/integrations/square/connections/${encodedConnectionId}/sync/inventory?full_sync=${fullSync}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to sync inventory: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square inventory sync')
    }
  }

  /**
   * Trigger Square orders sync
   */
  async syncSquareOrders(
    connectionId: string,
    daysBack: number,
    fullSync: boolean,
    userToken: string,
  ): Promise<import('@/lib/types/integrations').SyncStats> {
    // Validate inputs with UUID format checking
    this.validateUUID(connectionId, 'Connection ID')

    // Validate daysBack parameter (must be positive and within reasonable bounds)
    if (typeof daysBack !== 'number' || !Number.isInteger(daysBack) || daysBack < 1) {
      throw new Error('Days back must be a positive integer')
    }
    if (daysBack > 365) {
      throw new Error('Days back cannot exceed 365 days')
    }

    // URL encode the connectionId to prevent injection
    const encodedConnectionId = encodeURIComponent(connectionId)
    const url = `${this.baseUrl}/api/v1/integrations/square/connections/${encodedConnectionId}/sync/orders?hours_back=${daysBack * 24}&full_sync=${fullSync}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to sync orders: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square orders sync')
    }
  }

  /**
   * Create initial batches for a store after onboarding
   */
  async createInitialBatches(storeId: string, userToken: string): Promise<Record<string, unknown>> {
    this.validateUUID(storeId, 'Store ID')

    const encodedStoreId = encodeURIComponent(storeId)
    const url = `${this.baseUrl}/api/v1/integrations/square/stores/${encodedStoreId}/create-initial-batches`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
          ...this.ngrokHeaders,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetails = ''
        try {
          const errorData = await response.json()
          errorDetails = errorData.detail || JSON.stringify(errorData)
        } catch {
          errorDetails = await response.text()
        }
        throw new Error(`Failed to create initial batches: ${errorDetails}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      throw this.handleFetchError(error, 'Square initial batch creation')
    }
  }
}

// Response mapping utilities to maintain compatibility with existing Next.js API responses

export interface EnhancedAlert {
  batch_id: string
  batch_number: string
  sku: string
  product_name: string
  category: string
  brand: string
  quantity: number
  unit_type: string
  days_to_expiry: number
  expiry_date: string
  current_price: number
  cost_price: number
  margin_percent: number
  composite_score: number
  recommendation: string
  urgency_level: string
  potential_loss: number
  location: string
  supplier: string
  calculated_at: string | null
  suggested_actions: string[]
  priority_score: number
}

/**
 * Map FastAPI alert to Next.js enhanced alert format
 */
export function mapFastAPIAlertToEnhanced(fastApiAlert: FastAPIAlert): EnhancedAlert {
  return {
    batch_id: fastApiAlert.batch_id,
    batch_number: fastApiAlert.batch_id, // FastAPI doesn't separate batch_number yet
    sku: fastApiAlert.sku,
    product_name: fastApiAlert.product_name,
    category: fastApiAlert.category,
    brand: '', // Will be enhanced in Phase 2
    quantity: fastApiAlert.quantity,
    unit_type: 'pcs', // Default, will be enhanced in Phase 2
    days_to_expiry: fastApiAlert.days_to_expiry,
    expiry_date: new Date(Date.now() + fastApiAlert.days_to_expiry * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
    current_price: fastApiAlert.potential_loss / fastApiAlert.quantity, // Approximate
    cost_price: 0, // Will be enhanced in Phase 2
    margin_percent: 0, // Will be enhanced in Phase 2
    composite_score: fastApiAlert.urgency_score,
    recommendation: fastApiAlert.recommendation,
    urgency_level: fastApiAlert.urgency_level,
    potential_loss: fastApiAlert.potential_loss,
    location: '', // Will be enhanced in Phase 2
    supplier: '', // Will be enhanced in Phase 2
    calculated_at: new Date().toISOString(),
    suggested_actions: generateActionSuggestions(
      fastApiAlert.days_to_expiry,
      fastApiAlert.urgency_score,
    ),
    priority_score: calculatePriorityScore(
      fastApiAlert.days_to_expiry,
      fastApiAlert.potential_loss,
      fastApiAlert.urgency_score,
    ),
  }
}

/**
 * Generate action suggestions based on FastAPI data
 */
function generateActionSuggestions(daysToExpiry: number, urgencyScore: number): string[] {
  const suggestions = []

  if (daysToExpiry <= 0) {
    suggestions.push('URGENT: Remove expired product immediately')
    suggestions.push('Check for similar batches nearing expiry')
    return suggestions
  }

  if (daysToExpiry <= 1) {
    suggestions.push('Apply 40-60% discount immediately')
    suggestions.push('Move to prominent display location')
    suggestions.push('Bundle with popular items')
  } else if (daysToExpiry <= 3) {
    if (urgencyScore >= 0.8) {
      suggestions.push('Apply 25-40% discount')
      suggestions.push('Promote in-store or online')
    } else if (urgencyScore >= 0.6) {
      suggestions.push('Apply 15-25% discount')
      suggestions.push('Monitor closely for next 24 hours')
    }
    suggestions.push('Consider customer pre-orders')
  } else if (daysToExpiry <= 7) {
    if (urgencyScore >= 0.7) {
      suggestions.push('Apply 10-20% discount')
      suggestions.push('Feature in promotional materials')
    }
    suggestions.push('Monitor daily and adjust pricing')
  }

  if (urgencyScore >= 0.6) {
    suggestions.push('Check similar products for bundling opportunities')
  }

  return suggestions
}

/**
 * Calculate priority score for sorting
 */
function calculatePriorityScore(
  daysToExpiry: number,
  potentialLoss: number,
  urgencyScore: number,
): number {
  let score = 0

  // Urgency component (0-50 points)
  if (daysToExpiry <= 0) score += 50
  else if (daysToExpiry <= 1) score += 40
  else if (daysToExpiry <= 3) score += 30
  else if (daysToExpiry <= 7) score += 20
  else score += Math.max(0, 15 - daysToExpiry)

  // Value component (0-30 points)
  const valueScore = Math.min(30, potentialLoss / 10) // €1 = 0.1 points, max 30 points
  score += valueScore

  // Urgency score component (0-20 points)
  score += urgencyScore * 20

  return Math.round(score * 100) / 100
}

// Singleton instance
export const fastApiClient = new FastAPIClient()
