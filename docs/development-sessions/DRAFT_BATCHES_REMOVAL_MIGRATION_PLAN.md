# Draft Batches Removal - Migration Plan

## 🎯 Overview

**Goal**: Remove the "draft batch" concept from the frontend and migrate to a workflow where batches always have expiry dates upon creation.

**Date Created**: 2026-02-11
**Status**: Planning Phase
**Estimated Effort**: Medium-Large (3-5 days)

---

## 📊 Current State Analysis

### What Are Draft Batches?
Draft batches are batches created without expiry dates (typically from CSV uploads or delivery logging). They require users to later add expiry dates before they can be:
- Included in AI scoring
- Shown in expiring batch lists
- Processed for todos/actions

### Current User Flows Using Drafts
1. **CSV Upload without expiry dates** → Creates draft batches → User visits `/inventory/new` → Assigns expiry dates
2. **Delivery logging** → Creates draft batches → User assigns expiry dates later
3. **Dashboard notification** → Shows banner when drafts exist → Directs user to `/inventory/new`

---

## 📈 Code Impact Assessment

### ✅ ACTIVELY USED (Must Migrate - ~1,700 LOC)

#### 1. Core User-Facing Pages (320 lines)
- `app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx` - **PRIMARY INTERFACE**
  - Lists products with draft batches
  - Pagination, search, category filtering
  - Opens `BatchCreationSheet` to assign expiry dates

#### 2. Dashboard Integration (195 lines)
- `components/dashboard/dashboard-content.tsx` - Shows `DeliveryBanner` when drafts exist
- `components/dashboard/delivery-banner.tsx` - Banner component
- `hooks/use-delivery-banner-visible.ts` - Banner visibility logic with localStorage

#### 3. Navigation Integration
- `components/app-sidebar.tsx` - "Deliveries" nav item with draft count badge
- Uses `useDraftBatchCount()` hook

#### 4. Core Hooks (815 lines)
**File**: `hooks/use-draft-batches.ts`
- `useDraftBatchesSummary()` - ✅ ACTIVE (dashboard, new page)
- `useDraftBatchesByProduct()` - ✅ ACTIVE (new page)
- `useDraftBatchCount()` - ✅ ACTIVE (sidebar badge)
- `useActivateDraftBatch()` - ⚠️ Likely active (needs verification)
- `useIgnoreDraftBatch()` - ⚠️ May be active (ignored batches)
- `useLogDelivery()` - ⚠️ May be unused

#### 5. Batch Filtering & Tables
- `components/batches/batches-filtered-list.tsx` - "Draft" status filter
- `components/batches/batch-list-filters.tsx` - "Draft" dropdown option
- `lib/queries/batches.ts` - `status: 'draft'` type, `excludeDrafts` parameter

#### 6. Supporting Components
- `components/batch-creation/draft-batch-card.tsx` (108 lines) - Product card with draft count
- `components/draft-batch-notification.tsx` (230 lines) - Notification component + hooks
- `lib/utils/batch-utils.tsx` - Helper functions: `isDraftBatch()`, `canBeScored()`, `getExpiryBadge()`

### ❌ DEAD CODE (Can Delete Immediately - ~380 LOC)

#### Orphaned Page & Components
- ❌ `app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx` - NOT in navigation
- ❌ `components/batches/draft-batches-list.tsx` (225 lines)
- ❌ `components/batches/draft-batches-header.tsx` (14 lines)
- ❌ `components/batches/complete-draft-batch-dialog.tsx` (100+ lines)
- ❌ `hooks/use-batches.ts` - `useDraftBatches()` hook (only used by dead code)

### ⚠️ UNCERTAIN (Need Verification)
- `components/delivery-log/delivery-log-sheet.tsx` - May create draft batches
- `components/dashboard/add-delivery-button.tsx` - NOT imported anywhere (likely dead)
- `app/(dashboard)/dashboard/(inventory)/inventory/ignored/page.tsx` - Nav link is commented out

---

## 🔧 Backend Dependencies

### RPC Functions to Update/Remove
1. ✅ **ACTIVE** - `inventory.get_draft_batches_summary` (dashboard + new page)
2. ✅ **ACTIVE** - `inventory.get_draft_batches_by_product` (new page)
3. ⚠️ **VERIFY** - `inventory.activate_draft_batch`
4. ⚠️ **VERIFY** - `inventory.ignore_draft_batch`
5. ⚠️ **VERIFY** - `inventory.log_delivery_create_drafts`
6. ⚠️ **VERIFY** - `inventory.get_recent_delivery_products`

