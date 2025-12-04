-- Square POS Integration Migration
-- Created: 2025-11-30
-- Purpose: Add Square OAuth integration support with encrypted token storage
-- Enhanced with: Production-grade sync state management and webhook support
-- Based on: LIFO_MVP_v2_Square_Integration.md roadmap

-- ============================================================================
-- 1. Create integrations schema
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS integrations;

COMMENT ON SCHEMA integrations IS 'Third-party POS and service integrations';

-- ============================================================================
-- 2. Create integrations.square_connections table
-- ============================================================================

CREATE TABLE integrations.square_connections (
    connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,

    -- Square OAuth details
    square_merchant_id VARCHAR(255) NOT NULL,
    square_location_id VARCHAR(255) NOT NULL,

    -- Encrypted tokens (using Fernet encryption)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    token_scopes TEXT[] NOT NULL,

    -- Connection status
    is_active BOOLEAN DEFAULT TRUE,
    connection_status VARCHAR(50) DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    last_error TEXT,

    -- Sync configuration
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_inventory BOOLEAN DEFAULT TRUE,
    sync_sales BOOLEAN DEFAULT TRUE,
    sync_catalog BOOLEAN DEFAULT TRUE,

    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Token refresh tracking (from roadmap)
    last_token_refresh_at TIMESTAMPTZ,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,

    -- Constraints
    UNIQUE(store_id), -- One Square connection per store
    UNIQUE(connection_id, store_id), -- Composite key for FK integrity
    CHECK (connection_status IN ('active', 'expired', 'revoked', 'error'))
);

COMMENT ON TABLE integrations.square_connections IS 'Square POS OAuth connections per store';
COMMENT ON COLUMN integrations.square_connections.access_token_encrypted IS 'Fernet-encrypted Square access token';
COMMENT ON COLUMN integrations.square_connections.refresh_token_encrypted IS 'Fernet-encrypted Square refresh token';
COMMENT ON COLUMN integrations.square_connections.last_token_refresh_at IS 'Last successful token refresh timestamp';
COMMENT ON COLUMN integrations.square_connections.connected_at IS 'Initial OAuth connection timestamp';
COMMENT ON COLUMN integrations.square_connections.disconnected_at IS 'When connection was revoked/disconnected';

