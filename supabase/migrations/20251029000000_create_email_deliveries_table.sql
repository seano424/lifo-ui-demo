-- Migration: Create email_deliveries table for tracking email deliveries via Resend
-- Purpose: Track personalized emails sent via Supabase webhooks (e.g., store onboarding emails)
-- Schema: user_mgmt
-- Created: 2025-10-29

-- =====================================================================================
-- TABLE DEFINITION
-- =====================================================================================

CREATE TABLE IF NOT EXISTS user_mgmt.email_deliveries (
  -- Primary identification
  email_delivery_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  store_id UUID NOT NULL REFERENCES business.stores(store_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email details
  recipient_email TEXT NOT NULL,
  email_type TEXT NOT NULL CHECK (
    email_type IN (
      'onboarding_welcome',
      'store_created',
      'invitation',
      'password_reset',
      'notification',
      'marketing',
      'transactional'
    )
  ),
  subject TEXT NOT NULL,
  template_id TEXT, -- Resend template identifier (if using templates)

  -- Resend integration
  resend_email_id TEXT, -- ID returned by Resend API
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',      -- Email queued for sending
      'sent',         -- Email sent to Resend
      'delivered',    -- Email delivered to recipient
      'failed',       -- Email failed to send
      'bounced',      -- Email bounced
      'complained',   -- Recipient marked as spam
      'opened',       -- Recipient opened email
      'clicked'       -- Recipient clicked link in email
    )
  ),
  error_message TEXT, -- Error details if failed
  error_code TEXT,    -- Resend error code

  -- Retry logic
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_retry_at TIMESTAMP,
  next_retry_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  failed_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Additional data
  email_data JSONB DEFAULT '{}'::jsonb, -- Dynamic data for email template
  metadata JSONB DEFAULT '{}'::jsonb,   -- Additional tracking info (campaign_id, etc.)
  webhook_event_ids TEXT[] DEFAULT ARRAY[]::TEXT[] -- Array of Resend webhook event IDs
);

-- =====================================================================================
-- INDEXES
-- =====================================================================================

-- Index for querying emails by store
CREATE INDEX idx_email_deliveries_store_id
  ON user_mgmt.email_deliveries(store_id);

-- Index for querying emails by user
CREATE INDEX idx_email_deliveries_user_id
  ON user_mgmt.email_deliveries(user_id);

-- Index for filtering by email type
CREATE INDEX idx_email_deliveries_email_type
  ON user_mgmt.email_deliveries(email_type);

-- Index for filtering by status
CREATE INDEX idx_email_deliveries_status
  ON user_mgmt.email_deliveries(status);

-- Index for time-based queries (most recent first)
CREATE INDEX idx_email_deliveries_created_at
  ON user_mgmt.email_deliveries(created_at DESC);

-- Composite index for efficient store + email type queries
CREATE INDEX idx_email_deliveries_store_email_type
  ON user_mgmt.email_deliveries(store_id, email_type, created_at DESC);

-- Index for Resend webhook lookups
CREATE INDEX idx_email_deliveries_resend_id
  ON user_mgmt.email_deliveries(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- Index for retry processing (find pending/failed emails that need retry)
CREATE INDEX idx_email_deliveries_retry_queue
  ON user_mgmt.email_deliveries(next_retry_at, status)
  WHERE next_retry_at IS NOT NULL AND status IN ('pending', 'failed');

-- =====================================================================================
-- TRIGGER: Update updated_at timestamp
-- =====================================================================================

CREATE OR REPLACE FUNCTION user_mgmt.update_email_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_deliveries_updated_at
  BEFORE UPDATE ON user_mgmt.email_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION user_mgmt.update_email_deliveries_updated_at();

-- =====================================================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================================================

-- Enable RLS
ALTER TABLE user_mgmt.email_deliveries ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all email deliveries
CREATE POLICY "Admins can view all email deliveries"
  ON user_mgmt.email_deliveries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_mgmt.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = (SELECT role_id FROM user_mgmt.roles WHERE role_name = 'admin')
    )
  );

-- Policy: Store owners/managers can view their store's email deliveries
CREATE POLICY "Store users can view their store email deliveries"
  ON user_mgmt.email_deliveries
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM business.store_users
      WHERE user_id = auth.uid()
      AND role_in_store IN ('owner', 'manager')
      AND is_active = true
    )
  );

-- Policy: Users can view emails sent to them
CREATE POLICY "Users can view their own email deliveries"
  ON user_mgmt.email_deliveries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Service role can insert email deliveries (for webhooks and automated processes)
CREATE POLICY "Service role can insert email deliveries"
  ON user_mgmt.email_deliveries
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Service role can update email deliveries (for status updates from Resend webhooks)
CREATE POLICY "Service role can update email deliveries"
  ON user_mgmt.email_deliveries
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================================================
-- HELPER FUNCTION: Create email delivery record
-- =====================================================================================