### Database Changes Needed
- Batch status enum: Remove `'draft'` option
- Update any queries/views filtering by draft status
- Migration for existing draft batches in production

---

## 🚀 Migration Strategy

### Phase 0: Investigation & Preparation (0.5 days)

#### Tasks
- [ ] **Verify uncertain components** - Determine if these are actually used:
  - `DeliveryLogSheet` usage
  - `BatchCreationSheet` internals (does it use `useActivateDraftBatch`?)
  - Ignored batches page status
  - `AddDeliveryButton` component
- [ ] **Check production data** - How many draft batches exist in production?
- [ ] **Review CSV upload flow** - What happens when expiry dates are missing?
- [ ] **Document backend changes needed** - Coordinate with backend team

**Deliverable**: Updated migration plan with verified components and backend requirements

---

### Phase 1: Quick Wins - Delete Dead Code (0.5 days)

#### Files to Delete (Safe - Not Used Anywhere)
```bash
# Orphaned page
app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx

# Orphaned components
components/batches/draft-batches-list.tsx
components/batches/draft-batches-header.tsx
components/batches/complete-draft-batch-dialog.tsx

# Potentially dead (verify first)
components/dashboard/add-delivery-button.tsx
```

#### Code to Remove from Existing Files
- `hooks/use-batches.ts` - Remove `useDraftBatches()` function (line 676)

#### Tasks
- [ ] Delete orphaned page and components
- [ ] Remove `useDraftBatches()` hook
- [ ] Verify no imports remain (TypeScript will catch this)
- [ ] Test build passes
- [ ] Commit: `chore: remove orphaned draft batches page and components`

**Deliverable**: ~380 lines of dead code removed, codebase cleaner

---

### Phase 2: Backend Migration (Coordinate with Backend Team)

**Note**: This must be completed before frontend changes, or done in parallel with feature flags.

#### Backend Changes Needed
1. **Update batch creation endpoints** - Always require expiry date
2. **Update CSV upload handler** - Validate/require expiry dates OR use smart defaults
3. **Remove draft-related RPCs** - Or deprecate gracefully
4. **Database migration** - Handle existing draft batches in production
5. **Update batch status enum** - Remove 'draft' option (or keep for backward compatibility)

#### Tasks
- [ ] Define new batch creation API contract
- [ ] Implement expiry date requirements in backend
- [ ] Add smart defaults for categories without expiry dates
- [ ] Create migration for existing draft batches
- [ ] Deploy backend changes
- [ ] Verify backward compatibility (if needed)

**Deliverable**: Backend no longer creates draft batches, existing drafts migrated

---

### Phase 3: Design New Workflows (0.5 days)

#### Questions to Answer
1. **CSV Upload without Expiry Dates**
   - ❓ Require expiry date column (reject upload if missing)?
   - ❓ Use category-based default shelf life?
   - ❓ Prompt user for expiry date during upload?
   - ❓ Use OCR to scan for expiry dates on photos?

2. **Delivery Logging**
   - ❓ Always require expiry date at time of entry?
   - ❓ Use smart defaults (last used expiry for same product)?
   - ❓ Remove quick delivery logging, require full batch creation?

3. **Replace `/inventory/new` Page**
   - ❓ Redirect to batch creation with expiry required?
   - ❓ Repurpose for recent deliveries view (no drafts)?
   - ❓ Remove entirely and update navigation?

#### Recommended Approach (For Discussion)
**Option A: Smart Defaults + Required Expiry**
- CSV uploads use category shelf life defaults
- User can override defaults during import review
- Delivery logging requires expiry date
- Use OCR scanning for expiry date detection

**Option B: Strict Requirements**
- All batch creation requires expiry date
- No defaults, user must always provide
- Enhanced validation and error messages

#### Tasks
- [ ] Document proposed workflows
- [ ] Create wireframes/mockups for new UX
- [ ] Get user/stakeholder approval
- [ ] Update product requirements

**Deliverable**: Approved design for new batch creation workflows

---

### Phase 4: Update Batch Filters & Tables (0.5 days)

#### Files to Update
1. **Remove "Draft" from Status Filters**
   - `components/batches/batch-list-filters.tsx` (lines 93-95)
   - Remove "draft" option from dropdown

2. **Update Batch Filters Type**
   - `lib/queries/batches.ts`
   - Remove `status: 'draft'` from type (line 62)
   - Remove or deprecate `excludeDrafts` parameter (line 69)

