-- Migration: 022_fix_username_case_sensitivity.sql
-- Fix username case sensitivity issues in production
-- This creates a case-insensitive username lookup function

BEGIN;

-- Drop existing function if it exists (for idempotency)
DROP FUNCTION IF EXISTS public.get_user_by_username CASCADE;

-- Create case-insensitive username lookup function
CREATE OR REPLACE FUNCTION public.get_user_by_username(p_username text)
RETURNS TABLE (
    id uuid,
    email text,
    username text,
    full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Normalize the username: lowercase and handle dots/dashes
    -- This handles cases like: Romain.t, romain.t, romain-t, ROMAIN.T
    RETURN QUERY
    SELECT
        au.id,
        au.email::text,
        COALESCE(au.raw_user_meta_data->>'username', au.user_metadata->>'username')::text as username,
        COALESCE(au.raw_user_meta_data->>'full_name', au.user_metadata->>'full_name')::text as full_name
    FROM auth.users au
    WHERE
        -- Case-insensitive match on username
        LOWER(COALESCE(au.raw_user_meta_data->>'username', au.user_metadata->>'username')) = LOWER(p_username)
        OR
        -- Also check with dots replaced by dashes
        LOWER(REPLACE(COALESCE(au.raw_user_meta_data->>'username', au.user_metadata->>'username'), '.', '-')) = LOWER(REPLACE(p_username, '.', '-'))
        OR
        -- Also check with dashes replaced by dots
        LOWER(REPLACE(COALESCE(au.raw_user_meta_data->>'username', au.user_metadata->>'username'), '-', '.')) = LOWER(REPLACE(p_username, '-', '.'))
        OR
        -- Direct email match (case-insensitive)
        LOWER(au.email) = LOWER(p_username)
    LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated and anon roles
GRANT EXECUTE ON FUNCTION public.get_user_by_username TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_username TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_by_username TO service_role;

-- Add an index for better performance on username lookups
-- Note: This is a functional index on the JSONB field
CREATE INDEX IF NOT EXISTS idx_users_username_lower
ON auth.users (LOWER(COALESCE(raw_user_meta_data->>'username', user_metadata->>'username')));

-- Add a comment explaining the function
COMMENT ON FUNCTION public.get_user_by_username IS 'Case-insensitive username lookup that handles variations like dots and dashes';

COMMIT;

-- Test queries (run these manually to verify):
-- SELECT * FROM public.get_user_by_username('romain.t');
-- SELECT * FROM public.get_user_by_username('Romain.T');
-- SELECT * FROM public.get_user_by_username('romain-t');