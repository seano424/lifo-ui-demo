-- =====================================================================
-- Square POS Integration Schema
-- =====================================================================
-- Purpose: Complete database schema for Square POS OAuth integration
-- with encrypted token storage, sync state management, and webhook support
--
-- Design Decisions:
-- 1. 1:N Store Mapping: Multiple Square connections per LIFO store
--    (Supports multiple Square locations for one business)
-- 2. Standardized naming: 'orders' (not 'sales') throughout
-- 3. Composite FK: Ensures store_id in sync_history matches connection
-- 4. Cursor-based pagination: Via square_sync_state table
-- 5. Webhook foundation: For Tier 3 real-time sync
--
-- Created: 2025-12-09
-- =====================================================================

-- Create integrations schema if not exists
CREATE SCHEMA IF NOT EXISTS integrations;

COMMENT ON SCHEMA integrations IS 'Third-party POS and service integrations';
-- =====================================================================
-- Table: square_connections
-- =====================================================================
-- Purpose: Store Square OAuth connections with encrypted tokens
-- Cardinality: Multiple connections allowed per store (1:N)
-- =====================================================================

CREATE TABLE IF NOT EXISTS integrations.square_connections (
    -- Identity
    connection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,

    -- Square merchant information
    square_merchant_id VARCHAR(255) NOT NULL,
    square_location_id VARCHAR(255) NOT NULL,
    square_business_name VARCHAR(500),
    square_country VARCHAR(2),
    square_currency VARCHAR(3),

    -- OAuth tokens (encrypted with Fernet)
    access_token_encrypted TEXT NOT NULL,
    refresh_token_encrypted TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ NOT NULL,
    token_scopes TEXT[],

    -- Token lifecycle tracking (Roadmap: LOW priority)
    last_token_refresh_at TIMESTAMPTZ,
    token_refresh_count INTEGER DEFAULT 0,

    -- Connection status
    connection_status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    -- Connection lifecycle (Roadmap: LOW priority)
    connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    disconnected_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,

    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT square_connections_status_check
        CHECK (connection_status IN ('active', 'expired', 'revoked', 'error')),

    -- Composite unique constraint for FK integrity
    -- Allows multiple connections per store but ensures unique connection-store pairs
    UNIQUE(connection_id, store_id),

    -- Unique per Square merchant/location combination
    UNIQUE(square_merchant_id, square_location_id)
);

-- Indexes for performance
CREATE INDEX idx_square_connections_store_id
    ON integrations.square_connections(store_id)
    WHERE is_active = TRUE;

CREATE INDEX idx_square_connections_merchant_id
    ON integrations.square_connections(square_merchant_id);

CREATE INDEX idx_square_connections_token_expiry
    ON integrations.square_connections(token_expires_at)
    WHERE is_active = TRUE;

-- Comments
COMMENT ON TABLE integrations.square_connections IS
    'Square OAuth connections with encrypted tokens. Supports 1:N mapping (multiple Square locations per LIFO store).';

COMMENT ON COLUMN integrations.square_connections.access_token_encrypted IS
    'Fernet-encrypted access token. Never log decrypted value. Expires in ~30 days.';

COMMENT ON COLUMN integrations.square_connections.refresh_token_encrypted IS
    'Fernet-encrypted refresh token. Never log decrypted value. Valid indefinitely until revoked.';

COMMENT ON COLUMN integrations.square_connections.token_scopes IS
    'OAuth scopes granted by Square merchant (e.g., ITEMS_READ, INVENTORY_READ, ORDERS_READ). Useful for debugging permission issues.';

-- =====================================================================
-- Table: square_sync_history
-- =====================================================================
-- Purpose: Audit log of all sync operations
-- Features: Composite FK for data integrity, detailed error tracking
-- =====================================================================

