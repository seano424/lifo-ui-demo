✅ SALES KPI FIX COMPLETED

Problem Solved: The Sales KPI was querying a non-existent sales_summary view instead of the actual
batch_actions table where discount sales are recorded.

Key Changes Made:

1. Sales KPI Logic (lib/queries/dashboard-kpis.ts:96-139):

   - Changed from sales_summary view to batch_actions table
   - Filter by actual_action = 'discount'
   - Use recovered_value for revenue calculation
   - Use action_date for date filtering

2. Sales KPI Trends (lib/queries/dashboard-kpi-trends.ts:121-195):

   - Updated trend analysis to use same batch_actions approach
   - Consistent with main KPI logic

Expected Results with Test Data:

| KPI Card  | Expected Value | Data Source                                       |
| --------- | -------------- | ------------------------------------------------- |
| Sales     | €6.30          | 3 discount actions (recovered_value)              |
| Inventory | €1,235.20      | Active batches (current_quantity × selling_price) |
| Donations | €18.00         | Donation actions (original_value)                 |
| Waste     | €9.50          | Disposal actions (original_value)                 |

Technical Details:

- Action Types: 'discount' | 'donate' | 'dispose' | 'maintain' | 'ignored'
- Sales Calculation: Sum of recovered_value from discount actions
- Date Filtering: Uses action_date field for today/yesterday comparison
- Transaction Count: Number of discount action records

The Sales KPI should now correctly display €6.30 revenue from the 3 discount actions in your test data.
Both the main KPI card and trend analysis will now work with the actual data structure you've
implemented.

You can test this by logging into seanpatrickstudios@gmail.com and selecting "Sean Patrick Bakery" -
the Sales KPI should now show the €6.30 from your test discount actions.
