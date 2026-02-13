# Product Detail Modal - Tracking Settings Investigation & Fixes

**Date**: February 12, 2026
**Status**: Phase 2 Complete ✅

## Overview

Investigation and improvement of the Tracking Settings component in the Product Detail Modal to align with database schema and fix critical bugs.

## Database Schema: Shelf Life Fallback Chain

```
Priority Order (Highest → Lowest):
1. store_products.shelf_life_override_days   (product-specific, ❌ not fetched yet)
2. store_category_settings.default_shelf_life_days (store-specific, ❌ not fetched yet)
3. products.typical_shelf_life_days         (product base, ✅ currently fetched)
4. categories.typical_shelf_life_days       (category base, ✅ currently fetched)
```

**Schema Constraints**:
- `products.typical_shelf_life_days`: `integer NOT NULL`, must be `> 0`
- All other shelf life columns: `integer` nullable

## Tracking Mode Clarification

**Important**: The `tracking_mode` column **DOES NOT EXIST** in the database.

**What exists instead**:
- `inventory.store_products.auto_create_batches` (boolean) - automatic batch creation on delivery
- `inventory.store_products.is_tracked_for_batches` (boolean) - whether product appears in expiry dashboard

**The modal's "auto/manual" toggle is currently UI-only state** with no persistence.

## Phase 1: Critical Bugs Fixed ✅

### 1. Fixed Invalid Fallback to 0
**File**: `components/products/product-detail-modal.tsx:123`

**Before**:
```tsx
shelfLifeDays={product?.typical_shelf_life_days || 0}  // ❌ Violates schema constraint
```

**After**:
```tsx
shelfLifeDays={product?.typical_shelf_life_days || 14}  // ✅ Safe default
```

### 2. Added Validation on Mount
**File**: `components/products/product-detail-modal/tracking-settings.tsx`

**Changes**:
- Added constants: `MIN_SHELF_LIFE_DAYS = 1`, `DEFAULT_SHELF_LIFE_DAYS = 14`
- Added `useEffect` to validate `shelfLifeDays` on mount and changes
- Logs warning if invalid value received
- Auto-corrects to safe default if < 1

**Code**:
```tsx
useEffect(() => {
  if (shelfLifeDays < MIN_SHELF_LIFE_DAYS) {
    console.warn(`Invalid shelf life received: ${shelfLifeDays}. Using default: ${DEFAULT_SHELF_LIFE_DAYS}`);
    setEditedShelfLife(String(DEFAULT_SHELF_LIFE_DAYS));
  } else {
    setEditedShelfLife(String(shelfLifeDays));
  }
}, [shelfLifeDays]);
```

### 3. Improved "Inherited from" Label
**File**: `components/products/product-detail-modal/tracking-settings.tsx:113-120`

**Before**:
```tsx
<span>Inherited from {categoryRule} category</span>
```

**After**:
```tsx
<span>Product default ({categoryRule})</span>
// TODO: Show actual source once we fetch override columns
```

More accurate label that reflects we're showing the product's default value, not necessarily inherited from category.

### 4. Updated Error Handling
- Use constants instead of magic numbers
- Improved error message consistency
- Better fallback logic when validation fails

## Phase 2: Fetch Complete Data ✅ COMPLETE

### Changes Implemented

**1. Updated Product Type** (`lib/queries/products.ts:54-73`)

Added new fields to Product type:
```ts
export type Product = BaseProduct & {
  // ... existing fields
  // Shelf life overrides and calculated values
  shelf_life_override_days?: number | null;
  category_default_shelf_life_days?: number | null;
  category_typical_shelf_life_days?: number | null;
  effective_shelf_life?: number;
  shelf_life_source?: 'product_override' | 'store_category_override' | 'product_base' | 'category_base' | 'default';
  // ... rest of fields
}
```

**2. Updated fetchProductById Query** (`lib/queries/products.ts:871-1070`)

