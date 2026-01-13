-- Migration: Add reason tracking columns to batch_actions
-- Description: Adds dismissal_reason, sale_timing, and sale_occurred_at columns
--              to enable structured tracking of action metadata

-- ============================================================================
-- STEP 1: Add new columns to batch_actions table
-- ============================================================================

-- Add dismissal_reason for 'ignored' actions
-- This mirrors the disposal_reason pattern for dispose actions
ALTER TABLE inventory.batch_actions
ADD COLUMN IF NOT EXISTS dismissal_reason TEXT;

-- Add sale_timing for 'sold' actions
-- Tracks when the sale occurred relative to when it was recorded
-- Values: 'just-now', 'today', 'yesterday', 'this-week', 'custom'
ALTER TABLE inventory.batch_actions
ADD COLUMN IF NOT EXISTS sale_timing TEXT;

-- Add sale_occurred_at for precise sale timestamps
-- Optional - used when sale_timing is 'custom' or for analytics
ALTER TABLE inventory.batch_actions
ADD COLUMN IF NOT EXISTS sale_occurred_at TIMESTAMPTZ;

-- ============================================================================
-- STEP 2: Add CHECK constraint for sale_timing values
-- ============================================================================

ALTER TABLE inventory.batch_actions
ADD CONSTRAINT valid_sale_timing CHECK (
  sale_timing IS NULL OR
  sale_timing IN ('just-now', 'today', 'yesterday', 'this-week', 'custom')
);

-- ============================================================================
-- STEP 3: Backfill existing 'sold' actions with default timing
-- ============================================================================

-- Set existing sold actions to 'just-now' as default
-- This ensures the constraint update won't fail
UPDATE inventory.batch_actions
SET sale_timing = 'just-now'
WHERE action_type = 'sold'
AND sale_timing IS NULL;

-- ============================================================================
-- STEP 4: Backfill existing 'ignored' actions with default reason
-- ============================================================================

-- Set existing ignored actions to a default reason
UPDATE inventory.batch_actions
SET dismissal_reason = 'legacy_action'
WHERE action_type = 'ignored'
AND dismissal_reason IS NULL;

-- ============================================================================
-- STEP 5: Update the valid_action_specific_fields CHECK constraint
-- ============================================================================

-- Drop the existing constraint
ALTER TABLE inventory.batch_actions
DROP CONSTRAINT IF EXISTS valid_action_specific_fields;

-- Add updated constraint that requires:
-- - discount_percentage for 'discount' actions
-- - disposal_reason for 'dispose' actions
-- - dismissal_reason for 'ignored' actions (NEW)
-- - sale_timing for 'sold' actions (NEW)
-- - No specific requirements for 'donate', 'maintain', 'donate_prepared'
ALTER TABLE inventory.batch_actions
ADD CONSTRAINT valid_action_specific_fields CHECK (
  (action_type = 'discount' AND discount_percentage IS NOT NULL) OR
  (action_type = 'donate') OR
  (action_type = 'dispose' AND disposal_reason IS NOT NULL) OR
  (action_type = 'ignored' AND dismissal_reason IS NOT NULL) OR
  (action_type = 'sold' AND sale_timing IS NOT NULL) OR
  (action_type IN ('maintain', 'donate_prepared'))
);

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN inventory.batch_actions.dismissal_reason IS
'Reason why the AI recommendation was dismissed/ignored. Required for ignored actions.';

COMMENT ON COLUMN inventory.batch_actions.sale_timing IS
'When the sale occurred: just-now, today, yesterday, this-week, custom. Required for sold actions.';

COMMENT ON COLUMN inventory.batch_actions.sale_occurred_at IS
'Precise timestamp of when sale occurred. Optional, used for custom timing or analytics.';
