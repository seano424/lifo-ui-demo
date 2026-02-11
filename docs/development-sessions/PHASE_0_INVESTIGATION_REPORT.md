# Phase 0 Investigation Report - Draft Batches Removal

**Date**: 2026-02-11
**Status**: Complete ✅

---

## 🎯 Executive Summary

### Key Findings
1. **DeliveryLogSheet + AddDeliveryButton = DEAD CODE** (~398 lines can be deleted immediately)
2. **BatchCreationSheet is heavily used** and depends on draft batch hooks
3. **Ignored batches feature exists but hidden** (nav commented out)
4. **CSV uploads allow missing expiry dates** (creates draft batches)
5. **2 hooks are dead code** (useLogDelivery, useRecentDeliveryProducts)

### Updated Line Count
- **Active Code**: ~1,300 lines (reduced from 1,700)
- **Dead Code**: ~780 lines (increased from 380)
- **Total Impact**: ~2,080 lines

---

## 1️⃣ DeliveryLogSheet Investigation

### Component Details
- **File**: `components/delivery-log/delivery-log-sheet.tsx`
- **Size**: 365 lines
- **Status**: ❌ **DEAD CODE**

### Import Analysis
```typescript
// Only imported by:
1. components/dashboard/add-delivery-button.tsx (DEAD CODE)
2. components/delivery-log/delivery-log-example.tsx (Example file, not production)
```

### Functionality
- Quick-add delivery log sheet with recent products
- Creates draft batches when "Done with Delivery" is clicked
- Opens BatchCreationSheet after delivery to add expiry dates
- Uses draft-related hooks:
  - `useRecentDeliveryProducts()`
  - `useLogDelivery()`
  - `useDraftBatchesByProduct()`

### Backend Dependencies
- RPC: `inventory.log_delivery_create_drafts` (likely unused)
- RPC: `inventory.get_recent_delivery_products` (likely unused)

### Impact on Migration
✅ **Can delete entire component + AddDeliveryButton immediately**

---

## 2️⃣ AddDeliveryButton Investigation

### Component Details
- **File**: `components/dashboard/add-delivery-button.tsx`
- **Size**: 33 lines
- **Status**: ❌ **DEAD CODE**

### Import Analysis
```bash
# Search results:
No imports found in production code
Only referenced in documentation
```

### Confirmation
```typescript
// Imports DeliveryLogSheet (also dead code)
import { DeliveryLogSheet } from '@/components/delivery-log'
```

### Impact on Migration
✅ **Can delete immediately**

---

## 3️⃣ BatchCreationSheet Investigation

### Component Details
- **File**: `components/batch-creation/batch-creation-sheet.tsx`
- **Size**: 582 lines
- **Status**: ✅ **ACTIVELY USED**

### Usage Locations
1. **app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx** - Main usage
2. **components/delivery-log/delivery-log-sheet.tsx** - Dead code usage

### Draft Hook Dependencies (CONFIRMED)
```typescript
// Line 26-30
import {
  useActivateDraftBatch,     // ✅ USED (line 113)
  useIgnoreDraftBatch,        // ✅ USED (line 114)
  useDraftBatchesByProduct,   // ✅ USED (line 98-102)
  type ActivateDraftBatchResult,
} from '@/hooks/use-draft-batches'
```

### Functionality
- Multi-step sheet for activating draft batches
- Step 1: Product selection (if multiple products)
- Step 2: Expiry date entry with quantity selector
- Step 3: Success feedback with split batch handling

### Impact on Migration
⚠️ **CRITICAL COMPONENT** - Must be refactored or replaced
This is the core UI for the entire draft batch workflow

---

## 4️⃣ Ignored Batches Page Investigation

### Page Details
- **File**: `app/(dashboard)/dashboard/(inventory)/inventory/ignored/page.tsx`
- **Size**: 151 lines
- **Status**: ✅ **ACTIVE CODE** but ⚠️ **HIDDEN FROM NAV**

### Navigation Status
```typescript
// components/app-sidebar.tsx (lines 71-75)
// {
//   title: t('ignored'),
//   url: '/dashboard/inventory/ignored',
//   icon: XCircle,
// },
```

### Functionality
- Displays ignored batches summary
- Uses RPCs:
  - `inventory.get_ignored_batches_summary`
  - `inventory.get_ignored_batches_by_product`

### Key Question
❓ **Are ignored batches separate from draft batches?**