CREATE TABLE IF NOT EXISTS integrations.square_sync_history (
    -- Identity
    sync_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Connection reference with composite FK for data integrity
    connection_id UUID NOT NULL,
    store_id UUID NOT NULL,

    -- Sync operation details
    sync_type VARCHAR(50) NOT NULL,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Timing
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Results (Roadmap: LOW priority - batch audit trail)
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,

    -- Square API details
    square_catalog_version BIGINT,
    square_order_ids TEXT[], -- For audit trail (Roadmap: LOW priority)
    square_line_item_ids TEXT[], -- For audit trail (Roadmap: LOW priority)

    -- Error handling
    error_message TEXT,
    error_code VARCHAR(100),
    error_details JSONB,

    -- Metadata
    sync_metadata JSONB,

    -- Constraints
    CONSTRAINT square_sync_history_type_check
        CHECK (sync_type IN ('catalog', 'inventory', 'orders', 'token_refresh')),

    CONSTRAINT square_sync_history_status_check
        CHECK (sync_status IN ('pending', 'in_progress', 'completed', 'failed', 'partial')),

    -- Composite FK ensures store_id matches the connection's store
    CONSTRAINT square_sync_history_connection_id_store_id_fkey
        FOREIGN KEY (connection_id, store_id)
        REFERENCES integrations.square_connections(connection_id, store_id)
        ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX idx_square_sync_history_connection_id
    ON integrations.square_sync_history(connection_id, started_at DESC);

CREATE INDEX idx_square_sync_history_store_id
    ON integrations.square_sync_history(store_id, started_at DESC);

CREATE INDEX idx_square_sync_history_sync_type
    ON integrations.square_sync_history(sync_type, started_at DESC);

CREATE INDEX idx_square_sync_history_sync_status
    ON integrations.square_sync_history(sync_status, started_at DESC);

-- Comments
COMMENT ON TABLE integrations.square_sync_history IS
    'Audit log of all Square sync operations including token refreshes.';

COMMENT ON CONSTRAINT square_sync_history_connection_id_store_id_fkey
    ON integrations.square_sync_history IS
    'Composite FK ensures store_id matches the connection''s store - data integrity safeguard';

-- =====================================================================
-- Table: square_sync_state
-- =====================================================================
-- Purpose: Track sync state and cursors for incremental syncing
-- Priority: HIGH (Roadmap requirement)
-- =====================================================================

CREATE TABLE IF NOT EXISTS integrations.square_sync_state (
    -- Identity
    sync_state_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Scope
    store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL,

    -- Cursor management for incremental syncing
    sync_cursor TEXT,
    last_cursor_updated_at TIMESTAMPTZ,

    -- Square catalog versioning
    square_catalog_version BIGINT,
    last_catalog_check_at TIMESTAMPTZ,

    -- Current sync state
    current_status VARCHAR(50) NOT NULL DEFAULT 'idle',
    last_successful_sync_at TIMESTAMPTZ,
    last_sync_error TEXT,
    consecutive_failures INTEGER DEFAULT 0,

    -- Audit timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT square_sync_state_type_check
        CHECK (sync_type IN ('catalog', 'inventory', 'orders')),

    CONSTRAINT square_sync_state_status_check
        CHECK (current_status IN ('idle', 'syncing', 'error', 'disabled')),

    -- One sync state per store per sync type
    UNIQUE(store_id, sync_type)
);

-- Indexes for performance
CREATE INDEX idx_square_sync_state_store_id
    ON integrations.square_sync_state(store_id);

CREATE INDEX idx_square_sync_state_status
    ON integrations.square_sync_state(current_status)
    WHERE current_status != 'disabled';

-- Comments
COMMENT ON TABLE integrations.square_sync_state IS
    'HIGH PRIORITY: Tracks sync cursors and state for incremental syncing. Enables efficient pagination through Square API results.';

COMMENT ON COLUMN integrations.square_sync_state.sync_cursor IS
    'Square API pagination cursor. Used for incremental syncing to avoid re-processing data.';

-- =====================================================================
-- Table: square_webhook_events
-- =====================================================================
-- Purpose: Store and process Square webhook events for real-time sync
-- Priority: MEDIUM (Roadmap - Tier 3 requirement)
-- =====================================================================

CREATE TABLE IF NOT EXISTS integrations.square_webhook_events (
    -- Identity (Square event ID)
    event_id VARCHAR(255) PRIMARY KEY,

    -- Merchant identification
    square_merchant_id VARCHAR(255) NOT NULL,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    event_created_at TIMESTAMPTZ NOT NULL,

    -- Payload
    payload JSONB NOT NULL,

    -- Processing state
    processing_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    processed_at TIMESTAMPTZ,
    processing_attempts INTEGER DEFAULT 0,
    last_processing_attempt_at TIMESTAMPTZ,

    -- Error handling
    processing_error TEXT,
    processing_error_code VARCHAR(100),

    -- Audit
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT square_webhook_events_status_check
        CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed', 'skipped'))
);

-- Indexes for performance
CREATE INDEX idx_square_webhook_events_merchant_id
    ON integrations.square_webhook_events(square_merchant_id, received_at DESC);

CREATE INDEX idx_square_webhook_events_status
    ON integrations.square_webhook_events(processing_status, received_at DESC)
    WHERE processing_status IN ('pending', 'failed');

CREATE INDEX idx_square_webhook_events_type
    ON integrations.square_webhook_events(event_type);

-- Comments
COMMENT ON TABLE integrations.square_webhook_events IS
    'MEDIUM PRIORITY: Webhook events from Square for Tier 3 real-time sync. Supports idempotent processing via event_id.';

-- =====================================================================
-- Product Schema Enhancements
-- =====================================================================
-- Add Square item/variation IDs to existing product tables
-- =====================================================================

-- Add Square item ID to products table (global catalog)
ALTER TABLE inventory.products
ADD COLUMN IF NOT EXISTS square_item_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS square_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_square_managed BOOLEAN DEFAULT FALSE,
ADD CONSTRAINT products_square_item_id_unique UNIQUE(square_item_id);

CREATE INDEX IF NOT EXISTS idx_products_square_item_id
    ON inventory.products(square_item_id)
    WHERE square_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_square_managed
    ON inventory.products(is_square_managed)
    WHERE is_square_managed = TRUE;

COMMENT ON COLUMN inventory.products.square_item_id IS
    'Square Catalog Item ID (global product catalog)';

COMMENT ON COLUMN inventory.products.square_synced_at IS
    'Last sync timestamp from Square for this product';

COMMENT ON COLUMN inventory.products.is_square_managed IS
    'TRUE if product was auto-created from Square (vs manually created in LIFO)';

-- Add Square variation ID to store_products table (store-specific)
ALTER TABLE inventory.store_products
ADD COLUMN IF NOT EXISTS square_variation_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS square_synced_at TIMESTAMPTZ,
ADD CONSTRAINT store_products_square_variation_id_unique UNIQUE(square_variation_id);

CREATE INDEX IF NOT EXISTS idx_store_products_square_variation_id
    ON inventory.store_products(square_variation_id)
    WHERE square_variation_id IS NOT NULL;

COMMENT ON COLUMN inventory.store_products.square_variation_id IS
    'Square Catalog Item Variation ID (store-specific, e.g., size/color variants)';

COMMENT ON COLUMN inventory.store_products.square_synced_at IS
    'Last sync timestamp from Square for this variation';

-- =====================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================
-- All tables use store_id for multi-tenant isolation
-- =====================================================================

-- Enable RLS on all Square integration tables
ALTER TABLE integrations.square_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.square_sync_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.square_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations.square_webhook_events ENABLE ROW LEVEL SECURITY;

-- square_connections RLS policies
CREATE POLICY square_connections_isolation_policy ON integrations.square_connections
    USING (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY square_connections_insert_policy ON integrations.square_connections
    FOR INSERT
    WITH CHECK (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
            AND role_in_store IN ('owner', 'admin')
        )
    );

CREATE POLICY square_connections_update_policy ON integrations.square_connections
    FOR UPDATE
    USING (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
            AND role_in_store IN ('owner', 'admin')
        )
    );