- Fetches `store_category_settings.default_shelf_life_days` via separate query
- Calculates effective shelf life using 4-tier fallback:
  1. `store_products.shelf_life_override_days` (product-specific)
  2. `store_category_settings.default_shelf_life_days` (store-specific)
  3. `products.typical_shelf_life_days` (product base)
  4. `categories.typical_shelf_life_days` (category base)
  5. Fallback to 14 days if all are null/invalid
- Determines source for each shelf life value
- Added fields to returned Product object

**Code Snippet**:
```ts
// Calculate effective shelf life and source (4-tier fallback)
const productOverride = data.shelf_life_override_days
const storeCategoryOverride = storeCategorySettings?.default_shelf_life_days
const productBase = data.products?.typical_shelf_life_days
const categoryBase = categoryData?.typical_shelf_life_days
const defaultFallback = 14

let effectiveShelfLife: number
let shelfLifeSource: Product['shelf_life_source']

if (productOverride != null && productOverride > 0) {
  effectiveShelfLife = productOverride
  shelfLifeSource = 'product_override'
} else if (storeCategoryOverride != null && storeCategoryOverride > 0) {
  effectiveShelfLife = storeCategoryOverride
  shelfLifeSource = 'store_category_override'
} else if (productBase != null && productBase > 0) {
  effectiveShelfLife = productBase
  shelfLifeSource = 'product_base'
} else if (categoryBase != null && categoryBase > 0) {
  effectiveShelfLife = categoryBase
  shelfLifeSource = 'category_base'
} else {
  effectiveShelfLife = defaultFallback
  shelfLifeSource = 'default'
}
```

**3. Updated Product Detail Modal** (`components/products/product-detail-modal.tsx:121-125`)

Changed from:
```tsx
shelfLifeDays={product?.typical_shelf_life_days || 14}
categoryRule={product?.category_display_name || 'Unknown'}
```

To:
```tsx
shelfLifeDays={product?.effective_shelf_life || 14}
shelfLifeSource={product?.shelf_life_source}
categoryName={product?.category_display_name || 'Unknown'}
```

**4. Updated TrackingSettings Props** (`components/products/product-detail-modal/types.ts:30-34`)

```ts
export interface TrackingSettingsProps {
  productId: string
  shelfLifeDays: number
  shelfLifeSource?: 'product_override' | 'store_category_override' | 'product_base' | 'category_base' | 'default'
  categoryName: string  // Renamed from categoryRule
}
```

**5. Updated TrackingSettings Component** (`components/products/product-detail-modal/tracking-settings.tsx:129-140`)

- Accepts new `shelfLifeSource` prop
- Displays accurate source label based on shelf life origin:
  - `product_override`: "Custom override (X days)"
  - `store_category_override`: "Store override (Category)"
  - `product_base`: "Product default (Category)"
  - `category_base`: "Inherited from Category"
  - `default`: "System default (14 days)"

**Code**:
```tsx
<span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
  {shelfLifeSource === 'product_override' && `Custom override (${shelfLifeDays} days)`}
  {shelfLifeSource === 'store_category_override' && `Store override (${categoryName})`}
  {shelfLifeSource === 'product_base' && `Product default (${categoryName})`}
  {shelfLifeSource === 'category_base' && `Inherited from ${categoryName}`}
  {shelfLifeSource === 'default' && 'System default (14 days)'}
  {!shelfLifeSource && `Product default (${categoryName})`}
</span>
```

**6. Enhanced Logging**

Added shelf life information to query logs:
```ts
logger.query(context, 'Product fetched successfully', {
  productId,
  storeId,
  totalStock: total_stock,
  activeBatches: active_batches_count,
  effectiveShelfLife,    // NEW
  shelfLifeSource,       // NEW
});
```

### Benefits of Phase 2

✅ **Accurate Data**: Now uses complete 4-tier fallback chain
✅ **Transparency**: Users can see where shelf life value comes from
✅ **Future-proof**: Ready for product-level overrides (shelf_life_override_days)
✅ **Debugging**: Logs show which source was used for each product
✅ **Consistency**: Same fallback logic as database schema design

### Original Phase 2 Requirements (Archive)

**1. Update `fetchProductById` query** (`lib/queries/products.ts:871-1014`)

