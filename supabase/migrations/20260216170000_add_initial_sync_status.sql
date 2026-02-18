-- Add initial_sync_status tracking to square_connections
-- Tracks auto-sync progress after OAuth connection (pending -> syncing -> completed/failed)

ALTER TABLE integrations.square_connections
  ADD COLUMN IF NOT EXISTS initial_sync_status varchar(50) DEFAULT 'pending'
    CHECK (initial_sync_status IN ('pending', 'syncing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS initial_sync_error text;
