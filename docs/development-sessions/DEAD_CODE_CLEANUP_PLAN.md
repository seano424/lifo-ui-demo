# Dead Code Cleanup Migration Plan

**Date Created:** February 11, 2026
**Last Updated:** February 11, 2026
**Status:** Planning Phase

## Executive Summary

Following the successful removal of draft batch functionality, we've identified approximately **600+ lines of unused code** across components, hooks, utilities, and services. This document outlines a phased approach to clean up dead code while preserving critical functionality.

### Key Metrics
- **Unused Components:** 8+
- **Unused Hooks:** 6 functions across 2 files (revised: use-setup-progress still in use)
- **Unused Services:** 1 major file (376 lines)
- **Component Variants:** 3-4 duplicates to consolidate
- **Estimated Impact:** ~900+ lines of dead code removal

---

## 🔒 Code to PRESERVE (Do Not Remove)

### Critical Functionality - KEEP
1. **CSV Upload Form**
   - Location: `components/csv-upload-form.tsx` (and related files)
   - Status: ✅ Active feature

2. **Scanning Code**
   - Location: `components/scanning/**/*`
   - Includes: Barcode scanning, OCR, inventory forms
   - Status: ✅ Core feature

### Verification Checklist Before Removal
Before removing any file, verify it's NOT:
- [ ] Part of csv-upload-form workflow
- [ ] Part of scanning workflow (barcode/OCR)
- [ ] Imported by csv-upload or scanning code
- [ ] Used in active production routes

---

## 📋 Dead Code Inventory

### 🔴 Phase 1: High Priority - Safe Removals (Zero Imports)

#### 1.1 Services Layer
- **File:** `lib/services/metrics.ts`
  - **Lines:** 376
  - **Exports:** `getMetricsService()`, `useMetrics()`, `fetchWithMetrics()`
  - **Imports:** 0
  - **Risk:** ✅ None - completely unused
  - **Action:** DELETE

#### 1.2 Hooks Layer
- **File:** `hooks/use-kpi-trends.ts`
  - **Functions:** 5 hooks
    - `useInventoryKPITrends()`
    - `useSalesKPITrends()`
    - `useDonationKPITrends()`
    - `useWasteKPITrends()`
    - `useDashboardKPITrends()`
  - **Imports:** 0
  - **Risk:** ✅ None
  - **Action:** DELETE

- **File:** `hooks/use-expiry-dashboard-summary.ts`
  - **Functions:** `useExpiryDashboardSummary()`
  - **Imports:** 0
  - **Risk:** ✅ None (duplicate functionality)
  - **Action:** DELETE

- ~~**File:** `lib/hooks/use-setup-progress.ts`~~ **REMOVED FROM PHASE 1**
  - **Status:** ❌ Still in active use by setup flow components
  - **Used by:** `dashboard-page-client.tsx`, `setup-steps-sidebar.tsx`
  - **Action:** KEEP - Investigation needed to understand relationship with setup-flow-store

#### 1.3 Utilities Layer
- **File:** `lib/utils/language-detection.ts`
  - **Functions:** 3 functions
    - `detectBrowserLanguage()`
    - `detectTimezone()`
    - `getLanguageFromTimezone()`
  - **Imports:** 0
  - **Risk:** ⚠️ Low (useful utilities but unused)
  - **Action:** DELETE (can restore from git if needed)

#### 1.4 Stores Layer
- **File:** `lib/stores/batch-tracking-onboarding-store.ts`
  - **Imports:** 0
  - **Risk:** ✅ None (replaced by `lib/queries/batch-tracking-onboarding.ts`)
  - **Action:** DELETE

**Phase 1 Total:** ~400-500 lines of code (revised down after removing use-setup-progress)

---

### 🟡 Phase 2: Medium Priority - Component Consolidation

#### 2.1 Todo Card Variants (3 versions exist)
- **v1:** `components/todos/todo-card.tsx`
  - **Status:** UNUSED (0 imports)
  - **Action:** DELETE

- **v2:** `components/todos/todo-card-v2.tsx`
  - **Status:** Minimal use (only in `todo-card-list.tsx`)
  - **Action:** CONSOLIDATE into v3 or DELETE

- **v3:** `components/todos/todo-card-v3.tsx`
  - **Status:** ✅ Active version
  - **Action:** KEEP (rename to `todo-card.tsx` after cleanup)

**Strategy:**
1. Verify v3 is the canonical version in use
2. Check if v2 has any features v3 doesn't
3. Migrate any v2 usage to v3
4. Delete v1 and v2
5. Rename v3 to `todo-card.tsx`