3. **Update Filtered List Logic**
   - `components/batches/batches-filtered-list.tsx`
   - Remove draft status handling (lines 64, 72, 76, 213)

4. **Update Utility Functions**
   - `lib/utils/batch-utils.tsx`
   - Remove or update `isDraftBatch()` (line 59)
   - Update `canBeScored()` logic (line 66)
   - Update `getExpiryBadge()` to never show "No Expiry Date" (line 38)

#### Tasks
- [ ] Remove "draft" from all status filter dropdowns
- [ ] Update `BatchFilters` type definition
- [ ] Remove `excludeDrafts` logic (or make it a no-op)
- [ ] Update utility functions to assume expiry dates always exist
- [ ] Update batch status badge rendering
- [ ] Test filtering and sorting still works
- [ ] Commit: `refactor: remove draft status from batch filters and tables`

**Deliverable**: Batch tables and filters no longer reference draft status

---

### Phase 5: Remove Core Draft Hooks (1 day)

#### Primary Hook File: `hooks/use-draft-batches.ts` (815 lines)

**Strategy**: Don't delete entire file at once. Remove incrementally as features are replaced.

#### Step 1: Remove Unused Hooks First
```typescript
// Remove these if verification confirms they're unused:
- useLogDelivery()
- useRecentDeliveryProducts()
- useActivateDraftBatch() (if BatchCreationSheet doesn't use it)
- useIgnoreDraftBatch() (if ignored batches feature is dead)
```

#### Step 2: Remove Query Functions
```typescript
// Remove RPC query functions:
- fetchDraftBatchesSummary()
- fetchDraftBatchesByProduct()
- fetchRecentDeliveryProducts()
```

#### Step 3: Remove Remaining Hooks
```typescript
// Remove after dashboard/new page are updated:
- useDraftBatchesSummary()
- useDraftBatchesByProduct()
- useDraftBatchManagement()
```

#### Step 4: Update Query Keys
- `lib/queries/query-keys.ts`
- Remove draft-related query key factories:
  ```typescript
  batches.draftSummary(storeId)
  batches.draftsByProduct(storeId, options)
  batches.recentDeliveries(storeId, limit)
  ```

#### Tasks
- [ ] Verify which hooks are actually used
- [ ] Remove unused hooks first
- [ ] Update components that use remaining hooks
- [ ] Remove query functions
- [ ] Remove query keys
- [ ] Delete entire file if empty
- [ ] Test build and runtime behavior
- [ ] Commit: `refactor: remove draft batch hooks and RPC queries`

**Deliverable**: Draft batch hooks removed, queries updated

---

### Phase 6: Update Dashboard & Navigation (1 day)

#### 6.1 Remove Delivery Banner

**Files**:
- `components/dashboard/dashboard-content.tsx` (lines 6, 13, 18, 30-38)
- `components/dashboard/delivery-banner.tsx` (entire file - 73 lines)
- `hooks/use-delivery-banner-visible.ts` (entire file - 122 lines)

**Changes**:
```typescript
// In dashboard-content.tsx
// REMOVE:
import { DeliveryBanner } from './delivery-banner'
import { useDeliveryBannerVisible } from '@/hooks/use-delivery-banner-visible'

const { isVisible, isClosing, totalDrafts, handleDismiss, summary } = useDeliveryBannerVisible()

<div className="absolute top-16 left-0 right-0">
  {isVisible && <DeliveryBanner ... />}
</div>

// UPDATE: Remove padding adjustment from main content
className={cn(
  'flex flex-col gap-10 pb-80',
  isVisible ? 'pt-16 sm:pt-12' : 'pt-0', // <-- Remove this conditional
)}
```

#### 6.2 Update Sidebar Navigation

**File**: `components/app-sidebar.tsx`

**Changes**:
```typescript
// REMOVE import:
import { useDraftBatchCount } from '@/components/draft-batch-notification'

// REMOVE hook:
const draftBatchCount = useDraftBatchCount() // line 35

// UPDATE navigation item (lines 66-70):
// Option A: Remove badge entirely
{
  title: t('deliveries'),
  url: '/dashboard/inventory/new', // May need to change this URL too
  icon: PackagePlus,
  // badge: draftBatchCount, // <-- REMOVE
}

// Option B: Remove entire nav item if /inventory/new is being removed
// (Decision depends on Phase 3 design)
```

#### 6.3 Remove Draft Batch Notification Component