**Answer**: YES - Ignored batches are a separate status
- Batches can be ignored at any time (draft or active)
- `useIgnoreDraftBatch()` hook is used to ignore draft batches
- Ignored batches page may remain relevant even after draft removal

### Impact on Migration
⚠️ **NEEDS DECISION**:
- Option A: Keep ignored batches feature (unrelated to draft removal)
- Option B: Remove ignored batches entirely (separate decision)
- Recommendation: **Keep it** - ignored batches != draft batches

---

## 5️⃣ CSV Upload Flow Investigation

### Hook Details
- **File**: `hooks/use-csv-upload.ts`
- **Column Mappings**: Supports various expiry date column names
  - `best_before`, `use_by`, `expiration_date`, `exp_date`, `expiry`

### Current Behavior with Missing Expiry Dates
```typescript
// Line 354-363
const hasExpiryColumn = !!expiryCol
let itemsWithoutExpiry = 0

const rawExpiry = expiryCol ? row[expiryCol] : ''
const expiryValue = convertToISODate(rawExpiry)

if (!expiryValue) {
  itemsWithoutExpiry++
}
```

### Key Findings
1. ✅ Tracks if CSV has expiry column (`hasExpiryColumn`)
2. ✅ Counts items without expiry dates (`itemsWithoutExpiry`)
3. ❌ **Allows upload with empty expiry dates** (creates draft batches)
4. ❓ Backend behavior unknown - need to verify

### Impact on Migration
⚠️ **REQUIRES NEW DESIGN**:
- Option A: Reject CSV uploads without expiry dates
- Option B: Use category-based default shelf life
- Option C: Prompt user for expiry date during upload preview

---

## 6️⃣ Backend RPC Functions - Verification

### ✅ Actively Used (Must Keep Until Migration)
```typescript
// Used by dashboard + new page
inventory.get_draft_batches_summary(p_store_id)

// Used by new page + BatchCreationSheet
inventory.get_draft_batches_by_product(p_store_id, options)

// Used by BatchCreationSheet
inventory.activate_draft_batch(batch_id, expiry_date, quantity)

// Used by BatchCreationSheet
inventory.ignore_draft_batch(batch_id, quantity)
```

### ❌ Dead Code (Only Used by DeliveryLogSheet)
```typescript
// Only used by dead component
inventory.log_delivery_create_drafts(store_id, items)

// Only used by dead component
inventory.get_recent_delivery_products(store_id, limit)
```

### ⚠️ Uncertain
```typescript
// Used by ignored batches page (separate feature?)
inventory.get_ignored_batches_summary(p_store_id)
inventory.get_ignored_batches_by_product(p_store_id, options)
```

---

## 7️⃣ Draft Hooks Status - use-draft-batches.ts

### ✅ Actively Used Hooks (815-line file)
```typescript
useDraftBatchesSummary()       // Dashboard, new page
useDraftBatchesByProduct()     // New page, BatchCreationSheet
useDraftBatchCount()           // Sidebar badge
useActivateDraftBatch()        // BatchCreationSheet
useIgnoreDraftBatch()          // BatchCreationSheet
useDraftBatchManagement()      // Composite hook (internal)
```

### ❌ Dead Code Hooks
```typescript
useLogDelivery()              // Only used by DeliveryLogSheet (DEAD)
useRecentDeliveryProducts()   // Only used by DeliveryLogSheet (DEAD)
```

### Impact on Migration
- Can remove 2 hooks immediately (~150 lines)
- Remaining 5 hooks must be removed during phases 5-7

---

## 8️⃣ Production Data Questions

### Critical Questions for Backend Team

1. **How many draft batches exist in production?**
   - Need migration strategy for existing data
   - Potential approaches:
     - Auto-assign category-based default expiry dates
     - Mark as "needs review" status
     - Admin tool to bulk assign expiry dates

2. **Are ignored batches used in production?**
   - If yes, keep the feature
   - If no, can remove entirely

3. **What happens in CSV upload without expiry dates?**
   - Backend creates draft batches? (assumed yes)
   - Need to update backend to either:
     - Reject uploads without expiry dates
     - Use smart defaults based on category

4. **Backend migration timeline?**
   - Frontend changes depend on backend readiness
   - Need coordinated deployment or feature flags

---

## 🎯 Updated Migration Impact

### Files to Delete Immediately (10 files, ~780 LOC)

