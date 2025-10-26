-- Migration: 033_add_missing_action_type_enum_values.sql
-- Add missing 'sold' and 'donate_prepared' values to action_type enum
-- These values are already used in TypeScript types but missing from database enum

-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block
-- These must run separately

DO $$
BEGIN
    -- Check if 'sold' exists, add if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'sold'
        AND enumtypid = 'public.action_type'::regtype
    ) THEN
        ALTER TYPE public.action_type ADD VALUE 'sold';
    END IF;

    -- Check if 'donate_prepared' exists, add if not
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'donate_prepared'
        AND enumtypid = 'public.action_type'::regtype
    ) THEN
        ALTER TYPE public.action_type ADD VALUE 'donate_prepared';
    END IF;
END $$;

-- Add comment to document the complete enum
COMMENT ON TYPE public.action_type IS 'Action types for batch operations: discount, donate, donate_prepared, dispose, maintain, ignored, sold';