**File**: `components/draft-batch-notification.tsx` (230 lines)

**What to do**:
- ✅ Can delete entire file after sidebar is updated
- Contains: `DraftBatchNotification` component, `useDraftBatchCount()`, `useIgnoredBatchCount()`

#### Tasks
- [ ] Remove `DeliveryBanner` from dashboard
- [ ] Delete `delivery-banner.tsx` and `use-delivery-banner-visible.ts`
- [ ] Remove draft batch count badge from sidebar
- [ ] Delete `draft-batch-notification.tsx`
- [ ] Update navigation structure (if needed based on Phase 3 design)
- [ ] Test dashboard loads without errors
- [ ] Test navigation works correctly
- [ ] Commit: `refactor: remove draft batch notifications and dashboard banner`

**Deliverable**: Dashboard and navigation no longer show draft batch indicators

---

### Phase 7: Handle `/inventory/new` Page (1 day)

**Current File**: `app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx` (320 lines)

**Decision Point**: What replaces this page? (Based on Phase 3 design)

#### Option A: Remove Entirely
```bash
# Delete page
rm app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx

# Delete supporting component
rm components/batch-creation/draft-batch-card.tsx

# Update navigation to remove "Deliveries" link
# OR redirect to new batch creation flow
```

#### Option B: Repurpose Page
```typescript
// Rename and repurpose as "Recent Deliveries" or "Add Batch"
// Show recent batches (not drafts)
// Add new batch with expiry required
```

#### Option C: Redirect
```typescript
// app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx
export default function NewPage() {
  redirect('/dashboard/inventory/batches')
  // Or redirect to new batch creation flow
}
```

#### Tasks
- [ ] Implement chosen approach from Phase 3 design
- [ ] Delete or update `/inventory/new` page
- [ ] Delete `draft-batch-card.tsx` if no longer needed
- [ ] Update any links pointing to `/inventory/new`
- [ ] Add redirects if needed
- [ ] Test navigation and user flows
- [ ] Commit: `refactor: replace /inventory/new page with new batch creation flow`

**Deliverable**: `/inventory/new` page removed or repurposed

---

### Phase 8: Update Types & Validation (0.5 days)

#### 8.1 Update RPC Types

**File**: `types/rpc-returns.ts`

**Remove these types** (lines 77-151):
```typescript
// Remove:
export interface DraftBatchItem { ... }
export interface DraftBatchesByProduct { ... }
export interface DraftBatchesSummaryResponse { ... }
export interface ActivateDraftBatchResponse { ... }
export interface IgnoreDraftBatchResponse { ... }

// Update:
export type BatchStatus =
  | 'draft'  // <-- Remove this
  | 'active'
  | 'ignored'
  | 'expired'
  | 'sold_out'
  | 'depleted'
  | 'donated'
  | 'disposed'
```

#### 8.2 Update Validation Schemas

**File**: `lib/validation/rpc-schemas.ts` (lines 123-207)

**Remove these schemas**:
```typescript
// Remove:
DraftBatchItemSchema
DraftBatchCategorySummarySchema
DraftBatchesSummaryResponseSchema
DraftBatchesByProductSchema
ActivateDraftBatchResponseSchema
IgnoreDraftBatchResponseSchema
```

#### 8.3 Update Type Exports

Search for any re-exports of draft types:
```bash
# Find all type exports
grep -r "export.*Draft.*Batch" --include="*.ts" --include="*.tsx"
```

#### Tasks
- [ ] Remove draft batch types from `rpc-returns.ts`
- [ ] Remove `'draft'` from `BatchStatus` enum
- [ ] Remove validation schemas
- [ ] Update type exports/re-exports
- [ ] Run TypeScript build to find any remaining references
- [ ] Fix any type errors
- [ ] Commit: `refactor: remove draft batch types and validation schemas`

**Deliverable**: Type system no longer includes draft batch concepts

---

### Phase 9: Update CSV Upload Flow (1 day)

**Files to Update** (depends on investigation in Phase 0):
- `hooks/use-csv-upload.ts`
- CSV upload components
- Batch creation sheets

#### Approach (Based on Phase 3 Design)

**If using smart defaults**:
```typescript
// Update CSV parsing to:
1. Use category shelf life as default expiry
2. Show preview with calculated expiry dates
3. Allow user to override before upload
4. Validate all batches have expiry dates
5. Submit to backend (no drafts created)
```

