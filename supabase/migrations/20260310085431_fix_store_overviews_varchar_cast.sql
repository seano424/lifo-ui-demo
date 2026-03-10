-- Migration: Fix get_user_store_overviews varchar/text type mismatch
--
-- The business.stores table has varchar(255) columns but the function
-- declared them as text in RETURNS TABLE. PostgreSQL raised:
--   "Returned type character varying(255) does not match expected type text in column N"
-- (error code 42804), which crashed the onboarding page via throwOnError.
--
-- Fix: explicit ::text casts on all varchar columns in the SELECT.

CREATE OR REPLACE FUNCTION public.get_user_store_overviews()
RETURNS TABLE (
  store_id             uuid,
  store_name           text,
  store_code           text,
  business_name        text,
  address              text,
  city                 text,
  postal_code          text,
  country              text,
  timezone             text,
  store_type           text,
  is_active            boolean,
  onboarding_completed boolean,
  owner_id             uuid,
  created_at           timestamptz,
  updated_at           timestamptz,
  role_in_store        text,
  permissions          jsonb,
  product_count        bigint,
  category_count       bigint,
  is_square_store      boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'business', 'inventory', 'integrations', 'public'
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT
    s.store_id,
    s.store_name::text,
    s.store_code::text,
    s.business_name::text,
    s.address::text,
    s.city::text,
    s.postal_code::text,
    s.country::text,
    s.timezone::text,
    s.store_type::text,
    s.is_active,
    s.onboarding_completed,
    s.owner_id,
    s.created_at,
    s.updated_at,
    su.role_in_store::text,
    su.permissions,
    COALESCE(pc.product_count, 0)  AS product_count,
    COALESCE(pc.category_count, 0) AS category_count,
    COALESCE(sq.is_square_store, false) AS is_square_store
  FROM business.store_users su
  INNER JOIN business.stores s ON su.store_id = s.store_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(DISTINCT b.product_id)    AS product_count,
      COUNT(DISTINCT p.category_id)   AS category_count
    FROM inventory.batches b
    INNER JOIN inventory.products p ON b.product_id = p.product_id
    WHERE b.store_id = s.store_id
  ) pc ON true
  LEFT JOIN LATERAL (
    SELECT true AS is_square_store
    FROM integrations.square_connections sc
    WHERE sc.store_id = s.store_id
      AND sc.is_active = true
    LIMIT 1
  ) sq ON true
  WHERE su.user_id = current_user_id
    AND su.is_active = true
    AND s.is_active = true
  ORDER BY pc.product_count DESC NULLS LAST, s.store_name ASC;
END;
$$;

COMMENT ON FUNCTION public.get_user_store_overviews() IS
  'Returns all active stores for the current user with product counts, category counts, and Square connection status. Explicit ::text casts added to handle varchar(255) columns.';

GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_store_overviews() TO service_role;
