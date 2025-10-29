-- Migration: 20251029202218_add_language_and_auth_email_types.sql
-- Description: Add language support and auth-related email types to email_deliveries table
-- Applied: 2025-10-29

-- Add language column to track email language preference
ALTER TABLE user_mgmt.email_deliveries
ADD COLUMN language VARCHAR(2) DEFAULT 'fr' CHECK (language IN ('en', 'fr', 'nl'));

-- Update email_type constraint to include auth-related emails
ALTER TABLE user_mgmt.email_deliveries
DROP CONSTRAINT email_deliveries_email_type_check;

ALTER TABLE user_mgmt.email_deliveries
ADD CONSTRAINT email_deliveries_email_type_check
CHECK (email_type IN (
  -- Existing types
  'onboarding_welcome',
  'store_created',
  'invitation',
  'password_reset',
  'notification',
  'marketing',
  'transactional',
  -- New auth email types
  'signup_confirmation',
  'password_updated',
  'email_changed'
));

-- Add index for language queries
CREATE INDEX IF NOT EXISTS idx_email_deliveries_language
ON user_mgmt.email_deliveries(language);

-- Add comment for documentation
COMMENT ON COLUMN user_mgmt.email_deliveries.language IS
'Language used for email content: en (English), fr (French), nl (Dutch)';