-- Indexes for performance
CREATE INDEX idx_square_connections_store_id ON integrations.square_connections(store_id);
CREATE INDEX idx_square_connections_merchant_id ON integrations.square_connections(square_merchant_id);
CREATE INDEX idx_square_connections_active ON integrations.square_connections(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_square_connections_token_expiry ON integrations.square_connections(token_expires_at) WHERE is_active = TRUE;

-- ============================================================================
-- 3. Create integrations.square_sync_history table
-- ============================================================================

CREATE TABLE integrations.square_sync_history (
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL,
    store_id UUID NOT NULL,

    -- Sync details
    sync_type VARCHAR(50) NOT NULL,
    sync_status VARCHAR(50) NOT NULL,

    -- Results
    items_processed INTEGER DEFAULT 0,
    items_created INTEGER DEFAULT 0,
    items_updated INTEGER DEFAULT 0,
    items_failed INTEGER DEFAULT 0,

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Error tracking
    error_message TEXT,
    error_details JSONB,

    -- Metadata
    sync_metadata JSONB,

    -- Constraints
    FOREIGN KEY (connection_id, store_id)
        REFERENCES integrations.square_connections(connection_id, store_id)
        ON DELETE CASCADE,
    CHECK (sync_type IN ('catalog', 'inventory', 'sales', 'token_refresh')),
    CHECK (sync_status IN ('started', 'completed', 'failed', 'partial'))
);

COMMENT ON TABLE integrations.square_sync_history IS 'Audit log of Square sync operations';
COMMENT ON CONSTRAINT square_sync_history_connection_id_store_id_fkey ON integrations.square_sync_history
    IS 'Composite FK ensures store_id matches the connection''s store - data integrity safeguard';

-- Indexes
CREATE INDEX idx_square_sync_history_connection ON integrations.square_sync_history(connection_id);
CREATE INDEX idx_square_sync_history_store ON integrations.square_sync_history(store_id);
CREATE INDEX idx_square_sync_history_type_status ON integrations.square_sync_history(sync_type, sync_status);
CREATE INDEX idx_square_sync_history_started_at ON integrations.square_sync_history(started_at DESC);

-- ============================================================================
-- 4. Add Square fields to inventory.products (Global Product Catalog)
-- ============================================================================

ALTER TABLE inventory.products
    ADD COLUMN IF NOT EXISTS square_item_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS square_catalog_version BIGINT,
    ADD COLUMN IF NOT EXISTS square_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS is_square_managed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN inventory.products.square_item_id IS 'Square catalog item ID';
COMMENT ON COLUMN inventory.products.is_square_managed IS 'TRUE if product was auto-created from Square';

-- Indexes for Square lookups
CREATE INDEX idx_products_square_item_id ON inventory.products(square_item_id) WHERE square_item_id IS NOT NULL;
CREATE INDEX idx_products_square_managed ON inventory.products(is_square_managed) WHERE is_square_managed = TRUE;
CREATE UNIQUE INDEX idx_products_square_item_id_unique ON inventory.products(square_item_id) WHERE square_item_id IS NOT NULL;

-- ============================================================================
-- 5. Add Square fields to inventory.store_products (Store-Specific Settings)
-- ============================================================================

ALTER TABLE inventory.store_products
    ADD COLUMN IF NOT EXISTS square_variation_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS square_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS square_item_version BIGINT;

COMMENT ON COLUMN inventory.store_products.square_variation_id IS 'Square item variation ID (for size, color, etc.)';

-- Indexes for Square variation lookups
CREATE INDEX idx_store_products_square_variation ON inventory.store_products(square_variation_id) WHERE square_variation_id IS NOT NULL;
CREATE INDEX idx_store_products_store_variation ON inventory.store_products(store_id, square_variation_id) WHERE square_variation_id IS NOT NULL;

-- ============================================================================
-- 6. Add Square fields to inventory.batches
-- ============================================================================

ALTER TABLE inventory.batches
    ADD COLUMN IF NOT EXISTS square_variation_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS square_synced_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS square_quantity_synced DECIMAL(12,4),
    -- Audit trail: Link batches to specific Square sales (from roadmap)
    ADD COLUMN IF NOT EXISTS square_order_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS square_line_item_id VARCHAR(255);

COMMENT ON COLUMN inventory.batches.square_variation_id IS 'Square variation ID for inventory sync';
COMMENT ON COLUMN inventory.batches.square_order_id IS 'Square order ID for sales audit trail';
COMMENT ON COLUMN inventory.batches.square_line_item_id IS 'Square line item ID for detailed sales tracking';

-- Indexes for Square batch lookups
CREATE INDEX idx_batches_square_variation ON inventory.batches(square_variation_id) WHERE square_variation_id IS NOT NULL;
CREATE INDEX idx_batches_square_order ON inventory.batches(square_order_id) WHERE square_order_id IS NOT NULL;

-- ============================================================================
-- 7. Row Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS on integrations tables
ALTER TABLE integrations.square_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.square_sync_history ENABLE ROW LEVEL SECURITY;

-- square_connections: Users can only access connections for their stores
CREATE POLICY square_connections_tenant_isolation
ON integrations.square_connections
FOR ALL
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM business.stores
        WHERE owner_id = auth.uid()
        UNION
        SELECT store_id
        FROM business.store_users
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

-- Service role can access all connections (for background jobs)
CREATE POLICY square_connections_service_role
ON integrations.square_connections
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- square_sync_history: Users can only access sync history for their stores
CREATE POLICY square_sync_history_tenant_isolation
ON integrations.square_sync_history
FOR ALL
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM business.stores
        WHERE owner_id = auth.uid()
        UNION
        SELECT store_id
        FROM business.store_users
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

-- Service role can access all sync history
CREATE POLICY square_sync_history_service_role
ON integrations.square_sync_history
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- ============================================================================
-- 8. Update timestamp trigger for square_connections
-- ============================================================================

CREATE OR REPLACE FUNCTION integrations.update_square_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_square_connections_updated_at
    BEFORE UPDATE ON integrations.square_connections
    FOR EACH ROW
    EXECUTE FUNCTION integrations.update_square_connections_updated_at();

-- ============================================================================
-- 9. HIGH PRIORITY: Create square_sync_state table (from roadmap)
-- ============================================================================
-- Purpose: Track ongoing sync operations and manage Square pagination cursors
-- Critical for: Incremental syncing, resume capability, cursor management

CREATE TABLE integrations.square_sync_state (
    sync_state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,

    -- Current state tracking
    last_successful_sync_at TIMESTAMPTZ,
    sync_cursor TEXT, -- Square pagination cursor for incremental sync
    square_catalog_version BIGINT, -- Square catalog version for change detection

    -- Status and error tracking
    current_status VARCHAR(50) DEFAULT 'idle',
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    UNIQUE(store_id, sync_type),
    CHECK (sync_type IN ('catalog', 'inventory', 'orders')),
    CHECK (current_status IN ('idle', 'running', 'failed', 'paused'))
);

COMMENT ON TABLE integrations.square_sync_state IS 'Tracks ongoing sync state and Square pagination cursors per store';
COMMENT ON COLUMN integrations.square_sync_state.sync_cursor IS 'Square API pagination cursor for resuming incremental syncs';
COMMENT ON COLUMN integrations.square_sync_state.square_catalog_version IS 'Square catalog version number for detecting changes';

-- Indexes for sync_state
CREATE INDEX idx_square_sync_state_store ON integrations.square_sync_state(store_id);
CREATE INDEX idx_square_sync_state_status ON integrations.square_sync_state(current_status) WHERE current_status != 'idle';
CREATE INDEX idx_square_sync_state_type_status ON integrations.square_sync_state(sync_type, current_status);

-- RLS for sync_state
ALTER TABLE integrations.square_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY square_sync_state_tenant_isolation
ON integrations.square_sync_state
FOR ALL
TO authenticated
USING (
    store_id IN (
        SELECT store_id
        FROM business.stores
        WHERE owner_id = auth.uid()
        UNION
        SELECT store_id
        FROM business.store_users
        WHERE user_id = auth.uid() AND is_active = TRUE
    )
);

CREATE POLICY square_sync_state_service_role
ON integrations.square_sync_state
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Update timestamp trigger for sync_state
CREATE OR REPLACE FUNCTION integrations.update_square_sync_state_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_square_sync_state_updated_at
    BEFORE UPDATE ON integrations.square_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION integrations.update_square_sync_state_updated_at();

-- ============================================================================
-- 10. MEDIUM PRIORITY: Create square_webhook_events table (Tier 3)
-- ============================================================================
-- Purpose: Store and process Square webhook events for real-time updates
-- Critical for: Real-time inventory sync, order updates, catalog changes

CREATE TABLE integrations.square_webhook_events (
    event_id VARCHAR(255) PRIMARY KEY, -- Square's unique event_id
    square_merchant_id VARCHAR(255) NOT NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    location_id VARCHAR(255),

    -- Processing status
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    processing_status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Raw webhook payload
    payload JSONB NOT NULL,

    -- Constraints
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

COMMENT ON TABLE integrations.square_webhook_events IS 'Stores Square webhook events for real-time sync (Tier 3)';
COMMENT ON COLUMN integrations.square_webhook_events.event_id IS 'Square unique event ID - prevents duplicate processing';
COMMENT ON COLUMN integrations.square_webhook_events.payload IS 'Raw webhook payload for debugging and reprocessing';

-- Indexes for webhook_events
CREATE INDEX idx_webhook_events_status ON integrations.square_webhook_events(processing_status, received_at);
CREATE INDEX idx_webhook_events_merchant ON integrations.square_webhook_events(square_merchant_id);
CREATE INDEX idx_webhook_events_type ON integrations.square_webhook_events(event_type);
CREATE INDEX idx_webhook_events_received ON integrations.square_webhook_events(received_at DESC);

-- RLS for webhook_events (service role only for security)
ALTER TABLE integrations.square_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY square_webhook_events_service_role
ON integrations.square_webhook_events
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- ============================================================================
-- 11. HELPER VIEWS: Sync monitoring and health checks
-- ============================================================================

-- View: Active sync operations across all stores
CREATE OR REPLACE VIEW integrations.square_sync_active AS
SELECT
    ss.sync_state_id,
    ss.store_id,
    s.store_name,
    ss.sync_type,
    ss.current_status,
    ss.last_successful_sync_at,
    ss.error_count,
    sc.square_merchant_id,
    sc.connection_status
FROM integrations.square_sync_state ss
JOIN business.stores s ON ss.store_id = s.store_id
LEFT JOIN integrations.square_connections sc ON ss.store_id = sc.store_id
WHERE ss.current_status IN ('running', 'failed')
ORDER BY ss.updated_at DESC;

COMMENT ON VIEW integrations.square_sync_active IS 'Monitor currently running or failed sync operations';

-- View: Connection health dashboard
CREATE OR REPLACE VIEW integrations.square_connection_health AS
SELECT
    sc.connection_id,
    sc.store_id,
    s.store_name,
    sc.square_merchant_id,
    sc.connection_status,
    sc.token_expires_at,
    sc.last_token_refresh_at,
    sc.last_sync_at,
    sc.connected_at,
    sc.disconnected_at,
    EXTRACT(EPOCH FROM (sc.token_expires_at - NOW())) / 86400 AS days_until_token_expiry,
    CASE
        WHEN sc.token_expires_at < NOW() THEN 'expired'
        WHEN sc.token_expires_at < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
        ELSE 'healthy'
    END AS token_health,
    (
        SELECT COUNT(*)
        FROM integrations.square_sync_history sh
        WHERE sh.connection_id = sc.connection_id
        AND sh.sync_status = 'failed'
        AND sh.started_at > NOW() - INTERVAL '24 hours'
    ) AS failed_syncs_24h
FROM integrations.square_connections sc
JOIN business.stores s ON sc.store_id = s.store_id
WHERE sc.is_active = TRUE
ORDER BY sc.updated_at DESC;

COMMENT ON VIEW integrations.square_connection_health IS 'Square connection health dashboard with token expiry monitoring';

-- ============================================================================
-- Migration complete - Sync state management & webhooks
-- ============================================================================
