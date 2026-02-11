# Draft Batches Removal - Quick Reference

**Full Plan**: See `DRAFT_BATCHES_REMOVAL_MIGRATION_PLAN.md`

## 🎯 Quick Stats

- **Active Code to Migrate**: ~1,700 lines across 12+ files
- **Dead Code to Delete**: ~380 lines across 5 files
- **Estimated Timeline**: 7 days (frontend only)
- **Backend Dependency**: Yes - requires backend changes first

---

## ✅ Phase Checklist (Copy to Issues/Tasks)

### Phase 0: Investigation (0.5d) ⏳
```
- [ ] Verify DeliveryLogSheet usage
- [ ] Verify BatchCreationSheet internals
- [ ] Verify ignored batches page status
- [ ] Check production draft batch count
- [ ] Review CSV upload flow
- [ ] Coordinate with backend team
```

### Phase 1: Delete Dead Code (0.5d) 🗑️
```
- [ ] Delete app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx
- [ ] Delete components/batches/draft-batches-list.tsx
- [ ] Delete components/batches/draft-batches-header.tsx
- [ ] Delete components/batches/complete-draft-batch-dialog.tsx
- [ ] Remove useDraftBatches() from hooks/use-batches.ts
- [ ] Verify build passes
- [ ] Commit changes
```

### Phase 2: Backend Migration (TBD) 🔧
```
- [ ] Define new API contract (requires expiry dates)
- [ ] Implement backend changes
- [ ] Migrate existing draft batches
- [ ] Deploy backend
- [ ] Verify API changes
```

### Phase 3: Design New Workflows (0.5d) 🎨
```
- [ ] Document proposed workflows
- [ ] Create mockups/wireframes
- [ ] Get stakeholder approval
- [ ] Update requirements
```

### Phase 4: Update Filters & Tables (0.5d) 📊
```
- [ ] Remove "draft" from batch-list-filters.tsx
- [ ] Update BatchFilters type in batches.ts
- [ ] Remove excludeDrafts logic
- [ ] Update batch-utils.tsx helpers
- [ ] Test filtering still works
- [ ] Commit changes
```

### Phase 5: Remove Core Hooks (1d) 🪝
```
- [ ] Remove unused hooks from use-draft-batches.ts
- [ ] Remove query functions
- [ ] Remove remaining hooks
- [ ] Remove query keys
- [ ] Delete entire file
- [ ] Test build
- [ ] Commit changes
```

### Phase 6: Dashboard & Navigation (1d) 🏠
```
- [ ] Remove DeliveryBanner from dashboard
- [ ] Delete delivery-banner.tsx
- [ ] Delete use-delivery-banner-visible.ts
- [ ] Remove draft count badge from sidebar
- [ ] Delete draft-batch-notification.tsx
- [ ] Test dashboard loads
- [ ] Commit changes
```

### Phase 7: Handle /inventory/new (1d) 📄
```
- [ ] Implement chosen approach from Phase 3
- [ ] Delete or update /inventory/new page
- [ ] Delete draft-batch-card.tsx (if needed)
- [ ] Update navigation links
- [ ] Test user flows
- [ ] Commit changes
```

### Phase 8: Types & Validation (0.5d) 📝
```
- [ ] Remove draft types from rpc-returns.ts
- [ ] Remove 'draft' from BatchStatus enum
- [ ] Remove validation schemas
- [ ] Fix TypeScript errors
- [ ] Commit changes
```

### Phase 9: CSV Upload (1d) 📤
```
- [ ] Update CSV validation logic
- [ ] Add expiry date requirements/defaults
- [ ] Update error messages
- [ ] Test CSV uploads
- [ ] Commit changes
```

### Phase 10: Cleanup & Testing (0.5d) 🧹
```
- [ ] Remove translation keys (en/fr/nl)
- [ ] Update documentation
- [ ] Search for remaining references
- [ ] Run full test suite
- [ ] Manual smoke testing
- [ ] Final commit
```