#### 2.2 Filter Bar Variants (2 versions)
- **v1:** `components/todos/filters/unified-search-filters-bar.tsx`
  - **Status:** Superseded by v2
  - **Action:** DELETE (verify v2 usage first)

- **v2:** `components/todos/filters/unified-search-filters-bar-v2.tsx`
  - **Status:** ✅ Active version
  - **Action:** KEEP (rename to remove `-v2` suffix after cleanup)

#### 2.3 Dashboard Components
- **File:** `components/dashboard/TimeSelector.tsx`
  - **Exports:** `TimePeriod`, `TimeRange`, `TimeSelector`
  - **Imports:** 0
  - **Risk:** ✅ None
  - **Action:** DELETE

- **File:** `components/dashboard/TrendIndicator.tsx`
  - **Exports:** `TrendDirection`, `TrendIndicator`
  - **Imports:** 1 (only in unused query file)
  - **Risk:** ✅ None
  - **Action:** DELETE

#### 2.4 Notification Components
- **File:** `components/notifications/notification-bell.tsx`
  - **Status:** Replaced by `notification-bell-expiry.tsx`
  - **Imports:** 0 (only `NotificationBellExpiry` is used)
  - **Action:** DELETE

**Phase 2 Total:** ~300-400 lines of code

---

### 🟢 Phase 3: Low Priority - Test Files & Cleanup

#### 3.1 Test Components
- **File:** `components/toast-test.tsx`
  - **Usage:** Only in `__tests__/translations/hardcoded-text.test.ts`
  - **Risk:** ⚠️ Low (test-only component)
  - **Action:** EVALUATE - keep if test is valuable, delete if test is outdated

#### 3.2 Comment Cleanup
- **File:** `components/scanning/shared/inventory-form.tsx`
  - **Issue:** Contains comments referencing removed "draft batches"
  - **Action:** REMOVE outdated comments

- **File:** `components/dashboard/delivery-banner.tsx`
  - **Issue:** Contains comments referencing removed "draft batches"
  - **Action:** REMOVE outdated comments

**Phase 3 Total:** Minimal code, mostly cleanup

---

## 🚀 Execution Plan

### Phase 1: High Priority Removals (Week 1)
**Goal:** Remove all zero-import files (safest wins)

**Checklist:**
- [ ] Delete `lib/services/metrics.ts`
- [ ] Delete `hooks/use-kpi-trends.ts`
- [ ] Delete `hooks/use-expiry-dashboard-summary.ts`
- [ ] Delete `lib/utils/language-detection.ts`
- [ ] Delete `lib/stores/batch-tracking-onboarding-store.ts`
- [ ] Run `npm run check` to verify no type errors
- [ ] Run `npm run build` to verify build succeeds
- [ ] Commit with message: `chore: remove unused services, hooks, and utilities`

**Note:** `lib/hooks/use-setup-progress.ts` removed from this phase - still actively used by setup flow

**Estimated Time:** 30 minutes
**Risk Level:** ✅ Minimal (zero imports = safe removal)

---

### Phase 2: Component Consolidation (Week 2)
**Goal:** Consolidate component variants and remove duplicates

**Todo Card Cleanup:**
- [ ] Verify `todo-card-v3.tsx` is actively used in routes
- [ ] Check if `todo-card-v2.tsx` has unique features needed by v3
- [ ] Search for all imports of `todo-card.tsx` and `todo-card-v2.tsx`
- [ ] Migrate any v2 usage to v3 (if any)
- [ ] Delete `components/todos/todo-card.tsx` (v1)
- [ ] Delete `components/todos/todo-card-v2.tsx`
- [ ] Rename `todo-card-v3.tsx` → `todo-card.tsx`
- [ ] Update imports to use new `todo-card.tsx` path

**Filter Bar Cleanup:**
- [ ] Verify `unified-search-filters-bar-v2.tsx` is in use
- [ ] Search for imports of `unified-search-filters-bar.tsx` (v1)
- [ ] Delete `components/todos/filters/unified-search-filters-bar.tsx` (v1)
- [ ] Rename `unified-search-filters-bar-v2.tsx` → `unified-search-filters-bar.tsx`
- [ ] Update imports to use new path

**Dashboard & Notification Cleanup:**
- [ ] Delete `components/dashboard/TimeSelector.tsx`
- [ ] Delete `components/dashboard/TrendIndicator.tsx`
- [ ] Delete `components/notifications/notification-bell.tsx`

**Verification:**
- [ ] Run `npm run check`
- [ ] Run `npm run build`
- [ ] Test todo list functionality manually
- [ ] Test dashboard displays correctly
- [ ] Commit with message: `chore: consolidate component variants and remove duplicates`

