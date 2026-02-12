# Product Detail Modal

A unified modal for viewing and managing product inventory with all associated batches.

## Phase 1 Status: ✅ Complete
## Phase 2.1 Status: ✅ Complete (Tracking Settings Save Button)
## Phase 2 Status: ⏳ In Progress

Phase 1 (display) and Phase 2.1 (tracking settings save) are complete. Remaining Phase 2 features (batch editing, untracked alert) are in progress.

## Usage

```tsx
import { ProductDetailModal } from '@/components/products/product-detail-modal'

// Entry Point 1: Default view (from product row)
<ProductDetailModal
  isOpen={isOpen}
  onClose={handleClose}
  productId="product-uuid"
/>

// Entry Point 2: Highlight specific batch (from expiring soon table)
<ProductDetailModal
  isOpen={isOpen}
  onClose={handleClose}
  productId="product-uuid"
  highlightBatchId="batch-uuid"  // Batch highlighted for 3 seconds
/>

// Entry Point 3: Focus on adding expiry date
<ProductDetailModal
  isOpen={isOpen}
  onClose={handleClose}
  productId="product-uuid"
  focusAddDate={true}  // Expands untracked alert, focuses input
/>
```

## Components

### Main Modal
- `product-detail-modal.tsx` - Main modal component

### Sub-components
- `batch-list.tsx` - List of all batches with empty state and loading skeleton ✅
- `batch-row.tsx` - Individual batch row with urgency indicator (display-only, editing pending) ⏳
- `untracked-alert.tsx` - Alert for untracked units (shell ready, shows 0 until migration) ⏳
- `tracking-settings.tsx` - Tracking mode and shelf life settings with Save button ✅

## Features Implemented

### Phase 1 - Display ✅ Complete
✅ Product header with SKU, category, brand, total stock
✅ All batches displayed, sorted by expiry (soonest first)
✅ Batch urgency indicators (micro-bar + color coding)
✅ Days-left labels with dynamic styling
✅ Batch highlighting (Entry Point 2)
✅ Focus on add date (Entry Point 3)
✅ Empty state when no batches
✅ Loading skeletons
✅ Tracking settings display

### Phase 2.1 - Tracking Settings Save Button ✅ Complete
✅ Shelf life editing with explicit Save button
✅ Updates store-wide category defaults (`store_category_settings.default_shelf_life_days`)
✅ Visual dirty state indicator (blue border when edited)
✅ Success toast with category name
✅ Loading states and error handling

### Phase 2 - Interactive Features ⏳ In Progress
⏳ Inline batch editing (click row to edit expiry date & quantity)
⏳ Batch updates with optimistic UI
⏳ Batch creation from untracked alert
⏳ Toast notifications for batch actions

## Features Pending

### Phase 2 - Still To Do
⏳ Inline batch editing (expiry_date, current_quantity)
  - Click batch row to edit
  - Optimistic updates
  - Error handling and validation
⏳ Batch creation from untracked alert
  - Add batches for untracked inventory
  - Auto-calculate remaining quantity

### Phase 3+ - Blocked or Future
🚧 Untracked units calculation (blocked on `store_products.quantity` migration)
  - UI is built and ready
  - Currently shows 0 until migration lands
  - One-line fix to activate: see TODO in main modal
⏳ Tracking mode toggle (auto/manual)
  - Requires `tracking_mode` column on products table
  - UI is built, just needs backend column
⏳ Batch price editing (cost_price, selling_price)
  - Currently only edits expiry_date and current_quantity
  - Easy to add in future iteration

## Data Dependencies

### Current (Phase 1)
- Product data via `useProduct(productId)`
- Batches data via `useBatchesForProduct(productId)`
- Both hooks already exist and working ✅

### Blocked on Migration
- **Untracked quantity calculation** requires `store_products.quantity` column
- Currently hardcoded to 0 until backend migration lands
- One-line fix to activate post-migration (see TODO in main modal)

## Testing

To test the modal in development:
1. Import the modal into any component
2. Pass a valid `productId` from your store
3. Open the modal - it will fetch product and batches automatically

Example test locations:
- `products-table.tsx` - Click product row
- `batch-table.tsx` - Click batch row (pass `batch.product_id` and `batch.batch_id` for highlight)

## Next Steps

Remaining Phase 2 work:
- Add inline editing to `batch-row.tsx` (click to edit expiry date & quantity)
- Wire up batch creation in `untracked-alert.tsx` (add batches for untracked units)
- Add batch update mutations with optimistic UI
- Add loading states and error handling for batch mutations

See full implementation plan: `docs/implementation-plans/product-detail-modal-unified.md`
