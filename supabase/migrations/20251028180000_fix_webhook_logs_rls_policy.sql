-- Fix webhook_logs RLS policy to be service_role only
-- This migration corrects the overly permissive policy that allowed authenticated and anon roles

-- Drop the insecure policy
DROP POLICY IF EXISTS "Service role can insert webhook logs" ON public.webhook_logs;

-- Recreate with correct security (service_role only)
CREATE POLICY "Service role can insert webhook logs"
  ON public.webhook_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

COMMENT ON POLICY "Service role can insert webhook logs" ON public.webhook_logs IS 'Only service role can insert webhook logs for security. Webhooks use admin client with service role credentials.';
