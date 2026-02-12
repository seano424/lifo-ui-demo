# Product Detail Modal - Unified Implementation Plan

**Status:** Phase 2 - Tracking Settings Complete
**Created:** 2026-02-12
**Last Updated:** 2026-02-12

## Executive Summary

This document outlines the phased implementation plan for creating a unified Product Detail Modal that consolidates and replaces the current `batch-modal` and `product-modal` components. The new modal will serve as the single source of truth for viewing and managing product inventory, including all associated batches.

---

## 1. Current State Audit

### 1.1 Existing Modal Components

#### `components/batches/batch-modal.tsx`
- **Purpose:** Display and edit single batch details
- **Component Type:** BottomSheet
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `batch: TodoItem | BatchWithProduct | null`
  - `currencySymbol?: string`
- **Data Fetched:** None (receives batch data via props)
- **Data Displayed:**
  - Product name (from batch.products or batch.product_name)
  - Expiry date with days-to-expiry calculation
  - Current quantity
  - Current stock value (quantity × selling_price)
  - Batch number
  - Cost price (editable)
  - Selling price (editable)
  - Created date
- **Actions/Mutations:**
  - `updateBatch()` - via `useBatchActions` hook
  - Inline editing for expiry_date, cost_price, selling_price
- **Opened From:**
  - `components/batches/batch-table.tsx` (line 170-173)
    - Triggered by: clicking any batch row in batch table
    - Context: User viewing batches list, wants details on single batch

#### `components/products/product-modal.tsx`
- **Purpose:** Display read-only product overview
- **Component Type:** BottomSheet
- **Props:**
  - `isOpen: boolean`
  - `onClose: () => void`
  - `product: Product | null`
- **Data Fetched:** None (receives product data via props)
- **Data Displayed:**
  - Product name
  - Total stock (aggregated)
  - Active batches count (aggregated)
  - Category (with translation)
  - Brand
  - Date added
  - "Edit in Square" notice (no mutations allowed)
- **Actions/Mutations:** None (read-only, Square integration notice)
- **Opened From:**
  - `components/products/products-table.tsx` (line 146-148)
    - Triggered by: clicking any product row in products table
    - Context: User viewing products catalog, wants overview of product

### 1.2 Modal Usage Locations

**Search Results:**
- `batch-modal` imports found in: `batch-table.tsx`
- `product-modal` imports found in: `products-table.tsx`

**Additional Potential Entry Points (Not Yet Implemented):**
- Expiring soon/expiring today tables (currently open batch-modal, should highlight specific batch)
- "Add expiry date" action (referenced in wireframe, not found in current codebase)

---

## 2. Wireframe Analysis

### 2.1 Design Overview
File: `docs/wireframes/product-detail-modal.jsx`

The wireframe demonstrates a unified modal with:
- **Product header section:** Name, SKU, category, brand, total stock
- **Untracked units alert:** Expandable form to add batches for untracked inventory
- **Batch list:** All batches for the product, sorted by expiry date (soonest first)
- **Batch row features:**
  - Urgency micro-bar (visual indicator)
  - Days left label (styled by urgency)
  - Inline editing (click to edit expiry date and quantity)
  - Status badge
- **Tracking settings:** Collapsible section for mode (auto/manual), shelf life configuration
- **Empty state:** When no batches exist yet

### 2.2 Three Entry Points

#### Entry Point 1: From Product Row (Default View)
```tsx
<ProductDetailModal
  onClose={closeHandler}
  highlightBatchId={null}
  focusAddDate={false}
/>
```
- Shows full product overview
- Lists all batches
- No specific batch highlighted
- Normal view state

#### Entry Point 2: From Expiring Soon Table
```tsx
<ProductDetailModal
  onClose={closeHandler}
  highlightBatchId="batch-123"
  focusAddDate={false}
/>
```
- Opens to show product
- Automatically scrolls to and highlights the specific batch
- Highlights batch for 3 seconds then fades
- User can see batch in context of all other batches for the product

#### Entry Point 3: From "Add Expiry Date" Action
```tsx
<ProductDetailModal
  onClose={closeHandler}
  highlightBatchId={null}
  focusAddDate={true}
/>
```
- Opens to show product
- Automatically expands the "untracked units" alert
- Focuses on the expiry date input field
- Optimized for quickly adding missing expiry dates

### 2.3 Interactive Features

**Batch Editing:**
- Click any batch row to enter edit mode
- Edit mode shows inline form: expiry date input, quantity input, Save/Cancel buttons
- Only one batch can be edited at a time

**Untracked Units:**
- Alert shown when `total_stock > sum(batch.quantities)`
- Expandable form to add new batch
- Auto-calculates remaining quantity
- Defaults to "all untracked units" if quantity field left blank

**Tracking Settings:**
- Collapsible section (starts collapsed)
- Mode toggle: Auto vs Manual
- In Auto mode: shows shelf life input (days) and category inheritance badge
- Settings affect how new batches are created/tracked