CREATE POLICY square_connections_delete_policy ON integrations.square_connections
    FOR DELETE
    USING (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
            AND role_in_store = 'owner'
        )
    );

-- square_sync_history RLS policies
CREATE POLICY square_sync_history_isolation_policy ON integrations.square_sync_history
    USING (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
        )
    );

-- square_sync_state RLS policies
CREATE POLICY square_sync_state_isolation_policy ON integrations.square_sync_state
    USING (
        store_id IN (
            SELECT store_id FROM business.store_users
            WHERE user_id = auth.uid()
        )
    );

-- square_webhook_events RLS policies (by merchant_id)
CREATE POLICY square_webhook_events_isolation_policy ON integrations.square_webhook_events
    USING (
        square_merchant_id IN (
            SELECT square_merchant_id
            FROM integrations.square_connections sc
            JOIN business.store_users us ON sc.store_id = us.store_id
            WHERE us.user_id = auth.uid()
        )
    );

-- =====================================================================
-- Helper Views for Monitoring
-- =====================================================================

-- Active connections with sync status
CREATE OR REPLACE VIEW integrations.v_square_connection_status AS
SELECT
    sc.connection_id,
    sc.store_id,
    s.store_name,
    sc.square_merchant_id,
    sc.square_location_id,
    sc.square_business_name,
    sc.connection_status,
    sc.is_active,
    sc.token_expires_at,
    sc.last_sync_at,
    sc.last_token_refresh_at,
    sc.connected_at,
    -- Recent sync summary
    (
        SELECT COUNT(*)
        FROM integrations.square_sync_history ssh
        WHERE ssh.connection_id = sc.connection_id
        AND ssh.started_at > NOW() - INTERVAL '24 hours'
    ) AS syncs_last_24h,
    (
        SELECT COUNT(*)
        FROM integrations.square_sync_history ssh
        WHERE ssh.connection_id = sc.connection_id
        AND ssh.sync_status = 'failed'
        AND ssh.started_at > NOW() - INTERVAL '24 hours'
    ) AS failed_syncs_last_24h
