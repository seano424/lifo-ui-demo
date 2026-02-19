-- Adding the column lifecycle_status that exists in the prod db, but no associated migration
ALTER TABLE inventory.batches
ADD COLUMN IF NOT EXISTS lifecycle_status VARCHAR(20) DEFAULT 'active';

COMMENT ON COLUMN inventory.batches.lifecycle_status IS 'Time-based lifecycle status: active (not yet expired) or expired (past expiry date). Independent of disposition status.';