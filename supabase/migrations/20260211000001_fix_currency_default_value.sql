-- Fix the malformed default value for currency column in store_settings
-- The default was '''USD''' which evaluates to 'USD' (7 chars with quotes)
-- This exceeds the varchar(3) limit. Change to proper 'USD' (3 chars).

ALTER TABLE business.store_settings
ALTER COLUMN currency SET DEFAULT 'USD'::character varying;

-- Update any existing records that might have the malformed value
UPDATE business.store_settings
SET currency = 'USD'
WHERE currency IS NULL OR LENGTH(currency) > 3;
