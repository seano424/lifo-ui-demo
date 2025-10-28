-- Migration: Create webhook_logs table for tracking webhook processing
-- Purpose: Log scoring setup and welcome email webhook executions

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_type VARCHAR(50) NOT NULL, -- 'store_scoring_setup', 'welcome_email', etc.
  store_id UUID REFERENCES business.stores(store_id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
  payload JSONB, -- Store request/response data
  error_message TEXT, -- Error details if failed
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  retry_count INTEGER DEFAULT 0
);

-- Index for querying logs by store
CREATE INDEX idx_webhook_logs_store_id ON public.webhook_logs(store_id);

-- Index for querying logs by type and status
CREATE INDEX idx_webhook_logs_type_status ON public.webhook_logs(webhook_type, status);

-- Index for querying recent logs
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all webhook logs
CREATE POLICY "Admins can view all webhook logs"
  ON public.webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_mgmt.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role_id = (SELECT role_id FROM user_mgmt.roles WHERE role_name = 'admin')
    )
  );

-- Policy: Store owners/managers can view their store's webhook logs
CREATE POLICY "Store users can view their store webhook logs"
  ON public.webhook_logs
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM business.store_users
      WHERE user_id = auth.uid()
      AND role_in_store IN ('owner', 'manager')
    )
  );

-- Policy for webhooks to insert logs (service role only for security)
CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.webhook_logs IS 'Logs webhook processing for scoring setup, emails, and other automated actions';
COMMENT ON COLUMN public.webhook_logs.webhook_type IS 'Type of webhook: store_scoring_setup, welcome_email, etc.';
COMMENT ON COLUMN public.webhook_logs.status IS 'Processing status: success, failed, pending';
COMMENT ON COLUMN public.webhook_logs.payload IS 'JSON data from webhook request/response';