-- Migration: Update batch_todo_states view to expose reason fields
-- Description: Adds last action reason fields (disposal_reason, dismissal_reason, 
--              sale_timing, donation_recipient) to the view for display in frontend

-- ============================================================================
-- Drop and recreate the view with new columns
-- ============================================================================

DROP VIEW IF EXISTS inventory.batch_todo_states;

CREATE OR REPLACE VIEW inventory.batch_todo_states
WITH (security_invoker=on)
AS
WITH all_actions AS (
  -- Get the most recent action for each batch with ALL metadata
  SELECT DISTINCT ON (batch_actions.batch_id) 
    batch_actions.batch_id,
    batch_actions.action_type AS last_action_type,
    batch_actions.performed_at AS last_action_time,
    batch_actions.quantity_affected AS last_action_quantity,
    batch_actions.discount_percentage AS action_discount_percent,
    -- NEW: Include reason fields from last action
    batch_actions.disposal_reason,
    batch_actions.dismissal_reason,
    batch_actions.sale_timing,
    batch_actions.sale_occurred_at,
    batch_actions.donation_recipient_id,
    batch_actions.notes AS last_action_notes
  FROM inventory.batch_actions
  WHERE batch_actions.action_type IS NOT NULL 
    AND batch_actions.performed_by IS NOT NULL 
    AND batch_actions.quantity_affected > 0::numeric
  ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
),
last_discount AS (
  -- Get the most recent discount for each batch
  SELECT DISTINCT ON (batch_actions.batch_id) 
    batch_actions.batch_id,
    batch_actions.discount_percentage,
    batch_actions.performed_at AS discount_applied_at
  FROM inventory.batch_actions
  WHERE batch_actions.action_type = 'discount'::action_type 
    AND batch_actions.discount_percentage IS NOT NULL
  ORDER BY batch_actions.batch_id, batch_actions.performed_at DESC
),
action_summary AS (
  -- Aggregate action counts per batch
  SELECT 
    batch_actions.batch_id,
    count(*) AS total_actions,
    sum(CASE WHEN batch_actions.action_type = 'discount'::action_type 
             THEN batch_actions.quantity_affected ELSE 0::numeric END) AS total_discounted,
    sum(CASE WHEN batch_actions.action_type = ANY (ARRAY['donate'::action_type, 'donate_prepared'::action_type]) 
             THEN batch_actions.quantity_affected ELSE 0::numeric END) AS total_donated,
    sum(CASE WHEN batch_actions.action_type = 'dispose'::action_type 
             THEN batch_actions.quantity_affected ELSE 0::numeric END) AS total_disposed,
    sum(CASE WHEN batch_actions.action_type = 'sold'::action_type 
             THEN batch_actions.quantity_affected ELSE 0::numeric END) AS total_sold,
    sum(CASE WHEN batch_actions.action_type = 'ignored'::action_type 
             THEN batch_actions.quantity_affected ELSE 0::numeric END) AS total_ignored,
    max(batch_actions.performed_at) AS last_action_date
  FROM inventory.batch_actions
  WHERE batch_actions.action_type IS NOT NULL
  GROUP BY batch_actions.batch_id
)
SELECT 
  -- Core batch fields
  b.batch_id,
  b.store_id,
  b.batch_number,
  b.expiry_date,
  b.current_quantity,
  b.available_quantity,
  b.lifecycle_status,
  b.status AS batch_status,
  
  -- Product info
  p.name AS product_name,
  p.brand AS product_brand,
  
  -- AI scoring info
  ps.recommendation AS ai_recommendation,
  ps.composite_score,
  ps.urgency_level,
  ps.calculated_at AS ai_calculated_at,
  
  -- Last action info (existing)
  aa.last_action_type,
  aa.last_action_time,
  aa.last_action_quantity,
  ld.discount_percentage AS last_discount_percent,
  
  -- NEW: Last action reason fields
  aa.disposal_reason AS last_action_disposal_reason,
  aa.dismissal_reason AS last_action_dismissal_reason,
  aa.sale_timing AS last_action_sale_timing,
  aa.sale_occurred_at AS last_action_sale_occurred_at,
  aa.donation_recipient_id AS last_action_recipient_id,
  dr.name AS last_action_recipient_name,
  aa.last_action_notes,
  
  -- Action totals
  COALESCE(acs.total_actions, 0::bigint) AS total_actions_ever,
  COALESCE(acs.total_discounted, 0::numeric) AS total_discounted_quantity,
  COALESCE(acs.total_donated, 0::numeric) AS total_donated_quantity,
  COALESCE(acs.total_disposed, 0::numeric) AS total_disposed_quantity,
  COALESCE(acs.total_sold, 0::numeric) AS total_sold_quantity,
  COALESCE(acs.total_ignored, 0::numeric) AS total_ignored_quantity,
  
  -- Pricing info
  b.cost_price,
  b.selling_price,
  CASE
    WHEN ld.discount_percentage IS NOT NULL 
    THEN b.selling_price * (1::numeric - ld.discount_percentage / 100::numeric)
    ELSE b.selling_price
  END AS current_selling_price,
  b.selling_price - COALESCE(b.cost_price, 0::numeric) AS profit_margin,
  CASE
    WHEN COALESCE(b.cost_price, 0::numeric) > 0::numeric 
    THEN (b.selling_price - COALESCE(b.cost_price, 0::numeric)) / b.cost_price * 100::numeric
    ELSE 0::numeric
  END AS profit_margin_percent,
  
  -- Value calculations
  b.current_quantity * COALESCE(b.cost_price, 0::numeric) AS potential_loss_value,
  b.current_quantity * COALESCE(b.selling_price, 0::numeric) AS potential_revenue_value,
  b.current_quantity * CASE
    WHEN ld.discount_percentage IS NOT NULL 
    THEN b.selling_price * (1::numeric - ld.discount_percentage / 100::numeric)
    ELSE b.selling_price
  END AS current_total_value,
  COALESCE(b.selling_price, 0::numeric) AS unit_price,
  
  -- Completion status
  CASE
    WHEN b.current_quantity = 0::numeric THEN 'completed'::text
    WHEN aa.last_action_type = 'ignored'::action_type THEN 'completed'::text
    WHEN aa.last_action_type = ANY (ARRAY['discount'::action_type, 'donate_prepared'::action_type]) THEN 'in_progress'::text
    WHEN (aa.last_action_type = ANY (ARRAY['donate'::action_type, 'dispose'::action_type, 'sold'::action_type])) 
         AND b.current_quantity > 0::numeric THEN 'in_progress'::text
    WHEN aa.last_action_type IS NOT NULL THEN 'in_progress'::text
    ELSE 'pending'::text
  END AS completion_status,
  
  -- Todo state (complex logic for UI grouping)
  CASE
    WHEN aa.last_action_type = 'ignored'::action_type 
         AND (ps.calculated_at IS NULL OR aa.last_action_time >= ps.calculated_at) 
    THEN 'recently_ignored'::text
    
    WHEN (ps.urgency_level = ANY (ARRAY['critical'::text, 'high'::text])) 
         AND (aa.last_action_time IS NULL OR aa.last_action_time < ps.calculated_at) 
         AND b.current_quantity > 0::numeric 
         AND (aa.last_action_type IS NULL OR aa.last_action_type <> 'ignored'::action_type) 
    THEN 'immediate_action'::text
    
    WHEN b.expiry_date >= (CURRENT_DATE - '7 days'::interval) 
         AND b.expiry_date < CURRENT_DATE 
         AND (aa.last_action_type IS NULL OR aa.last_action_type <> 'ignored'::action_type) 
         AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text])) 
    THEN 'recently_expired'::text
    
    WHEN aa.last_action_time IS NOT NULL 
         AND aa.last_action_time >= (now() - '24:00:00'::interval) 
    THEN CASE aa.last_action_type
      WHEN 'discount'::action_type THEN 'recently_discounted'::text
      WHEN 'donate_prepared'::action_type THEN 'ready_for_donation'::text
      WHEN 'donate'::action_type THEN 'recently_donated'::text
      WHEN 'dispose'::action_type THEN 'recently_disposed'::text
      WHEN 'sold'::action_type THEN 'recently_sold'::text
      WHEN 'ignored'::action_type THEN 'recently_ignored'::text
      ELSE 'recent_action'::text
    END
    
    WHEN aa.last_action_time IS NOT NULL 
         AND aa.last_action_time < ps.calculated_at 
         AND ps.calculated_at IS NOT NULL 
         AND b.current_quantity > 0::numeric 
         AND aa.last_action_type <> 'ignored'::action_type 
    THEN 'needs_reeval'::text
    
    WHEN (ps.recommendation::text = ANY (ARRAY['discount_moderate'::text, 'discount_aggressive'::text, 'dispose'::text, 'alert'::text])) 
         AND (aa.last_action_time IS NULL OR aa.last_action_time < ps.calculated_at) 
         AND b.current_quantity > 0::numeric 
         AND (aa.last_action_type IS NULL OR aa.last_action_type <> 'ignored'::action_type) 
         AND (ps.urgency_level <> ALL (ARRAY['critical'::text, 'high'::text])) 
    THEN 'pending_action'::text
    
    WHEN (ps.recommendation::text = ANY (ARRAY['maintain'::text, 'monitor'::text, 'normal'::text])) 
         AND b.current_quantity > 0::numeric 
         AND (aa.last_action_type IS NULL OR aa.last_action_type <> 'ignored'::action_type) 
    THEN 'monitor_only'::text
    
    ELSE 'unknown'::text
  END AS todo_state,
  
  -- Priority ordering
  CASE
    WHEN ps.urgency_level = 'critical'::text THEN 1
    WHEN ps.urgency_level = 'high'::text THEN 2
    WHEN ps.urgency_level = 'medium'::text THEN 3
    ELSE 4
  END AS priority_order,
  
  -- Time calculations
  b.expiry_date - CURRENT_DATE AS days_to_expiry,
  CASE
    WHEN aa.last_action_time IS NOT NULL 
    THEN EXTRACT(epoch FROM now() - aa.last_action_time::timestamp with time zone) / 3600::numeric
    ELSE NULL::numeric
  END AS hours_since_last_action,
  
  -- Metadata
  now() AS view_refreshed_at

FROM inventory.batches b
LEFT JOIN inventory.products p ON b.product_id = p.product_id
LEFT JOIN scoring.product_scores ps ON b.batch_id = ps.batch_id
LEFT JOIN all_actions aa ON b.batch_id = aa.batch_id
LEFT JOIN last_discount ld ON b.batch_id = ld.batch_id
LEFT JOIN action_summary acs ON b.batch_id = acs.batch_id
-- NEW: Join to get donation recipient name
LEFT JOIN inventory.donation_recipients dr ON aa.donation_recipient_id = dr.recipient_id;

-- Add helpful comment
COMMENT ON VIEW inventory.batch_todo_states IS 
'Comprehensive view of batch todo items with action history, AI recommendations, and reason metadata.
New columns added for reason tracking:
- last_action_disposal_reason: Why item was disposed
- last_action_dismissal_reason: Why AI recommendation was dismissed
- last_action_sale_timing: When sale occurred (just-now, today, etc.)
- last_action_sale_occurred_at: Precise timestamp of sale
- last_action_recipient_id: Donation recipient UUID
- last_action_recipient_name: Donation recipient name
- last_action_notes: Notes from the last action';