Need to fetch:
- `store_products.shelf_life_override_days`
- `store_category_settings.default_shelf_life_days`

**Proposed Query Structure**:
```sql
SELECT
  sp.*,
  p.*,
  c.*,
  scs.default_shelf_life_days as category_default_shelf_life_days,
  sp.shelf_life_override_days,
  COALESCE(
    sp.shelf_life_override_days,
    scs.default_shelf_life_days,
    p.typical_shelf_life_days,
    c.typical_shelf_life_days,
    14
  ) AS effective_shelf_life
FROM inventory.store_products sp
JOIN inventory.products p ON p.product_id = sp.product_id
LEFT JOIN inventory.categories c ON c.category_id = p.category_id
LEFT JOIN inventory.store_category_settings scs
  ON scs.category_id = c.category_id
  AND scs.store_id = sp.store_id
WHERE sp.product_id = $1 AND sp.store_id = $2;
```

**2. Update Product Type** (`lib/queries/products.ts:54-68`)

Add fields:
```ts
export type Product = BaseProduct & {
  // ... existing fields
  shelf_life_override_days?: number | null;
  category_default_shelf_life_days?: number | null;
  effective_shelf_life?: number;
  shelf_life_source?: 'product_override' | 'store_category_override' | 'product_base' | 'category_base' | 'default';
}
```

**3. Update Tracking Settings Component**

Calculate effective shelf life and show correct source:
```tsx
const getShelfLifeSource = () => {
  if (product?.shelf_life_override_days) return `Custom (${product.shelf_life_override_days} days)`;
  if (product?.category_default_shelf_life_days) return `Store override (${categoryRule})`;
  return `Product default (${categoryRule})`;
};
```

## Phase 3: Tracking Mode (Configuration by Presence) ✅ COMPLETE

### Approach: Infer from Configuration Presence (No Migration Needed!)

Instead of adding a new `tracking_mode` column, we **infer the mode from existing data**:

**Logic**:
```typescript
// If any shelf life is configured → auto mode (can auto-calculate expiry)
// If no shelf life anywhere → manual mode (must enter dates manually)
const trackingMode: 'auto' | 'manual' =
  productOverride != null ||
  storeCategoryOverride != null ||
  productBase != null ||
  categoryBase != null
    ? 'auto'
    : 'manual'
```

**Benefits**:
- ✅ No database migration needed
- ✅ Semantic: "If configured, use auto-tracking"
- ✅ Works with existing data structure
- ✅ Aligns with onboarding flow behavior

### Changes Implemented

**1. Updated Product Type** (`lib/queries/products.ts:54-73`)

Added inferred tracking mode:
```ts
export type Product = BaseProduct & {
  // ... other fields
  tracking_mode?: 'auto' | 'manual'  // Inferred from shelf life config
}
```

**2. Calculate Tracking Mode in Query** (`lib/queries/products.ts:990-998`)

```ts
// Infer tracking mode from configuration presence
const trackingMode: 'auto' | 'manual' =
  productOverride != null ||
  storeCategoryOverride != null ||
  productBase != null ||
  categoryBase != null
    ? 'auto'
    : 'manual'
```

**3. Updated TrackingSettings Component** (`tracking-settings.tsx`)

**Added Mode Toggle Handler**:
```ts
const handleTrackingModeToggle = (newMode: 'auto' | 'manual') => {
  if (newMode === 'manual') {
    // Clear product override → falls back to category/manual
    updateProduct({
      productId,
      updates: { shelf_life_override_days: null },
    })
  } else {
    // Set product override → enables auto-tracking
    updateProduct({
      productId,
      updates: { shelf_life_override_days: validShelfLife },
    })
  }
}
```

**Initialize from Product Data**:
```ts
const [trackingMode, setTrackingMode] = useState<'auto' | 'manual'>(initialTrackingMode)

useEffect(() => {
  setTrackingMode(initialTrackingMode)
}, [initialTrackingMode])
```

**4. Updated updateProduct Interface** (`lib/queries/products.ts:675-690`)