---

## 🔍 Key Files Reference

### To Delete (5 files)
```
app/(dashboard)/dashboard/(inventory)/inventory/batches/drafts/page.tsx
components/batches/draft-batches-list.tsx
components/batches/draft-batches-header.tsx
components/batches/complete-draft-batch-dialog.tsx
components/dashboard/add-delivery-button.tsx (verify first)
```

### To Fully Remove (3 files)
```
hooks/use-draft-batches.ts (815 lines)
components/dashboard/delivery-banner.tsx
hooks/use-delivery-banner-visible.ts
components/draft-batch-notification.tsx
```

### To Modify (10+ files)
```
components/app-sidebar.tsx
components/dashboard/dashboard-content.tsx
components/batches/batches-filtered-list.tsx
components/batches/batch-list-filters.tsx
lib/queries/batches.ts
lib/queries/query-keys.ts
lib/utils/batch-utils.tsx
types/rpc-returns.ts
lib/validation/rpc-schemas.ts
hooks/use-batches.ts
app/(dashboard)/dashboard/(inventory)/inventory/new/page.tsx
+ Translation files (messages/en, fr, nl)
```

---

## 🔎 Search Commands

### Find all draft references
```bash
grep -ri "draft.*batch\|batch.*draft" \
  --include="*.ts" --include="*.tsx" \
  components/ hooks/ lib/ app/
```

### Find status="draft" assignments
```bash
grep -r "status.*=.*['\"]draft['\"]" \
  --include="*.ts" --include="*.tsx"
```

### Find excludeDrafts usage
```bash
grep -r "excludeDrafts" --include="*.ts" --include="*.tsx"
```

### Find type references
```bash
grep -r "DraftBatch" --include="*.ts" --include="*.tsx"
```

---

## 🐛 Common Issues & Solutions

### Issue: TypeScript errors after removing types
**Solution**: Search for imports of removed types, update or remove them

### Issue: Runtime errors about missing hooks
**Solution**: Check if any lazy-loaded components still reference removed hooks

### Issue: Query invalidation errors
**Solution**: Remove draft-related query key invalidations

### Issue: Navigation breaks after removing /inventory/new
**Solution**: Add redirect or update all links to new destination

---

## 🧪 Testing Checklist

### Quick Smoke Test
```
- [ ] npm run build (passes)
- [ ] Dashboard loads without errors
- [ ] Navigate to /dashboard/inventory/batches
- [ ] Filter batches (no "draft" option visible)
- [ ] Create new batch manually
- [ ] Upload CSV file
- [ ] Check browser console (no errors)
```

### Full Test Suite
```
- [ ] npm run check (linting passes)
- [ ] npm run build (TypeScript compiles)
- [ ] Manual batch creation
- [ ] CSV upload (various scenarios)
- [ ] Batch filtering and sorting
- [ ] Navigation throughout app
- [ ] Mobile responsive testing
```

---

## 📞 Key Questions to Answer

### Before Starting
- [ ] How many draft batches exist in production?
- [ ] What's the backend migration plan?
- [ ] When can backend changes be deployed?

### During Phase 3 (Design)
- [ ] CSV uploads: require expiry or use defaults?
- [ ] What replaces /inventory/new page?
- [ ] Keep ignored batches feature?

### Before Deployment
- [ ] Is backend ready?
- [ ] Are existing drafts migrated?
- [ ] Do we need feature flags?
- [ ] Is user communication prepared?

---

## 🚀 Ready to Start?

1. **Read full plan**: `DRAFT_BATCHES_REMOVAL_MIGRATION_PLAN.md`
2. **Start with Phase 0**: Investigation & verification
3. **Quick win**: Phase 1 can be done immediately (delete dead code)
4. **Block on backend**: Phases 4-9 need backend migration complete
5. **Track progress**: Update checkboxes in this file or create GitHub issues

---

*Last Updated: 2026-02-11*
