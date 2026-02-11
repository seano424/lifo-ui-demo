-- Drop the old function signature with jsonb[] parameters
-- This resolves the "Could not choose the best candidate function" error
-- by ensuring only one signature exists

DROP FUNCTION IF EXISTS public.save_batch_tracking_setup(
  uuid,
  jsonb,
  jsonb[],
  jsonb[]
);

-- The correct function signature (jsonb parameters) already exists from
-- migration 20260204173000_fix_batch_tracking_authorization.sql
-- No need to recreate it here.