FROM integrations.square_connections sc
JOIN business.stores s ON sc.store_id = s.store_id
WHERE sc.is_active = TRUE;

COMMENT ON VIEW integrations.v_square_connection_status IS
    'Active Square connections with sync health metrics';

-- Sync state overview
CREATE OR REPLACE VIEW integrations.v_square_sync_state_overview AS
SELECT
    sss.sync_state_id,
    sss.store_id,
    s.store_name,
    sss.sync_type,
    sss.current_status,
    sss.last_successful_sync_at,
    sss.consecutive_failures,
    sss.square_catalog_version,
    sss.sync_cursor IS NOT NULL AS has_cursor,
    sss.updated_at
FROM integrations.square_sync_state sss
JOIN business.stores s ON sss.store_id = s.store_id;

COMMENT ON VIEW integrations.v_square_sync_state_overview IS
    'Overview of sync state for all stores and sync types';

-- =====================================================================
-- Triggers
-- =====================================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION integrations.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER square_connections_updated_at
    BEFORE UPDATE ON integrations.square_connections
    FOR EACH ROW
    EXECUTE FUNCTION integrations.update_updated_at_column();

CREATE TRIGGER square_sync_state_updated_at
    BEFORE UPDATE ON integrations.square_sync_state
    FOR EACH ROW
    EXECUTE FUNCTION integrations.update_updated_at_column();

-- =====================================================================
-- Grants
-- =====================================================================

-- Grant necessary permissions (adjust based on your role_in_stores)
GRANT USAGE ON SCHEMA integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA integrations TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA integrations TO anon;

-- =====================================================================
-- Migration Complete
-- =====================================================================