---

## 3. Data Layer Analysis

### 3.1 Current Data Types

#### `Product` (from `lib/queries/products.ts`)
```typescript
type Product = BaseProduct & {
  store_cost_price?: number | null
  store_selling_price?: number | null
  store_is_active?: boolean
  store_sku?: string | null
  supplier_code?: string | null
  category_code?: string
  category_display_name?: string
  category_display_name_fr?: string
  category_display_name_nl?: string
  total_stock?: number              // Currently: Aggregated from batches
                                     // Post-migration: Will be from store_products.quantity (Square source)
  active_batches_count?: number     // Aggregated from batches
  avg_days_to_expiry?: number | null
}

// NOTE: Once store_products.quantity migration lands, we'll need to distinguish:
// - square_quantity: from store_products.quantity (what Square says)
// - batch_quantity: sum of active batches (what we're tracking)
// - untracked_quantity: square_quantity - batch_quantity
```

#### `BatchWithProduct` (from `lib/queries/batches.ts`)
```typescript
type BatchWithProduct = Batch & {
  products?: Database['inventory']['Tables']['products']['Row'] & {
    category_code?: string
    category_display_name?: string
    category_display_name_fr?: string
  }
}

type Batch = Database['inventory']['Tables']['batches']['Row']
// Includes: batch_id, product_id, expiry_date, current_quantity,
//           cost_price, selling_price, status, batch_number, created_at, etc.
```

#### `TodoItem` (from `lib/queries/todos-rpc.ts`)
```typescript
type TodoItem = Database['inventory']['Views']['batch_todo_states']['Row']
// Enriched batch data with urgency scoring, days_to_expiry, etc.
// Used in expiring soon tables
```

### 3.2 Existing Queries & RPCs

#### Product Queries
- `fetchProducts(storeId)` - Returns Product[]
- `fetchProductsPage(params, filters)` - Paginated products with aggregations
- `fetchProductById(productId, storeId)` - Single product with batch aggregations
- **RPC:** `get_products_paginated` - Server-side product fetching with stats

#### Batch Queries
- `fetchBatchesForProduct(productId, params, filters)` - All batches for a product
- `fetchBatchById(batchId)` - Single batch with product data
- `updateBatch(batchId, updates)` - Update batch fields
- **RPC:** `get_batches_paginated` - Server-side batch fetching
- **VIEW:** `batch_todo_states` - Enriched batch data with urgency/scoring

**Important:** Draft batches are being removed from the system. This modal should:
- Only show batches with `status IN ('active', 'expired', 'sold_out', etc.)`
- Never filter for or display `status = 'draft'`
- Use `useBatchesForProduct()` which already excludes drafts by default

### 3.3 Existing Hooks

#### `useBatchesForProduct(productId, filters, pageSize)`
From `hooks/use-batches.ts` (line 126-168)
- Returns: `{ data, count, isLoading, isFetching, hasMore, fetchNextPage }`
- Uses infinite query for pagination
- Filters by product_id automatically
- ✅ **Can be used as-is** for fetching batches in new modal

#### `useBatchActions()`
From `hooks/use-batches.ts` (line 231-612)
- Returns: `{ updateBatch, isUpdating, createBatch, isCreating, ... }`
- Handles batch mutations with optimistic updates
- Invalidates relevant queries on success
- ✅ **Can be used as-is** for batch editing

#### Product Hooks (to be found/created)
- Need hook for fetching single product: `useProduct(productId)`
- May need to create this if it doesn't exist

### 3.4 Missing Data / New Requirements

#### ✅ Data We Already Have:
- Product details with aggregations (active_batches_count)
- All batches for a product (via `fetchBatchesForProduct`)
- Batch editing capabilities (via `updateBatch`)
- Category information (via product.category_code, category_display_name)

#### ⚠️ Data We Need to Calculate Client-Side:
- **Untracked quantity:** `store_products.quantity (from Square) - sum(active batches.current_quantity)`
  - **IMPORTANT:** This calculation is **blocked** on pending migration
  - Need `store_products.quantity` column to be added first
  - Current `product.total_stock` is aggregated FROM batches, so can't use it for this calculation
  - Until migration lands, untracked alert will show 0

- **Tracking mode:** Not currently stored (auto vs manual)
  - Need to add `tracking_mode` column to products table
  - Or derive from whether expiry dates exist

- **Shelf life days:** Available in `product.typical_shelf_life_days`
  - Already exists ✅

#### ❌ New RPCs/Views Needed:
- **None required for Phase 1-2!** All data needs can be met with existing queries + client-side calculations
- **Optional optimization (Phase 3+):** Combined product+batches JSONB RPC for better performance

#### New Mutations Needed:
- **Create batch for untracked units** - Can use existing `createBatch()` from `useBatchActions`
- **Update product tracking settings** - Would need new mutation if we add tracking_mode column

