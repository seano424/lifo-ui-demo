-- Migration: Add 'draft' status and make expiry dates nullable in batches table
--
-- Context: Supporting CSV uploads for products without expiry dates (onboarding workflow).
-- Users can upload products initially without expiry data, then add it later.
--
-- Workflow:
--   1. CSV upload without expiry → creates batch with status='draft', expiry_date=NULL
--   2. User adds expiry date → batch transitions to status='active'
--   3. AI scoring only works on 'active' batches with valid expiry dates
--
-- Status progression: draft → active → expired/donated/damaged/sold_out

-- Step 1: Make expiry dates nullable (required for draft batches)
ALTER TABLE inventory.batches
  ALTER COLUMN expiry_date DROP NOT NULL,
  ALTER COLUMN manufacture_date DROP NOT NULL;

-- Step 2: Add 'draft' status to allowed values
ALTER TABLE inventory.batches
  DROP CONSTRAINT IF EXISTS batches_status_check;

ALTER TABLE inventory.batches
  ADD CONSTRAINT batches_status_check
  CHECK (status IN (
    'draft',        -- NEW: Batch created without expiry date, needs completion
    'active',       -- Has expiry date, being tracked
    'expired',      -- Past expiry date
    'damaged',      -- Marked as damaged
    'sold_out',     -- Fully consumed
    'reserved',     -- Reserved for specific use
    'donated'       -- Donated to charity
  ));

-- Step 3: Add validation constraint - draft batches should not have expiry dates
-- (This ensures data integrity - if status is draft, expiry should be null)
ALTER TABLE inventory.batches
  ADD CONSTRAINT batches_draft_validation
  CHECK (
    (status = 'draft' AND expiry_date IS NULL) OR
    (status != 'draft')
  );

-- Step 4: Add comments
COMMENT ON COLUMN inventory.batches.status IS
'Batch lifecycle status. draft=needs expiry date, active=tracked, expired=past expiry, donated/damaged/sold_out=final states';

COMMENT ON COLUMN inventory.batches.expiry_date IS
'Expiry date for the batch. NULL for draft batches (incomplete data). Required for active status.';

-- Step 5: Mark all existing batches as complete (they already have expiry dates)
-- No UPDATE needed - existing batches already have status='active' and valid expiry_date
