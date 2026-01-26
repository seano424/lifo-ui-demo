-- Migration: Add Square order tracking columns to sales.transactions
-- Purpose: Enable deduplication of Square orders and track external sales sources
-- Date: 2026-01-21
-- Add Square order tracking for deduplication and team member tracking
--Applied with migration 20260121100000_add_square_tracking_to_transactions,
-- but reverted with  remote_schema.sql migrations that synced with an outdated schema.
ALTER TABLE sales.transactions
ADD COLUMN IF NOT EXISTS square_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS square_line_item_uid VARCHAR(255),
ADD COLUMN IF NOT EXISTS square_team_member_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS external_source VARCHAR(50) DEFAULT 'manual';

-- Add descriptive comments
COMMENT ON COLUMN sales.transactions.square_order_id IS 'Square order ID for deduplication';

COMMENT ON COLUMN sales.transactions.square_line_item_uid IS 'Square line item UID for deduplication';

COMMENT ON COLUMN sales.transactions.square_team_member_id IS 'Square team member who processed the sale (if available from tender/payment)';

COMMENT ON COLUMN sales.transactions.external_source IS 'Source of transaction: manual, square, pos_import';

-- Index for deduplication queries - partial index only for Square transactions
CREATE INDEX IF NOT EXISTS idx_transactions_square_order ON sales.transactions (square_order_id, square_line_item_uid)
WHERE
    square_order_id IS NOT NULL;

-- Unique constraint to prevent duplicate line items from Square
-- Using partial unique index since square_order_id can be NULL for manual transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_square_line_item_unique ON sales.transactions (square_order_id, square_line_item_uid)
WHERE
    square_order_id IS NOT NULL
    AND square_line_item_uid IS NOT NULL;