#### 🚧 Blocking Dependencies:
- **`store_products.quantity` migration** - Required for untracked alert to work
  - This column will store the "source of truth" quantity from Square
  - Until this lands, untracked alert is a shell component showing 0

---

## 4. Migration Strategy

### 4.1 Coexistence Period

During implementation, both old and new modals will coexist:
- Old modals remain functional
- New modal developed in parallel
- Feature flag or route-based switching
- Once new modal is stable, swap entry points
- Remove old modals in final cleanup phase

### 4.2 Data Migration

#### 🚧 Required Migration (Blocking Untracked Alert):
```sql
-- REQUIRED for untracked alert to work
-- This migration is being worked on separately by backend team
ALTER TABLE inventory.store_products
  ADD COLUMN quantity INTEGER DEFAULT 0;

-- This will store the "source of truth" from Square
-- Untracked calculation: quantity - SUM(active batches.current_quantity)
```

**Status:** Pending - Backend team working on this
**Impact:** Phase 2 untracked alert will be a shell until this lands

#### Optional Migration (Tracking Mode):
```sql
-- Optional: if we want to persist tracking mode
ALTER TABLE inventory.products
  ADD COLUMN tracking_mode TEXT
  CHECK (tracking_mode IN ('auto', 'manual'))
  DEFAULT 'auto';
```

**Status:** Not required for MVP
**Impact:** Can derive tracking mode from data patterns

### 4.3 Component Swap Strategy

**Phase 1:** Create new modal component (no breaking changes)
**Phase 2:** Update one entry point at a time
  - Start with products-table (least complex)
  - Then batch-table
  - Finally expiring soon tables
**Phase 3:** Remove old modal components once all entry points migrated

---

## 5. Implementation Phases

### Phase 1: Foundation & New Component Structure
**Goal:** Create the base unified modal component without breaking existing functionality

