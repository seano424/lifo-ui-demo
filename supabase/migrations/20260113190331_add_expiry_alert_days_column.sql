-- Add expiry_alert_days column to business.store_settings
-- This column determines how many days before expiry to alert users (default: 3 days)

alter table "business"."store_settings" add column if not exists "expiry_alert_days" integer default 3;

-- Refresh relevant views (they may reference this column implicitly)
-- Note: This may be handled by subsequent migrations