Added support for shelf_life_override_days:
```ts
export interface UpdateProductData {
  // ... existing fields
  shelf_life_override_days?: number | null  // NEW
}
```

Handles updates to store_products table:
```ts
if (updates.shelf_life_override_days !== undefined)
  storeUpdates.shelf_life_override_days = updates.shelf_life_override_days
```

**5. Updated Modal Props** (`product-detail-modal.tsx`)

Pass inferred tracking mode:
```tsx
<TrackingSettings
  productId={productId}
  shelfLifeDays={product?.effective_shelf_life || 14}
  shelfLifeSource={product?.shelf_life_source}
  categoryName={product?.category_display_name || 'Unknown'}
  initialTrackingMode={product?.tracking_mode || 'auto'}
/>
```

### How Mode Toggling Works

**Scenario 1: Switch from Auto → Manual**
```
Before: shelf_life_override_days = 14
Action: User clicks "Manual"
Update: shelf_life_override_days = NULL
Result: Falls back to category settings or manual entry
```

**Scenario 2: Switch from Manual → Auto**
```
Before: shelf_life_override_days = NULL
Action: User clicks "Auto"
Update: shelf_life_override_days = 14 (current effective value)
Result: Product now has explicit auto-tracking config
```

**Scenario 3: Edit Shelf Life in Auto Mode**
```
Before: shelf_life_override_days = 14
Action: User changes to 7 days
Update: shelf_life_override_days = 7
Result: Product-specific override, still auto mode
```

### UI Feedback

Added toast notifications:
- ✅ "Switched to manual tracking - expiry dates will be entered manually"
- ✅ "Switched to auto tracking - using X day shelf life"

### Why This Approach is Better

| Aspect | Migration Approach | Config-by-Presence |
|--------|-------------------|-------------------|
| **Database Changes** | New column + migration | None ✅ |
| **Data Redundancy** | Stores mode separately | Inferred from config ✅ |
| **Semantics** | Explicit flag | Semantic: "if configured, use it" ✅ |
| **Complexity** | Additional state to manage | Uses existing fields ✅ |
| **Backwards Compat** | Requires backfill | Works with existing data ✅ |

### Original Migration Plan (Archive - Not Needed!)

## Key Learnings

1. **Never fallback to 0** for shelf life - violates schema constraint
2. **Validate on mount** - don't trust props to always be valid
3. **Tracking mode != auto_create_batches** - different concepts entirely
4. **Four-tier fallback system** - product override → store category override → product base → category base
5. **Schema enforces > 0** - products.typical_shelf_life_days cannot be NULL or 0
6. **Categories can have NULL** - categories.typical_shelf_life_days is nullable

## Testing Checklist

- [ ] Open product modal with valid shelf life → displays correctly
- [ ] Open product modal with 0 shelf life → shows 14 days, logs warning
- [ ] Edit shelf life to valid value → saves successfully
- [ ] Edit shelf life to 0 → shows error, reverts to previous value
- [ ] Edit shelf life to negative → shows error, reverts to previous value
- [ ] Edit shelf life, press Enter → saves immediately
- [ ] Edit shelf life, click outside → saves on blur
- [ ] Toggle tracking mode → updates local state (no persistence yet)
- [ ] Console shows no errors or warnings for valid products

## Files Modified

1. `components/products/product-detail-modal.tsx` - Fixed fallback from 0 to 14
2. `components/products/product-detail-modal/tracking-settings.tsx` - Added validation, constants, improved labels

## Next Steps

1. **Phase 2**: Implement complete data fetching (overrides + effective shelf life)
2. **Phase 3**: Create migration for tracking_mode column
3. **Phase 4** (Optional): Align save patterns across onboarding and modal
4. **Documentation**: Update API docs with shelf life fallback logic

## References

- Investigation Report: Full analysis in conversation history (2026-02-12)
- Database Schema: `supabase/migrations/20251026181700_001_complete_schema.sql`
- Onboarding Schema: `supabase/migrations/20260129000000_add_batch_tracking_onboarding_schema.sql`
- Reference Implementation: `components/dashboard/setting-up-flow/steps/batch-tracking/step-combined-tracking.tsx`