**Estimated Time:** 1-2 hours
**Risk Level:** ⚠️ Medium (requires testing)

---

### Phase 3: Final Cleanup (Week 3)
**Goal:** Clean up test files and outdated comments

**Test Cleanup:**
- [ ] Evaluate if `components/toast-test.tsx` test is still valuable
- [ ] If outdated, delete `components/toast-test.tsx`
- [ ] Update or remove test in `__tests__/translations/hardcoded-text.test.ts`

**Comment Cleanup:**
- [ ] Remove draft batch references in `components/scanning/shared/inventory-form.tsx`
- [ ] Remove draft batch references in `components/dashboard/delivery-banner.tsx`
- [ ] Search codebase for other "draft" comments: `grep -r "draft batch" components/`

**Verification:**
- [ ] Run `npm run check`
- [ ] Run test suite
- [ ] Commit with message: `chore: remove outdated test files and draft batch comments`

**Estimated Time:** 30 minutes
**Risk Level:** ✅ Minimal

---

## 🛡️ Risk Assessment & Rollback

### Risk Levels
- **✅ Minimal Risk:** Files with zero imports (Phase 1)
- **⚠️ Medium Risk:** Component consolidation requiring testing (Phase 2)
- **🔴 High Risk:** None identified

### Pre-Execution Safety Checks
Before each phase:
1. ✅ Ensure working directory is clean (`git status`)
2. ✅ Create feature branch: `git checkout -b chore/dead-code-cleanup-phase-N`
3. ✅ Run full build and type check
4. ✅ Verify csv-upload and scanning code still work

### Rollback Strategy
If issues arise:
```bash
# Rollback to previous commit
git reset --hard HEAD~1

# Or restore specific file from git
git checkout HEAD -- path/to/file.tsx
```

### Post-Execution Verification
After each phase:
- [ ] `npm run check` passes
- [ ] `npm run build` succeeds
- [ ] Manual testing of core features:
  - [ ] CSV upload flow works
  - [ ] Scanning flow works
  - [ ] Dashboard loads correctly
  - [ ] Todo list displays properly

---

## 📊 Progress Tracking

| Phase | Status | Files Removed | Lines Saved | Completed Date |
|-------|--------|---------------|-------------|----------------|
| Phase 1 | ⏳ Not Started | 0/5 | 0/~500 | - |
| Phase 2 | ⏳ Not Started | 0/6 | 0/~400 | - |
| Phase 3 | ⏳ Not Started | 0/2 | 0/~50 | - |
| **Total** | **0%** | **0/13** | **0/~950** | - |

---

## 📝 Notes & Decisions

### Decision Log
- **2026-02-11:** Created cleanup plan after draft batch removal
- **2026-02-11 (Updated):** Removed `lib/hooks/use-setup-progress.ts` from Phase 1 - still actively used by setup flow components
- **Preservation:** Confirmed csv-upload-form and scanning code must be preserved

### Open Questions
- [ ] Should we keep `language-detection.ts` utilities for future i18n work?
- [ ] Are there any hidden dependencies on removed hooks via dynamic imports?
- [ ] Should `toast-test.tsx` be converted to a proper test or removed?

### Future Considerations
- Consider running a dependency analysis tool (e.g., `depcheck`, `knip`) to find more dead code
- Set up pre-commit hooks to prevent accumulation of unused exports
- Document component version strategy to prevent future v1/v2/v3 proliferation

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- ✅ All zero-import files removed
- ✅ Build passes
- ✅ No type errors
- ✅ CSV upload works
- ✅ Scanning works

**Phase 2 Complete When:**
- ✅ Only one version of each component exists
- ✅ All imports updated
- ✅ Todo list functional
- ✅ Dashboard functional

**Phase 3 Complete When:**
- ✅ No outdated comments remain
- ✅ Test suite passes
- ✅ Codebase cleaner and more maintainable

**Overall Success:**
- ~950 lines of dead code removed (revised after verification)
- No regression in functionality
- Improved code maintainability
- Easier onboarding for new developers

---

## Related Documents
- [Draft Batches Removal Migration Plan](./DRAFT_BATCHES_REMOVAL_MIGRATION_PLAN.md) - Previous cleanup effort
- [Phase 0 Investigation Report](./PHASE_0_INVESTIGATION_REPORT.md) - Investigation methodology

---

**Next Steps:**
1. Review this plan with team
2. Get approval to proceed with Phase 1
3. Create feature branch: `chore/dead-code-cleanup-phase-1`
4. Execute Phase 1 checklist
5. Submit PR for review
