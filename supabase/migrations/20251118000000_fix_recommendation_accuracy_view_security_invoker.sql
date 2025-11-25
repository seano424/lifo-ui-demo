-- =====================================================
-- Migration: fix_recommendation_accuracy_view_security_invoker
-- Date: 2025-11-18
-- Description: Recreate recommendation_accuracy view with SECURITY INVOKER
--              to respect RLS policies instead of bypassing them
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS scoring.recommendation_accuracy;

-- Recreate the view with security_invoker=on
CREATE VIEW scoring.recommendation_accuracy
WITH (security_invoker=on)
AS
SELECT
  ps.batch_id,
  ps.store_id,
  ps.recommendation AS ai_recommended,
  ba.action_type AS user_action,
  ps.composite_score,
  ps.urgency_level,
  ps.status,
  ps.calculated_at AS ai_scored_at,
  ps.completed_at AS action_taken_at,
  ba.performed_by,
  ba.quantity_affected,
  ba.total_original_value,
  ba.total_recovered_value,
  CASE
    WHEN ba.action_type::text = ps.recommendation::text THEN true
    WHEN ba.action_type = 'discount'::action_type
      AND ps.recommendation::text = ANY (ARRAY[
        'discount_aggressive'::character varying,
        'discount_moderate'::character varying,
        'discount_light'::character varying
      ]::text[]) THEN true
    ELSE false
  END AS user_followed_ai,
  CASE
    WHEN ba.total_original_value > 0::numeric
      THEN (ba.total_recovered_value / ba.total_original_value) * 100::numeric
    ELSE 0::numeric
  END AS recovery_rate_percent
FROM scoring.product_scores ps
LEFT JOIN inventory.batch_actions ba ON ba.batch_id = ps.batch_id
WHERE ps.status = ANY (ARRAY['completed'::text, 'dismissed'::text])
ORDER BY ps.completed_at DESC;

COMMENT ON VIEW scoring.recommendation_accuracy IS
  'Analytics view comparing AI recommendations with actual user actions.
   Uses SECURITY INVOKER to respect RLS policies of the querying user.';

-- Grant appropriate access
GRANT SELECT ON scoring.recommendation_accuracy TO authenticated;
