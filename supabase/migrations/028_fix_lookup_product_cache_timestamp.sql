-- Fix timestamp type mismatch in lookup_product_with_cache RPC function
-- Error: "structure of query does not match function result type"
-- Issue: Function returns timestamp without time zone, but should return timestamptz

DROP FUNCTION IF EXISTS public.lookup_product_with_cache(text);

CREATE OR REPLACE FUNCTION public.lookup_product_with_cache(barcode_param text)
RETURNS TABLE(
  found boolean,
  source text,
  product_data jsonb,
  cached_at timestamp with time zone  -- Changed from 'timestamp without time zone'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'inventory', 'business', 'scoring'
AS $function$
DECLARE
  cache_result RECORD;
  product_result RECORD;
BEGIN
  -- First check cache
  SELECT * INTO cache_result
  FROM inventory.product_recognition_cache
  WHERE barcode = barcode_param
  LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT
      TRUE as found,
      'cache'::TEXT as source,
      cache_result.open_food_facts_data as product_data,
      cache_result.last_verified as cached_at;
    RETURN;
  END IF;

  -- Check Supabase products
  SELECT * INTO product_result
  FROM inventory.products
  WHERE barcode = barcode_param
  LIMIT 1;

  IF FOUND THEN
    -- Cache the product for future lookups
    INSERT INTO inventory.product_recognition_cache (
      barcode,
      product_name,
      brand,
      category,
      image_url,
      open_food_facts_data,
      is_verified,
      verification_count
    ) VALUES (
      barcode_param,
      product_result.name,
      product_result.brand,
      NULL, -- We'll get this from category_id later if needed
      product_result.image_url,
      COALESCE(product_result.open_food_facts_data,
        jsonb_build_object(
          'product_name', product_result.name,
          'brands', product_result.brand,
          'image_front_url', product_result.image_url
        )
      ),
      product_result.is_verified,
      1
    ) ON CONFLICT (barcode) DO UPDATE SET
      last_verified = NOW();

    RETURN QUERY SELECT
      TRUE as found,
      'supabase'::TEXT as source,
      COALESCE(product_result.open_food_facts_data,
        jsonb_build_object(
          'product_name', product_result.name,
          'brands', product_result.brand,
          'image_front_url', product_result.image_url
        )
      ) as product_data,
      NOW() as cached_at;
    RETURN;
  END IF;

  -- Not found anywhere
  RETURN QUERY SELECT
    FALSE as found,
    'none'::TEXT as source,
    NULL::JSONB as product_data,
    NULL::TIMESTAMP WITH TIME ZONE as cached_at;  -- Changed from 'NULL::TIMESTAMP'
END;
$function$;