CREATE OR REPLACE FUNCTION user_mgmt.create_email_delivery(
  p_store_id UUID,
  p_user_id UUID,
  p_recipient_email TEXT,
  p_email_type TEXT,
  p_subject TEXT,
  p_template_id TEXT DEFAULT NULL,
  p_email_data JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_email_delivery_id UUID;
BEGIN
  INSERT INTO user_mgmt.email_deliveries (
    store_id,
    user_id,
    recipient_email,
    email_type,
    subject,
    template_id,
    email_data,
    metadata,
    status
  ) VALUES (
    p_store_id,
    p_user_id,
    p_recipient_email,
    p_email_type,
    p_subject,
    p_template_id,
    p_email_data,
    p_metadata,
    'pending'
  )
  RETURNING email_delivery_id INTO v_email_delivery_id;

  RETURN v_email_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION user_mgmt.create_email_delivery TO service_role;

-- =====================================================================================
-- HELPER FUNCTION: Update email delivery status
-- =====================================================================================

CREATE OR REPLACE FUNCTION user_mgmt.update_email_delivery_status(
  p_email_delivery_id UUID,
  p_status TEXT,
  p_resend_email_id TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_error_code TEXT DEFAULT NULL,
  p_webhook_event_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_status TEXT;
BEGIN
  -- Get current status
  SELECT status INTO v_current_status
  FROM user_mgmt.email_deliveries
  WHERE email_delivery_id = p_email_delivery_id;

  IF v_current_status IS NULL THEN
    RETURN FALSE; -- Record not found
  END IF;

  -- Update the delivery record
  UPDATE user_mgmt.email_deliveries
  SET
    status = p_status,
    resend_email_id = COALESCE(p_resend_email_id, resend_email_id),
    error_message = p_error_message,
    error_code = p_error_code,
    sent_at = CASE WHEN p_status = 'sent' AND sent_at IS NULL THEN NOW() ELSE sent_at END,
    delivered_at = CASE WHEN p_status = 'delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
    opened_at = CASE WHEN p_status = 'opened' AND opened_at IS NULL THEN NOW() ELSE opened_at END,
    clicked_at = CASE WHEN p_status = 'clicked' AND clicked_at IS NULL THEN NOW() ELSE clicked_at END,
    failed_at = CASE WHEN p_status = 'failed' AND failed_at IS NULL THEN NOW() ELSE failed_at END,
    webhook_event_ids = CASE
      WHEN p_webhook_event_id IS NOT NULL
      THEN array_append(webhook_event_ids, p_webhook_event_id)
      ELSE webhook_event_ids
    END
  WHERE email_delivery_id = p_email_delivery_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION user_mgmt.update_email_delivery_status TO service_role;

-- =====================================================================================
-- COMMENTS (Documentation)
-- =====================================================================================

COMMENT ON TABLE user_mgmt.email_deliveries IS
  'Tracks email deliveries sent via Resend, triggered by Supabase webhooks (e.g., store onboarding)';

COMMENT ON COLUMN user_mgmt.email_deliveries.email_delivery_id IS
  'Unique identifier for this email delivery';

COMMENT ON COLUMN user_mgmt.email_deliveries.store_id IS
  'Reference to the store this email is associated with';

COMMENT ON COLUMN user_mgmt.email_deliveries.user_id IS
  'Reference to the user receiving this email';

COMMENT ON COLUMN user_mgmt.email_deliveries.recipient_email IS
  'The actual email address the message was sent to';

COMMENT ON COLUMN user_mgmt.email_deliveries.email_type IS
  'Type of email: onboarding_welcome, store_created, invitation, password_reset, notification, marketing, transactional';

COMMENT ON COLUMN user_mgmt.email_deliveries.subject IS
  'Subject line of the email';

COMMENT ON COLUMN user_mgmt.email_deliveries.template_id IS
  'Resend template identifier (if using templates)';

COMMENT ON COLUMN user_mgmt.email_deliveries.resend_email_id IS
  'Email ID returned by Resend API after sending';

COMMENT ON COLUMN user_mgmt.email_deliveries.status IS
  'Current delivery status: pending, sent, delivered, failed, bounced, complained, opened, clicked';

COMMENT ON COLUMN user_mgmt.email_deliveries.error_message IS
  'Error details if the email failed to send';

COMMENT ON COLUMN user_mgmt.email_deliveries.error_code IS
  'Resend API error code if the email failed';

COMMENT ON COLUMN user_mgmt.email_deliveries.retry_count IS
  'Number of times we have attempted to send this email';

COMMENT ON COLUMN user_mgmt.email_deliveries.max_retries IS
  'Maximum number of retry attempts allowed';

COMMENT ON COLUMN user_mgmt.email_deliveries.email_data IS
  'Dynamic data used to populate the email template (JSON)';

COMMENT ON COLUMN user_mgmt.email_deliveries.metadata IS
  'Additional tracking information (campaign_id, source, etc.)';

COMMENT ON COLUMN user_mgmt.email_deliveries.webhook_event_ids IS
  'Array of Resend webhook event IDs received for this email';

COMMENT ON FUNCTION user_mgmt.create_email_delivery IS
  'Helper function to create a new email delivery record with proper validation';

COMMENT ON FUNCTION user_mgmt.update_email_delivery_status IS
  'Helper function to update email delivery status, typically called by Resend webhooks';