**Files to Create:**
- `components/products/product-detail-modal.tsx` - Main modal component
- `components/products/product-detail-modal/batch-list.tsx` - Batch list sub-component
- `components/products/product-detail-modal/batch-row.tsx` - Single batch row
- `components/products/product-detail-modal/untracked-alert.tsx` - Untracked units alert
- `components/products/product-detail-modal/tracking-settings.tsx` - Settings section
- `hooks/use-product.ts` - Hook for fetching single product (if doesn't exist)

**Files to Modify:**
- None (parallel development)

**Key Implementation Details:**
- Use existing `BottomSheet` component (same as old modals)
- Accept props: `productId`, `highlightBatchId?`, `focusAddDate?`
- Fetch product data via `useProduct(productId)`
- Fetch batches via `useBatchesForProduct(productId)`
- Calculate untracked quantity client-side
- Use `useBatchActions()` for batch editing

**Acceptance Criteria:**
- [ ] Modal opens and displays product header
- [ ] Modal fetches and displays all batches
- [ ] Batches sorted by expiry date (soonest first)
- [ ] Days-left labels styled correctly by urgency
- [ ] Can view but not yet edit batches
- [ ] Modal can be closed
- [ ] No impact on existing modal functionality

**Estimated Size:** ~800-1000 lines across all files

---

### Phase 2: Interactive Features & Batch Editing
**Goal:** Add batch editing, untracked units UI (shell), and tracking settings

**Files to Modify:**
- `components/products/product-detail-modal/batch-row.tsx` - Add inline editing
- `components/products/product-detail-modal/untracked-alert.tsx` - Add batch creation form (shell)
- `components/products/product-detail-modal/tracking-settings.tsx` - Add mode toggle & shelf life input

**New Mutations:**
- Use existing `useBatchActions().updateBatch` for batch editing
- Use existing `useBatchActions().createBatch` for adding untracked units

**Key Implementation Details:**
- Click batch row → enter edit mode (show inline form)
- Edit mode: expiry date input, quantity input, Save/Cancel
- Only one batch editable at a time (use local state: `editingBatchId`)
- **Untracked alert:** Build full UI but wire to show 0 until migration lands
  - Formula: `store_products.quantity - sum(active batches.current_quantity)`
  - Currently blocked on `store_products.quantity` column
  - Create shell component with expandable form, ready to activate post-migration
- Tracking settings: collapsible, mode toggle (auto/manual), shelf life input
  - **UPDATE (2026-02-12):** Shelf life save behavior implemented - see Phase 2.1 below
- Optimistic updates for better UX

**Acceptance Criteria:**
- [ ] Can click batch row to edit
- [ ] Can update expiry date, quantity, prices
- [ ] Changes persist to database
- [ ] Untracked alert renders (shows 0 until migration)
- [ ] Batch creation form works (can be tested manually with hardcoded count)
- [x] Tracking settings can be toggled ✅ COMPLETE (2026-02-12)
- [x] Shelf life settings saved with explicit Save button ✅ COMPLETE (2026-02-12)
- [x] Shelf life updates store-wide category defaults ✅ COMPLETE (2026-02-12)
- [ ] Loading states shown during mutations
- [ ] Error handling with user-friendly messages

**🚧 Blocked/Deferred:**
- [ ] Untracked alert showing actual count (needs `store_products.quantity` column)

**Estimated Size:** ~400-600 lines of additions

**Post-Migration Activation:**
Once `store_products.quantity` lands, update one line in untracked-alert.tsx:
```tsx
// Before migration:
const untrackedQty = 0  // Hardcoded until migration

// After migration:
const untrackedQty = (product?.square_quantity || 0) - totalTrackedQty
```

---

### ✅ Phase 2.1: Tracking Settings Save Button (COMPLETED)
**Date Completed:** 2026-02-12
**Goal:** Change tracking settings shelf life from auto-save to explicit Save button, updating store-wide category defaults instead of product-specific overrides

#### Implementation Summary

**Previous Behavior:**
- User edited shelf life → Auto-saved on blur/Enter
- Updated `store_products.shelf_life_override_days` (product-specific override)
- Immediate save with no visual confirmation

**New Behavior:**
- User edits shelf life → Input shows dirty state (blue border)
- User clicks Save button → Updates `store_category_settings.default_shelf_life_days` (store-wide category default)
- Success toast shows: "Updated shelf life for {Category} category"
- All products in that category inherit the new default (unless they have product-specific overrides)

#### Files Modified

1. **`lib/queries/products.ts`** (+60 lines)
   - Added `updateStoreCategoryShelfLife()` function
   - Upserts `store_category_settings.default_shelf_life_days`
   - Creates new row if category settings don't exist
   - Includes performance tracking and error handling

2. **`components/products/product-detail-modal/types.ts`** (+1 line)
   - Added `categoryId: string` to `TrackingSettingsProps`
   - Required to identify which category settings to update

3. **`components/products/product-detail-modal.tsx`** (+1 line)
   - Pass `categoryId={product?.category_id || ''}` to TrackingSettings component

4. **`components/products/product-detail-modal/tracking-settings.tsx`** (~50 lines changed)
   - **Removed:** Auto-save behavior (`onBlur`, `onKeyDown` handlers)
   - **Added:** Dirty state tracking with visual feedback
   - **Added:** Save button with loading state (using Button component)
   - **Added:** New `handleSave()` function that:
     - Updates store-wide category default instead of product override
     - Invalidates product queries to refetch updated data
     - Shows success toast with category name
   - **Added:** Blue border on input when dirty (`isDirty` state)
   - **Added:** Query invalidation after successful save

#### Database Schema Impact

**Target Table:** `inventory.store_category_settings`
```sql
CREATE TABLE inventory.store_category_settings (
  store_id uuid NOT NULL,
  category_id uuid NOT NULL,
  is_tracked boolean DEFAULT true NOT NULL,
  auto_create_batches boolean DEFAULT false NOT NULL,
  default_shelf_life_days integer,  -- ← THIS IS WHAT WE UPDATE
  created_at timestamp without time zone DEFAULT now() NOT NULL,
  updated_at timestamp without time zone DEFAULT now() NOT NULL,

  PRIMARY KEY (store_id, category_id),
  CONSTRAINT store_category_settings_shelf_life_positive
    CHECK (default_shelf_life_days IS NULL OR default_shelf_life_days > 0)
);
```

**4-Tier Shelf Life Fallback Chain:**
1. `store_products.shelf_life_override_days` - Product-specific override
2. `store_category_settings.default_shelf_life_days` - Store category default ← **NEW: This is what we update now**
3. `products.typical_shelf_life_days` - Product base
4. `categories.typical_shelf_life_days` - Category base
5. Fallback to 14 days if all are null/invalid

#### UI/UX Changes

**Visual Feedback:**
- **Dirty state:** Input border changes from gray to blue when edited
- **Save button:** Only enabled when changes exist (dirty state)
- **Loading state:** Button shows "Saving..." text with spinner during save
- **Success toast:** "Updated shelf life for {Category Name} category"
- **Validation:** Still enforces minimum 1 day shelf life

**Button Behavior:**
```tsx
<Button
  size="sm"
  onClick={handleSave}
  disabled={!isDirty || isSaving || isUpdating}
  loading={isSaving}
  loadingText="Saving..."
>
  Save
</Button>
```

#### Mutation Function Implementation

```typescript
export async function updateStoreCategoryShelfLife(
  storeId: string,
  categoryId: string,
  shelfLifeDays: number | null,
): Promise<void> {
  const supabase = createClient()

  // Upsert: Update if exists, insert if not
  const { error } = await supabase
    .schema('inventory')
    .from('store_category_settings')
    .upsert({
      store_id: storeId,
      category_id: categoryId,
      default_shelf_life_days: shelfLifeDays,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'store_id,category_id'
    })

  // Error handling and logging...
}
```

#### Save Handler Logic

```typescript
const handleSave = async () => {
  const newShelfLife = parseInt(editedShelfLife, 10)

  // Validation (minimum 1 day)
  if (Number.isNaN(newShelfLife) || newShelfLife < MIN_SHELF_LIFE_DAYS) {
    toast.error(`Shelf life must be at least ${MIN_SHELF_LIFE_DAYS} day`)
    return
  }

  // Update store_category_settings (store-wide category default)
  await updateStoreCategoryShelfLife(activeStoreId, categoryId, newShelfLife)

  // Invalidate queries to refetch updated shelf life
  queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(productId) })
  queryClient.invalidateQueries({ queryKey: queryKeys.products.all })

  // Success feedback
  toast.success(`Updated shelf life for ${categoryName} category`)
  setIsDirty(false)
}
```

#### Key Implementation Details

1. **Dirty State Management:**
   - `isDirty` state tracks whether input has unsaved changes
   - Set to `true` on input change
   - Reset to `false` on successful save or when prop changes
   - Save button disabled when not dirty

2. **Query Invalidation:**
   - Invalidates product detail query to refetch updated data
   - Invalidates all products query to update list view
   - Ensures UI reflects new shelf life immediately

3. **Error Handling:**
   - Validates input before save (minimum 1 day)
   - Shows toast error if validation fails
   - Shows toast error if mutation fails
   - Resets input to previous valid value on validation error

4. **Loading States:**
   - `isSaving` state prevents double-submission
   - Button shows loading spinner during save
   - Input disabled during save operation

#### Testing Scenarios

✅ **Scenario 1: First time setting category default**
- Product has no category override (uses product/category base)
- Edit shelf life → Save
- Row created in `store_category_settings`
- Source changes to "Store override (Category)"

✅ **Scenario 2: Updating existing category default**
- Category already has `default_shelf_life_days` set
- Edit to new value → Save
- Row updated in `store_category_settings`
- All products in that category inherit new value

✅ **Scenario 3: Validation errors**
- Enter 0 or negative → Click Save
- Error toast shown: "Shelf life must be at least 1 day"
- Changes not saved

✅ **Scenario 4: Cancel changes**
- Edit shelf life
- Don't click Save
- Close modal
- Changes discarded (not saved)

✅ **Scenario 5: Visual feedback**
- Edit input → Border turns blue (dirty state)
- Click Save → Button shows spinner + "Saving..."
- Success → Toast notification appears
- Save button disables (no longer dirty)

#### Impact on Other Products

**Important:** When you save a shelf life for a category, it affects **all products in that category** at that store (unless they have product-specific overrides).

Example:
- You have 50 "Dairy" products
- You edit shelf life in the "Whole Milk" product modal
- You save: "7 days"
- **Result:** All 50 dairy products now use 7 days as their shelf life (unless they have product-specific overrides)

This is the intended behavior - you're setting a **store-wide category default**, not a product-specific override.

#### Future Enhancements (Out of Scope)

1. **Product-Specific Override Option:**
   - Add a toggle: "Apply to category" vs "Apply to this product only"
   - If "this product only": update `store_products.shelf_life_override_days`
   - If "category": update `store_category_settings.default_shelf_life_days` (current behavior)

2. **Confirmation Dialog:**
   - Show warning when saving: "This will affect X products in this category"
   - User can confirm or cancel

3. **Batch Update UI:**
   - After save, show toast: "Updated 47 products in Dairy category"
   - Link to view affected products

#### Related Documentation

- **Database Schema:** `docs/implementation-plans/tracking-settings-improvements.md`
- **4-Tier Fallback:** Documented in Phase 2 of tracking-settings-improvements.md
- **Onboarding Reference:** `components/dashboard/setting-up-flow/steps/batch-tracking-step.tsx`

---

### Phase 3: Entry Points & Highlighting
**Goal:** Implement the three entry points with appropriate initial states

**Files to Modify:**
- `components/products/product-detail-modal.tsx` - Add highlight logic, focus logic

**Key Implementation Details:**
- Accept `highlightBatchId` prop → scroll to batch, highlight for 3 seconds
- Accept `focusAddDate` prop → expand untracked alert, focus input
- Use `useEffect` for highlight timeout
- Use `useRef` for scroll-to-element
- Use `useRef` for input focus

**Acceptance Criteria:**
- [ ] Entry Point 1 (default): shows all batches, no highlight
- [ ] Entry Point 2 (highlight): scrolls to batch, highlights for 3s
- [ ] Entry Point 3 (add date): expands alert, focuses input
- [ ] Highlight fades after 3 seconds
- [ ] Scroll behavior smooth and reliable

**Estimated Size:** ~100-150 lines of additions

---

### Phase 4: Swap Entry Points - Products Table
**Goal:** Replace product-modal with product-detail-modal in products table

**Files to Modify:**
- `components/products/products-table.tsx` - Update modal import and usage

**Changes:**
```tsx
// OLD:
import { ProductModal } from '@/components/products/product-modal'
<ProductModal isOpen={isModalOpen} onClose={closeHandler} product={selectedProduct} />

// NEW:
import { ProductDetailModal } from '@/components/products/product-detail-modal'
<ProductDetailModal
  isOpen={isModalOpen}
  onClose={closeHandler}
  productId={selectedProduct.product_id}
  highlightBatchId={null}
  focusAddDate={false}
/>
```

**Testing:**
- [ ] Click product row → new modal opens
- [ ] Shows product details + all batches
- [ ] Can edit batches inline
- [ ] Can add untracked units
- [ ] No regressions in products table

**Rollback Plan:** Simple - revert import and JSX change

**Estimated Size:** ~10 lines changed

---

### Phase 5: Swap Entry Points - Batch Table
**Goal:** Replace batch-modal with product-detail-modal in batch table, highlighting the selected batch

**Files to Modify:**
- `components/batches/batch-table.tsx` - Update modal import and usage

**Changes:**
```tsx
// OLD:
import { BatchModal } from '@/components/batches/batch-modal'
<BatchModal
  isOpen={isBottomSheetOpen}
  onClose={closeHandler}
  batch={selectedBatch}
  currencySymbol={currencySymbol}
/>

// NEW:
import { ProductDetailModal } from '@/components/products/product-detail-modal'
<ProductDetailModal
  isOpen={isBottomSheetOpen}
  onClose={closeHandler}
  productId={selectedBatch?.product_id || ''}
  highlightBatchId={selectedBatch?.batch_id || null}
  focusAddDate={false}
/>
```

**Testing:**
- [ ] Click batch row → new modal opens
- [ ] Shows product details + all batches
- [ ] Selected batch is highlighted
- [ ] Highlight fades after 3s
- [ ] Can edit any batch (not just highlighted one)
- [ ] No regressions in batch table

**Rollback Plan:** Simple - revert import and JSX change

**Estimated Size:** ~10 lines changed

---

### Phase 6: Swap Entry Points - Expiring Soon Tables
**Goal:** Update expiring soon/expiring today tables to use new modal with highlight

**Files to Find and Modify:**
- Search for components that render TodoItem in tables
- Likely in `components/todos/` or `components/dashboard/`

**Changes:**
```tsx
// Similar to Phase 5, but may need to find multiple locations
```

**Testing:**
- [ ] Click expiring batch → new modal opens
- [ ] Batch highlighted in context
- [ ] Can take action on batch
- [ ] Other batches for product visible

**Estimated Size:** ~10-30 lines changed (depends on # of tables)

---

### Phase 7: "Add Expiry Date" Action (Optional)
**Goal:** Add "Add Expiry Date" button/action that opens modal with focusAddDate

**Files to Find or Create:**
- May be in batch table actions, or product actions
- Wireframe suggests this action exists, but not found in current codebase

**Changes:**
```tsx
<Button onClick={() => openProductModal(productId, { focusAddDate: true })}>
  Add Expiry Date
</Button>
```

**Testing:**
- [ ] Click "Add Expiry Date" → modal opens
- [ ] Untracked alert expanded
- [ ] Input focused
- [ ] Can add batch quickly

**Estimated Size:** ~20-50 lines (depends on where action is added)

---

### Phase 8: Cleanup & Deprecation
**Goal:** Remove old modal components and clean up unused code

**Files to Delete:**
- `components/batches/batch-modal.tsx`
- `components/products/product-modal.tsx`

**Files to Check for Orphaned Imports:**
- Scan codebase for any remaining imports of old modals

**Additional Cleanup:**
- Remove any feature flags or conditional rendering
- Update documentation
- Remove old modal tests (if any)

**Testing:**
- [ ] Full regression test of all entry points
- [ ] No console errors
- [ ] No dead code lint warnings

**Estimated Size:** ~300 lines deleted

---

## 6. Detailed File Modifications

### Phase 1 Files

#### `components/products/product-detail-modal.tsx`
```tsx
'use client'

import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Typography } from '@/components/ui/typography'
import { useBatchesForProduct } from '@/hooks/use-batches'
import { useProduct } from '@/hooks/use-product'
import { BatchList } from './product-detail-modal/batch-list'
import { UntrackedAlert } from './product-detail-modal/untracked-alert'
import { TrackingSettings } from './product-detail-modal/tracking-settings'
import { useState, useEffect } from 'react'

interface ProductDetailModalProps {
  isOpen: boolean
  onClose: () => void
  productId: string
  highlightBatchId?: string | null
  focusAddDate?: boolean
}

export function ProductDetailModal({
  isOpen,
  onClose,
  productId,
  highlightBatchId = null,
  focusAddDate = false,
}: ProductDetailModalProps) {
  const { data: product, isLoading: isLoadingProduct } = useProduct(productId)
  const { data: batches, isLoading: isLoadingBatches } = useBatchesForProduct(productId)

  const [highlightedBatchId, setHighlightedBatchId] = useState<string | null>(highlightBatchId)

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedBatchId) {
      const timeout = setTimeout(() => setHighlightedBatchId(null), 3000)
      return () => clearTimeout(timeout)
    }
  }, [highlightedBatchId])

  // Calculate untracked quantity
  // NOTE: This calculation is blocked on store_products.quantity migration
  // For now, hardcode to 0 until migration lands
  const totalTrackedQty = batches
    ?.filter(b => b.status === 'active')
    .reduce((sum, b) => sum + (b.current_quantity || 0), 0) || 0

  // TODO: Replace with actual calculation once store_products.quantity exists:
  // const untrackedQty = (product?.square_quantity || 0) - totalTrackedQty
  const untrackedQty = 0  // Shell until migration lands

  const sortedBatches = [...(batches || [])].sort((a, b) => {
    if (!a.expiry_date) return 1
    if (!b.expiry_date) return -1
    return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
  })

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      titleElement={
        <div className="flex flex-col gap-2 py-4">
          <Typography variant="h3">{product?.name || 'Product Details'}</Typography>
          <Typography variant="p">{product?.sku}</Typography>
        </div>
      }
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Product info section */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">{product?.category_display_name}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{product?.brand}</span>
            <span className="text-sm text-muted-foreground">•</span>
            <Typography variant="h4">{product?.total_stock || 0} units</Typography>
          </div>

          {/* Untracked alert */}
          {untrackedQty > 0 && (
            <UntrackedAlert
              count={untrackedQty}
              productId={productId}
              autoExpand={focusAddDate}
            />
          )}

          {/* Batch list */}
          <BatchList
            batches={sortedBatches}
            highlightedBatchId={highlightedBatchId}
            isLoading={isLoadingBatches}
          />

          {/* Tracking settings */}
          <TrackingSettings
            productId={productId}
            shelfLifeDays={product?.typical_shelf_life_days || 0}
            categoryRule={product?.category_display_name || 'Unknown'}
          />
        </div>
      </div>
    </BottomSheet>
  )
}
```

**Estimated Size:** ~150 lines

#### `components/products/product-detail-modal/batch-list.tsx`
- Renders list of BatchRow components
- Handles empty state
- Shows loading skeleton
**Estimated Size:** ~100 lines

#### `components/products/product-detail-modal/batch-row.tsx`
- Phase 1: Display-only batch row
- Phase 2: Add inline editing
**Estimated Size:** ~200 lines

#### `components/products/product-detail-modal/untracked-alert.tsx`
- Phase 1: Display alert with count
- Phase 2: Add expandable form for adding batch
**Estimated Size:** ~150 lines

#### `components/products/product-detail-modal/tracking-settings.tsx`
- Phase 1: Display current settings
- Phase 2: Add mode toggle and shelf life input
**Estimated Size:** ~120 lines

#### `hooks/use-product.ts` (if doesn't exist)
```tsx
import { useQuery } from '@tanstack/react-query'
import { fetchProductById } from '@/lib/queries/products'
import { useActiveStoreId } from '@/lib/stores/store-context'
import { queryKeys } from '@/lib/queries/query-keys'

export function useProduct(productId: string) {
  const activeStoreId = useActiveStoreId()

  return useQuery({
    queryKey: queryKeys.products.detail(productId),
    queryFn: () => fetchProductById(productId, activeStoreId!),
    enabled: !!productId && !!activeStoreId,
  })
}
```

**Estimated Size:** ~30 lines

---

## 7. Testing Plan

### Unit Tests
- [ ] Component rendering with various prop combinations
- [ ] Untracked quantity calculation
- [ ] Days-to-expiry calculation
- [ ] Urgency styling logic
- [ ] Batch sorting logic

### Integration Tests
- [ ] Batch editing flow
- [ ] Batch creation from untracked alert
- [ ] Tracking settings updates
- [ ] Query invalidation on mutations

### E2E Tests
- [ ] Entry Point 1: Open from products table
- [ ] Entry Point 2: Open from batch table with highlight
- [ ] Entry Point 3: Open with focus on add date
- [ ] Edit multiple batches in sequence
- [ ] Add batch, verify it appears in list
- [ ] Update tracking settings, verify persistence

### Visual Regression Tests
- [ ] Modal appearance matches wireframe
- [ ] Highlight animation works correctly
- [ ] Responsive layout on mobile
- [ ] Empty state rendering
- [ ] Loading states

---

## 8. Risks & Mitigations

### Risk 1: Data Fetching Performance
**Risk:** Fetching product + all batches may be slow for products with many batches
**Likelihood:** Medium
**Impact:** High (poor UX)
**Mitigation:**
- Use `useBatchesForProduct` with pagination/infinite scroll
- Implement virtual scrolling for large batch lists
- Add loading skeletons for better perceived performance

### Risk 2: Concurrent Editing
**Risk:** Two users editing the same batch simultaneously
**Likelihood:** Low
**Impact:** Medium (data conflicts)
**Mitigation:**
- Optimistic updates with rollback on error
- Display error message if update fails due to stale data
- Consider adding `updated_at` checks in mutation

### Risk 3: Migration Complexity
**Risk:** Multiple entry points make full migration complex
**Likelihood:** Medium
**Impact:** Medium (prolonged coexistence period)
**Mitigation:**
- Phased rollout (one entry point at a time)
- Feature flag for gradual rollout
- Clear rollback plan for each phase

### Risk 4: Missing "Add Expiry Date" Action
**Risk:** Wireframe references action that doesn't exist in current codebase
**Likelihood:** High
**Impact:** Low (feature may not be implemented yet)
**Mitigation:**
- Implement modal first, add action later
- Entry Point 3 is optional nice-to-have
- Can be added in future iteration

---

## 9. Success Metrics

### Functional Metrics
- [ ] All entry points working correctly
- [ ] Old modals fully deprecated and removed
- [ ] Zero regressions in existing functionality
- [ ] All mutations work with proper error handling

### Performance Metrics
- [ ] Modal opens in <300ms (p95)
- [ ] Batch updates complete in <500ms (p95)
- [ ] No memory leaks from modal open/close cycles

### User Experience Metrics
- [ ] Highlight animation completes smoothly
- [ ] Inline editing feels responsive
- [ ] Untracked alert clearly communicates issue
- [ ] Empty states are informative

---

## 10. Future Enhancements (Out of Scope)

These features are not part of the initial implementation but could be added later:

1. **Batch Actions Dropdown**
   - Mark as sold
   - Mark as donated
   - Mark as damaged
   - Delete batch

2. **Bulk Batch Operations**
   - Select multiple batches
   - Apply action to all selected

3. **Batch History Timeline**
   - Show quantity changes over time
   - Show price changes
   - Show status changes

4. **Smart Suggestions**
   - Suggested expiry date based on category shelf life
   - Suggested price based on historical data
   - Alert if price is unusually high/low

5. **Product Image**
   - Display product image in header
   - Option to update image

6. **Related Products**
   - Show similar products
   - Show frequently bought together

---

## 11. Open Questions

1. **Do we need to persist tracking_mode?**
   - Current decision: Optional, can derive from data
   - If yes, needs database migration

2. **Should we support batch deletion from this modal?**
   - Current decision: Not in initial scope
   - Can be added as future enhancement

3. **How do we handle products with 100+ batches?**
   - Current decision: Infinite scroll in Phase 1
   - Virtual scrolling if performance issues

4. **Should the modal support editing product details?**
   - Current decision: No, "Edit in Square" message remains
   - Product editing not in scope for this modal

5. **What happens if product is deleted while modal is open?**
   - Current decision: Error handling in useProduct hook
   - Show error message, close modal

6. **When will store_products.quantity migration land?**
   - Status: Backend team working on it
   - Impact: Untracked alert will be shell until this lands
   - Decision: Build Phase 1-2 now, activate post-migration with one line change

---

## 12. Timeline Estimates

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| Phase 1 | Foundation & New Component | 3-4 days |
| Phase 2 | Interactive Features | 2-3 days |
| Phase 3 | Entry Points & Highlighting | 1 day |
| Phase 4 | Swap Products Table | 0.5 days |
| Phase 5 | Swap Batch Table | 0.5 days |
| Phase 6 | Swap Expiring Tables | 1 day |
| Phase 7 | Add Expiry Date Action | 1 day (optional) |
| Phase 8 | Cleanup & Deprecation | 0.5 days |
| **Total** | **9-11 days** | **(excluding Phase 7)** |

---

## 13. Appendix

### A. Component File Structure
```
components/
└── products/
    ├── product-detail-modal.tsx          # Main modal component
    └── product-detail-modal/
        ├── batch-list.tsx                 # List container
        ├── batch-row.tsx                  # Individual batch row
        ├── untracked-alert.tsx            # Untracked units alert
        ├── tracking-settings.tsx          # Settings section
        └── types.ts                       # Shared types
```

### B. Key Dependencies
- `@tanstack/react-query` - Data fetching and caching
- `@/components/ui/bottom-sheet` - Modal base component
- `@/hooks/use-batches` - Batch data and mutations
- `@/lib/queries/products` - Product queries
- `next-intl` - Internationalization

### C. Related Documentation
- Wireframe: `docs/wireframes/product-detail-modal.jsx`
- Current modals: `components/batches/batch-modal.tsx`, `components/products/product-modal.tsx`
- Data layer: `lib/queries/batches.ts`, `lib/queries/products.ts`

### D. Code Review Checklist
- [ ] TypeScript types are correct and strict
- [ ] Error handling is comprehensive
- [ ] Loading states are shown
- [ ] Optimistic updates work correctly
- [ ] Query invalidation is correct
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Mobile responsiveness
- [ ] Internationalization (all strings use next-intl)
- [ ] Performance (no unnecessary re-renders)
- [ ] Code follows existing patterns in codebase

---

**End of Implementation Plan**