**If requiring expiry dates**:
```typescript
// Update CSV parsing to:
1. Validate expiry_date column exists
2. Validate all rows have valid expiry dates
3. Reject upload if any dates missing
4. Show clear error messages
5. Provide CSV template with required columns
```

#### Tasks
- [ ] Update CSV validation logic
- [ ] Add expiry date requirements/defaults
- [ ] Update error messages
- [ ] Update CSV templates/documentation
- [ ] Test CSV upload with various scenarios
- [ ] Commit: `feat: require expiry dates in CSV uploads`

**Deliverable**: CSV uploads no longer create draft batches

---

### Phase 10: Cleanup & Testing (0.5 days)

#### Files to Review for Any Remaining References

```bash
# Search for any remaining draft references
grep -ri "draft.*batch\|batch.*draft" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.json" \
  components/ hooks/ lib/ app/
```

#### Potential Cleanup Areas
1. **Translation files** - Remove draft-related i18n keys
   - `messages/en/common.json` - "draftBatches", "drafts"
   - `messages/en/inventory.json` - "draft" status, "draftBatches" section
   - `messages/en/dashboard.json` - "draftBatches"
   - Same for `fr/` and `nl/` directories

2. **Documentation** - Update or remove:
   - `docs/misc/DRAFT_BATCHES_IMPLEMENTATION.md`
   - `docs/misc/BATCH_CREATION_TESTING_GUIDE.md`
   - Any other references in docs/

3. **Comments & Logs** - Search for:
   - `// draft batch` comments
   - Log messages mentioning drafts
   - TODO comments related to drafts

#### Comprehensive Testing

**Test Scenarios**:
- [ ] CSV upload (with and without expiry dates)
- [ ] Manual batch creation
- [ ] Dashboard loads without errors
- [ ] Navigation works correctly
- [ ] Batch filtering and sorting
- [ ] Batch tables display correctly
- [ ] No console errors or warnings
- [ ] TypeScript build passes
- [ ] All unit tests pass

**Smoke Test Checklist**:
- [ ] Create new batch (manual)
- [ ] Upload CSV
- [ ] View batches list
- [ ] Filter by status (no "draft" option)
- [ ] Sort batches
- [ ] View batch details
- [ ] Navigate through app without errors

#### Tasks
- [ ] Search and remove any remaining draft references
- [ ] Clean up translation files
- [ ] Update/remove documentation
- [ ] Run full test suite
- [ ] Manual smoke testing
- [ ] Fix any issues found
- [ ] Final commit: `chore: remove remaining draft batch references`

**Deliverable**: No draft batch references remain, all tests passing

---

## 📦 Summary of Changes

### Files to Delete (8 files)
```
app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx
components/batches/draft-batches-list.tsx
components/batches/draft-batches-header.tsx
components/batches/complete-draft-batch-dialog.tsx
components/dashboard/delivery-banner.tsx
components/draft-batch-notification.tsx
hooks/use-delivery-banner-visible.ts
hooks/use-draft-batches.ts (entire file)
```

### Files to Modify (12+ files)
```
components/app-sidebar.tsx - Remove badge
components/dashboard/dashboard-content.tsx - Remove banner
components/batches/batches-filtered-list.tsx - Remove draft filter
components/batches/batch-list-filters.tsx - Remove draft option
lib/queries/batches.ts - Remove draft types/filters
lib/queries/query-keys.ts - Remove draft query keys
lib/utils/batch-utils.tsx - Update utility functions
types/rpc-returns.ts - Remove draft types
lib/validation/rpc-schemas.ts - Remove validation schemas
hooks/use-batches.ts - Remove useDraftBatches hook
app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx - Remove or repurpose
+ Translation files (en, fr, nl)
```

### Estimated Lines of Code Impact
- **Delete**: ~1,100 lines (dead code + active components)
- **Modify**: ~600 lines
- **Total Impact**: ~1,700 lines

---

## 🎯 Success Criteria

### Functional Requirements
- ✅ All batches have expiry dates when created
- ✅ No draft batch status in the system
- ✅ CSV uploads validate/require expiry dates
- ✅ Manual batch creation requires expiry date
- ✅ Dashboard no longer shows draft batch notifications
- ✅ Navigation no longer has draft batch indicators
- ✅ Batch filtering works without draft status

### Technical Requirements
- ✅ TypeScript build passes with no errors
- ✅ All tests pass
- ✅ No console errors in browser
- ✅ No dead code remains
- ✅ No draft batch references in codebase
- ✅ Backend API integration works correctly

