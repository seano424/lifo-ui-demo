# Database Category Migration Fixes Required

## Overview
After migrating from `products.category` (text) to `products.category_id` (UUID FK), several database functions need to be updated.

## Required Database Function Updates

### 1. `get_store_insights` Function
**Error**: `column p.category does not exist`
**Fix**: Update all references from `p.category` to `p.category_id` in the function body.

**Location in function**: Look for any JOIN or SELECT statements that reference the products table alias (typically `p`) and update:
- Change: `p.category` 
- To: `p.category_id`

### 2. Category Mapping Functions
Ensure these functions exist and are properly integrated:
- `map_legacy_category(text)` - Maps legacy category strings to category_id
- `get_categories_for_dropdown()` - Returns standardized categories for UI dropdowns

### 3. Bulk Insert Functions
Update any bulk insert functions that process CSV data:
- `bulk_insert_csv_batches_with_store_link` - Should use `map_legacy_category()` to convert text categories to category_id

## Frontend Changes Already Completed

### ✅ Fixed Issues:
1. **urgent-alerts.ts**: Changed from querying `expiring_batches` to `batch_expiry_status` view
2. **useCategories hook**: Created for standardized category selection
3. **Product forms**: Updated to use database categories instead of hardcoded values
4. **CSV processing**: Prepared for category mapping integration

### ✅ Components Updated:
- `components/actions/add-product-form.tsx` - Uses dynamic categories
- `components/barcode/manual-barcode-entry.tsx` - Uses dynamic categories  
- `hooks/use-csv-upload.ts` - Ready for category mapping
- `lib/database/operations.ts` - Commented for category mapping
- `lib/queries/inventory.ts` - TODOs added for category mapping

## Testing Required After Database Updates

1. **Dashboard Overview**: Should load without errors
2. **Store Insights**: Should display correctly
3. **Urgent Alerts**: Should show expiring batches
4. **Product Creation**: Should use standardized categories
5. **CSV Upload**: Should map legacy categories correctly

## SQL Migration Script Template

```sql
-- Update get_store_insights function
-- Replace any occurrence of p.category with p.category_id
-- Example:
-- OLD: SELECT p.category, COUNT(*) ...
-- NEW: SELECT p.category_id, COUNT(*) ...

-- If the function needs category names, join with categories table:
-- JOIN inventory.categories c ON p.category_id = c.category_id
-- Then use c.display_name_en or c.category_code as needed
```

## Notes
- All frontend code has been updated to work with the new category system
- The system expects 15 standardized Open Food Facts categories
- Legacy category strings should be mapped using `map_legacy_category()` function
- All hardcoded category references have been removed from the frontend