#### Dead Code - Phase 1
```
app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx
components/batches/draft-batches-list.tsx (225 lines)
components/batches/draft-batches-header.tsx (14 lines)
components/batches/complete-draft-batch-dialog.tsx (100 lines)
components/dashboard/add-delivery-button.tsx (33 lines)          [NEW]
components/delivery-log/delivery-log-sheet.tsx (365 lines)       [NEW]
components/delivery-log/delivery-log-example.tsx                 [NEW]
components/delivery-log/recent-product-card.tsx                  [NEW]
components/delivery-log/delivery-summary.tsx                     [NEW]
```

#### Hooks to Remove
```typescript
// From hooks/use-batches.ts
useDraftBatches()                // Only used by dead page

// From hooks/use-draft-batches.ts
useLogDelivery()                 // Only used by DeliveryLogSheet [NEW]
useRecentDeliveryProducts()      // Only used by DeliveryLogSheet [NEW]
```

### Files with Active Code (~1,300 LOC)

```
app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx (320 lines)
components/batch-creation/batch-creation-sheet.tsx (582 lines)
components/dashboard/dashboard-content.tsx (195 lines - banner)
components/app-sidebar.tsx (badge)
hooks/use-draft-batches.ts (665 lines remaining after removing 2 hooks)
+ 12 other files with modifications
```

---

## ✅ Decisions Made

### 1. DeliveryLogSheet Status
**Decision**: DELETE - Dead code not used in production
**Confidence**: High ✅
**Files to delete**:
- `components/delivery-log/delivery-log-sheet.tsx`
- `components/dashboard/add-delivery-button.tsx`
- Related delivery-log components

### 2. Ignored Batches Feature
**Decision**: KEEP - Separate from draft batches
**Confidence**: Medium ⚠️
**Rationale**: Ignored batches are a status applied to any batch (draft or active)
**Action**: Verify with backend team if used in production

### 3. CSV Upload Strategy
**Decision**: NEEDS DESIGN (Phase 3)
**Confidence**: N/A
**Options**:
- A: Require expiry dates in CSV (strict)
- B: Use category-based defaults (smart)
- C: Hybrid - defaults with user override

---

## 📋 Next Steps

### Immediate Actions (Phase 1)
1. ✅ Delete DeliveryLogSheet and related components (~398 lines)
2. ✅ Delete AddDeliveryButton (~33 lines)
3. ✅ Remove useLogDelivery() hook (~75 lines)
4. ✅ Remove useRecentDeliveryProducts() hook (~75 lines)
5. ✅ Delete dead batch page and components (~339 lines)
6. **Total Quick Wins**: ~920 lines deleted

### Coordination Needed (Phase 2)
1. ❓ Verify production draft batch count
2. ❓ Confirm ignored batches usage
3. ❓ Design CSV upload expiry date strategy
4. ❓ Plan backend migration approach
5. ❓ Establish deployment coordination

### Design Needed (Phase 3)
1. Design replacement for `/inventory/new` page
2. Design CSV upload with required expiry dates
3. Design migration for existing draft batches
4. Update user documentation

---

## 📊 Updated Timeline Estimate

| Phase | Days | Status |
|-------|------|--------|
| Phase 0: Investigation | 0.5 | ✅ Complete |
| Phase 1: Delete Dead Code | 0.5 | 🟢 Ready to start |
| Phase 2: Backend Coordination | TBD | 🟡 Awaiting backend team |
| Phase 3: Design New Workflows | 0.5 | 🟡 Needs decisions |
| Phase 4-10: Implementation | 5.5 | ⚪ Blocked by Phase 2-3 |
| **Total** | **7.0 days** | (Frontend only) |

---

## 🚨 Blockers & Risks

### High Priority
1. ❗ **Backend coordination required** before phases 4-10
2. ❗ **Production data migration strategy** needed
3. ❗ **CSV upload design decision** blocks Phase 9

### Medium Priority
1. ⚠️ Verify ignored batches usage (separate from draft removal)
2. ⚠️ Plan deployment strategy (feature flags vs coordinated release)

### Low Priority
1. ℹ️ Update documentation after completion
2. ℹ️ Consider user communication plan

---

**Investigation Complete**: Phase 0 ✅
**Next Action**: Proceed to Phase 1 (Delete Dead Code)
**Estimated Time**: 0.5 days (920 lines to delete)
