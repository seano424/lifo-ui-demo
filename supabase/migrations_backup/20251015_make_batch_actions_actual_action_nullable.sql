-- Migration: Make actual_action nullable in batch_actions table
-- This allows tracking pending AI recommendations (actual_action = NULL)
-- before the user takes action

BEGIN;

-- Make actual_action nullable to support pending recommendations
ALTER TABLE inventory.batch_actions
ALTER COLUMN actual_action DROP NOT NULL;

-- Add a comment explaining the semantics
COMMENT ON COLUMN inventory.batch_actions.actual_action IS
'The action the user actually took. NULL indicates a pending recommendation that the user has not yet acted upon.';

COMMIT;