### User Experience
- ✅ Clear error messages when expiry dates missing
- ✅ Smooth batch creation workflow
- ✅ No confusion about batch status
- ✅ Dashboard is cleaner without draft notifications

---

## ⚠️ Risks & Mitigation

### Risk 1: Production Data with Draft Batches
**Impact**: High
**Likelihood**: High
**Mitigation**:
- Backend migration to convert existing drafts
- Add migration script to set default expiry dates
- Test migration on staging environment first

### Risk 2: Breaking Existing Workflows
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Document new workflows clearly
- Provide user training/communication
- Add helpful error messages
- Consider soft launch with subset of users

### Risk 3: Backend/Frontend Sync Issues
**Impact**: High
**Likelihood**: Medium
**Mitigation**:
- Coordinate closely with backend team
- Use feature flags if deploying separately
- Test integration thoroughly
- Have rollback plan ready

### Risk 4: Missed References
**Impact**: Medium
**Likelihood**: Medium
**Mitigation**:
- Thorough code search in Phase 10
- Comprehensive testing
- TypeScript will catch most issues
- Monitor error logs after deployment

---

## 📋 Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console warnings or errors
- [ ] Code review completed
- [ ] Tests written and passing
- [ ] Documentation updated

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual smoke testing completed
- [ ] Cross-browser testing
- [ ] Mobile responsive testing

### Backend Coordination
- [ ] Backend changes deployed
- [ ] API contract matches expectations
- [ ] Migration script run successfully
- [ ] Staging environment tested

### Deployment
- [ ] Feature flags configured (if using)
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured
- [ ] User communication prepared
- [ ] Team notified of deployment

---

## 📞 Questions & Decisions Log

### Open Questions
1. ❓ What happens to existing draft batches in production?
2. ❓ Should CSV uploads require expiry dates or use smart defaults?
3. ❓ What replaces the `/inventory/new` page?
4. ❓ Are ignored batches still a needed feature?
5. ❓ Should we keep "draft" in status enum for backward compatibility?

### Decisions Made
- [ ] **Decision 1**: [To be filled during Phase 0-3]
- [ ] **Decision 2**: [To be filled during Phase 0-3]
- [ ] **Decision 3**: [To be filled during Phase 0-3]

---

## 📚 References

### Related Documentation
- `docs/misc/DRAFT_BATCHES_IMPLEMENTATION.md` - Original implementation
- `docs/misc/BATCH_CREATION_TESTING_GUIDE.md` - Current batch creation flows
- Backend API documentation - Batch creation endpoints

### Related Issues/PRs
- [Link to issue tracking this migration]
- [Link to related backend PR]

---

## 📅 Timeline Estimate

| Phase | Days | Dependencies |
|-------|------|--------------|
| Phase 0: Investigation | 0.5 | None |
| Phase 1: Delete Dead Code | 0.5 | Phase 0 |
| Phase 2: Backend Migration | TBD | Backend team |
| Phase 3: Design New Workflows | 0.5 | Phase 0 |
| Phase 4: Update Filters | 0.5 | Phase 2 |
| Phase 5: Remove Hooks | 1.0 | Phase 2 |
| Phase 6: Dashboard/Nav | 1.0 | Phase 5 |
| Phase 7: /inventory/new | 1.0 | Phase 3, 5 |
| Phase 8: Types/Validation | 0.5 | Phase 5 |
| Phase 9: CSV Upload | 1.0 | Phase 2, 3 |
| Phase 10: Cleanup/Testing | 0.5 | All phases |
| **Total** | **7.0 days** | (Frontend only) |

**Note**: Backend migration (Phase 2) timeline to be determined by backend team.

---

## ✅ Progress Tracking

### Completed Phases
- [ ] Phase 0: Investigation & Preparation
- [ ] Phase 1: Quick Wins - Delete Dead Code
- [ ] Phase 2: Backend Migration
- [ ] Phase 3: Design New Workflows
- [ ] Phase 4: Update Batch Filters & Tables
- [ ] Phase 5: Remove Core Draft Hooks
- [ ] Phase 6: Update Dashboard & Navigation
- [ ] Phase 7: Handle `/inventory/new` Page
- [ ] Phase 8: Update Types & Validation
- [ ] Phase 9: Update CSV Upload Flow
- [ ] Phase 10: Cleanup & Testing

### Current Status
**Phase**: Planning
**Last Updated**: 2026-02-11
**Blocker**: None
**Next Steps**: Review plan, get approval, start Phase 0

---

*This document will be updated as the migration progresses.*
