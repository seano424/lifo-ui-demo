-- Migration: 033_add_missing_action_type_enum_values.sql
-- Add missing 'sold' and 'donate_prepared' values to action_type enum
-- These values are already used in TypeScript types but missing from database enum

BEGIN;

-- Add missing enum values to action_type
ALTER TYPE public.action_type ADD VALUE IF NOT EXISTS 'sold';
ALTER TYPE public.action_type ADD VALUE IF NOT EXISTS 'donate_prepared';

-- Add comment to document the complete enum
COMMENT ON TYPE public.action_type IS 'Action types for batch operations: discount, donate, donate_prepared, dispose, maintain, ignored, sold';

COMMIT;
