/**
 * Square POS Integration Type Definitions
 * Types for Square API responses and integration data structures
 */

/**
 * Square connection status response (from /status endpoint)
 * Used to check if user has an active Square connection
 */
export interface SquareConnectionStatus {
  is_connected: boolean
  store_id?: string
  store_name?: string
  merchant_id?: string
  merchant_name?: string
  location_id?: string
  connection_id?: string
  connection_status?: 'active' | 'expired' | 'revoked' | 'error'
  last_sync_at?: string
}

/**
 * Square connection details (from /connections endpoint)
 * Comprehensive connection information including tokens metadata
 */
export interface SquareConnection {
  connection_id: string
  store_id: string
  square_merchant_id: string
  square_location_id: string
  square_business_name: string
  square_country?: string
  square_currency?: string
  connection_status: 'active' | 'expired' | 'revoked' | 'error'
  is_active: boolean
  token_expires_at: string
  last_token_refresh_at?: string
  last_sync_at?: string
  connected_at: string
  disconnected_at?: string
  created_at: string
  updated_at: string
}

/**
 * List connections response
 */
export interface ConnectionListResponse {
  connections: SquareConnection[]
  total: number
}

/**
 * OAuth initiation response
 * Contains Square authorization URL and state token
 */
export interface OAuthAuthorizeResponse {
  authorization_url: string
  state: string
}

/**
 * OAuth callback response
 * Returned after successful OAuth flow completion
 */
export interface OAuthCallbackResponse {
  success: boolean
  connection_id: string
  store_id: string
  store_code: string
  store_name: string
  square_merchant_id: string
  location_id: string
  message: string
}

/**
 * Disconnect response
 */
export interface DisconnectResponse {
  connection_id: string
  disconnected_at: string
  message: string
}

/**
 * Sync statistics returned from sync operations
 */
export interface SyncStats {
  // Catalog sync
  items_fetched?: number
  products_created?: number
  products_updated?: number
  products_skipped?: number

  // Inventory sync
  batches_updated?: number
  batches_created?: number
  discrepancies?: number

  // Orders sync
  orders_fetched?: number
  line_items_processed?: number
  batch_actions_created?: number

  // Common fields
  errors: string[]
}

/**
 * Connection health check response
 */
export interface ConnectionHealthCheck {
  connection_id: string
  is_healthy: boolean
  token_expires_in_days: number
  token_health: 'healthy' | 'expiring_soon' | 'expired'
  last_successful_sync?: string
  failed_syncs_24h: number
  issues: string[]
}
