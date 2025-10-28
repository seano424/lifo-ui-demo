-- Enable RLS on temporary staging tables
-- These tables were missing RLS in the initial schema export

-- Enable RLS
ALTER TABLE "public"."temp_batch_actions_staging" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."temp_scores_staging" ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for temp_batch_actions_staging
-- Users can only access staging data for stores they belong to
CREATE POLICY "Users can access their store's temp batch actions"
  ON "public"."temp_batch_actions_staging"
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id
      FROM business.store_users
      WHERE user_id = auth.uid()
    )
  );

-- Add RLS policies for temp_scores_staging
-- Users can only access staging data for stores they belong to
CREATE POLICY "Users can access their store's temp scores"
  ON "public"."temp_scores_staging"
  FOR ALL
  USING (
    store_id IN (
      SELECT store_id
      FROM business.store_users
      WHERE user_id = auth.uid()
    )
  );

-- Service role should have full access (for backend operations)
-- These policies are implicitly allowed for service_role, but we document it here

-- Note: UNLOGGED tables are used for performance (not crash-safe)
-- Data in these tables is temporary and can be regenerated
