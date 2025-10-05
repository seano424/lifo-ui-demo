# Performance Fix: Eliminate Duplicate Queries on Page Load

## Problem Statement

The application is making 18+ duplicate queries on page load, causing 10-15 second load times. The database is optimized (<1ms queries), but React Query caching is not being utilized properly.

## Root Causes Identified

### Issue #1: 6x Duplicate `currentUserStoreRole` Queries ⚠️⚠️⚠️
- **Current State**: 6 components call `usePermissions()`, each making separate RPC calls to `get_user_store_role`
- **Impact**: 6x redundant network calls for the same data
- **Solution**: Replace `usePermissions()` with `usePermissionsNew()` which uses the consolidated `useCompleteUserProfile()` hook

### Issue #2: `useUnifiedSettings` Bypasses React Query Cache ⚠️⚠️
- **Current State**: `hooks/use-unified-settings.ts:23` directly calls `fetchStoreUsers()` inside a `queryFn`
- **Impact**: Makes uncached network request even when data exists in React Query cache
- **Solution**: Replace direct function calls with React Query hooks (`useStoreUsers()`, `useStoreSettings()`)

### Issue #3: Multiple Auth Events Cause Cascading Invalidations ⚠️
- **Current State**: `INITIAL_SESSION` + 2-3x `SIGNED_IN` events each invalidate all store queries
- **Impact**: Triggers cascading refetches across entire application
- **Solution**: Debounce auth event handlers to wait for events to settle before invalidating

## Expected Results

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| `currentUserStoreRole` queries | 6+ | 1 | 1 |
| `get_store_users` calls | 3+ | 1 | 1 |
| Total page load queries | 18+ | 3-4 | <5 |
| Page load time | 10-15s | 1-2s | <1s |

---

## Implementation Plan

### ✅ Fix #1: Replace `usePermissions()` with `usePermissionsNew()` (Estimated: 10 min)

**Files to modify**: All components using `usePermissions()` or `useUserRole()`

**Found in**:
- `components/store-users/store-users-list.tsx:102-104`
- Search for all other instances with: `grep -r "usePermissions()" --include="*.tsx" --include="*.ts"`

**Change**:
```typescript
// BEFORE:
import { usePermissions, useUserRole } from '@/hooks/use-users'
const clientPermissions = usePermissions()
const { isOwner, isManager } = useUserRole()

// AFTER:
import { usePermissionsNew } from '@/hooks/use-complete-user-profile'
const { isOwner, isManager, canManageUsers, userId } = usePermissionsNew()
```

**Steps**:
1. Search for all files using `usePermissions()` or `useUserRole()`
2. Replace imports from `@/hooks/use-users` with `@/hooks/use-complete-user-profile`
3. Update destructured properties to match `usePermissionsNew()` return values
4. Remove any duplicate calls (e.g., calling both `usePermissions()` AND `useUserRole()`)

---

### ✅ Fix #2: Rewrite `useUnifiedSettings` to Use React Query Cache (Estimated: 5 min)

**File**: `hooks/use-unified-settings.ts`

**Current Code** (lines 9-36):
```typescript
export function useUnifiedSettings() {
  const storeId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  return useQuery({
    queryKey: ['unified-settings', storeId, currentUser?.id],
    queryFn: async () => {
      if (!storeId) {
        throw new Error('No store ID available')
      }

      // ⚠️ PROBLEM: Direct function calls bypass React Query cache
      const [storeSettings, storeUsers] = await Promise.all([
        fetchStoreSettings(storeId),
        fetchStoreUsers(storeId),  // This makes a fresh network call!
      ])

      return {
        store: storeSettings,
        team: storeUsers,
        user: currentUser,
      }
    },
    enabled: !!storeId && !!currentUser,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}
```

**New Code**:
```typescript
import { useStoreSettings } from '@/hooks/use-store-settings'
import { useStoreUsers } from '@/hooks/use-store-users'
import { useCurrentUser } from '@/hooks/use-users'
import { useActiveStoreId } from '@/lib/stores/store-context'

export function useUnifiedSettings() {
  const storeId = useActiveStoreId()
  const { data: currentUser } = useCurrentUser()

  // ✅ SOLUTION: Use React Query hooks to leverage caching
  const { data: storeSettings, isLoading: loadingSettings } = useStoreSettings(storeId)
  const { data: storeUsers, isLoading: loadingUsers } = useStoreUsers({}, 100)

  const isLoading = loadingSettings || loadingUsers || !currentUser

  return {
    data: {
      store: storeSettings,
      team: storeUsers,
      user: currentUser,
    },
    isLoading,
    store: storeSettings,
    team: storeUsers,
    user: currentUser,
  }
}
```

**Steps**:
1. Add imports for `useStoreSettings` and `useStoreUsers`
2. Replace the `useQuery` wrapper with direct hook calls
3. Combine loading states
4. Return both nested (`data`) and flat properties for backward compatibility

---

### ✅ Fix #3: Debounce Auth Event Invalidations (Estimated: 15 min)

**File**: `hooks/use-auth-state-monitor.ts`

**Current Code** (lines 73-96):
```typescript
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    logger.log('AuthStateMonitor', `Auth event: ${event}`, {
      hasSession: !!session,
      userInitiated: logoutStateManager.isUserInitiated(),
      hasShownToast: hasShownLogoutToast.current,
    })

    if (event === 'SIGNED_IN') {
      // ⚠️ PROBLEM: Multiple SIGNED_IN events cause cascading invalidations
      logoutStateManager.reset()
      hasShownLogoutToast.current = false

      // Invalidate user queries to refresh user data
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })

      // Force refresh of store-related queries to prevent showing old user's stores
      queryClient.invalidateQueries({ queryKey: queryKeys.stores.all })  // Too broad!
      queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.all })

      logger.log('AuthStateMonitor', 'User signed in, refreshing user data and stores')
    }
    // ... rest of handler
  })

  return () => {
    subscription.unsubscribe()
  }
}, [router, queryClient, supabase.auth, setActiveStore, setUserStores])
```

**New Code**:
```typescript
useEffect(() => {
  // ✅ Add debounce timeout ref
  const invalidateTimeout = { current: null as NodeJS.Timeout | null }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    logger.log('AuthStateMonitor', `Auth event: ${event}`, {
      hasSession: !!session,
      userInitiated: logoutStateManager.isUserInitiated(),
      hasShownToast: hasShownLogoutToast.current,
    })

    if (event === 'SIGNED_IN') {
      logoutStateManager.reset()
      hasShownLogoutToast.current = false

      // ✅ SOLUTION: Debounce invalidations to avoid cascading refetches
      if (invalidateTimeout.current) {
        clearTimeout(invalidateTimeout.current)
      }

      invalidateTimeout.current = setTimeout(() => {
        // Invalidate user queries
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() })

        // ✅ More targeted invalidation - only user's stores, not ALL stores
        if (session?.user?.id) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.stores.userStores(session.user.id)
          })
        }

        queryClient.invalidateQueries({ queryKey: queryKeys.userPreferences.all })

        logger.log('AuthStateMonitor', 'User signed in, refreshing user data and stores')
      }, 300) // Wait 300ms for multiple events to settle
    }

    // ... rest of handler (SIGNED_OUT, TOKEN_REFRESHED)
  })

  return () => {
    // ✅ Clear timeout on unmount
    if (invalidateTimeout.current) {
      clearTimeout(invalidateTimeout.current)
    }
    logger.log('AuthStateMonitor', 'Cleaning up auth state subscription')
    subscription.unsubscribe()
  }
}, [router, queryClient, supabase.auth, setActiveStore, setUserStores])
```

**Steps**:
1. Add `invalidateTimeout` ref at the start of the `useEffect`
2. Wrap invalidation logic in `setTimeout()` with 300ms delay
3. Clear existing timeout before setting new one (debouncing)
4. Replace broad `queryKeys.stores.all` with targeted `queryKeys.stores.userStores(userId)`
5. Clear timeout in cleanup function

---

## Testing Checklist

After implementing all fixes, verify:

- [ ] **Check React Query DevTools**: Should see only 1 instance of each query key
  - `["currentUser", "storeRole", "<storeId>"]` - should have 1 instance (not 6)
  - `["storeUsers", "byStore", "<storeId>", "infinite", {...}]` - should have 1 instance (not 3)

- [ ] **Check Console Logs**: Should see reduced `[fetchStoreUsers]` calls
  - Before: 3+ calls with different store IDs
  - After: 1 call for the active store only

- [ ] **Check Network Tab**: Count RPC calls to Supabase
  - Before: 18+ calls to `get_store_users`, `get_user_store_role`, etc.
  - After: 3-4 total calls

- [ ] **Check Auth Events**: Should see debounced invalidations
  - Before: Each `SIGNED_IN` event triggers immediate invalidation
  - After: Multiple `SIGNED_IN` events trigger only 1 invalidation after 300ms

- [ ] **Verify Page Load Time**: Should be significantly faster
  - Before: 10-15 seconds
  - After: 1-2 seconds

- [ ] **Test Store Switching**: Verify no performance regression
  - Switch between stores in the UI
  - Should see cache hits for previously visited stores

- [ ] **Verify Functionality**: All features still work
  - User permissions display correctly
  - Store users list loads properly
  - Settings page shows correct data
  - No console errors

---

## Code Quality Checks

Before committing:

```bash
# Run type checking
npm run typecheck

# Run linting
npm run check

# Auto-fix linting issues
npm run check:fix

# Run tests (if applicable)
npm test
```

---

## Rollback Plan

If issues arise after deployment:

1. **Revert Fix #1**: Change imports back to `usePermissions()` from `use-users.ts`
2. **Revert Fix #2**: Restore `useQuery` wrapper in `use-unified-settings.ts`
3. **Revert Fix #3**: Remove debouncing from auth event handler

Each fix is independent, so they can be reverted individually.

---

## Additional Context

### Why 3 Different Store IDs Were Queried

The user has 3 stores in their account:
- `8e380e2d-81bb-40c4-9da3-ce75c0df5e78`
- `bf4a3585-9963-4161-850a-491484687cbf`
- `11111111-1111-1111-1111-111111111111`

During page load, `useUserStores()` fetches all stores, then `selectDefaultStore()` logic evaluates which to set as active. During this evaluation, `activeStoreId` changes multiple times, triggering components to refetch data for each store.

**The fixes prevent these rapid refetches by**:
1. Using cached data (Fix #1 & #2)
2. Debouncing invalidations (Fix #3)

### Why Network Latency is 1-3 Seconds

The database query is <1ms (already optimized!), but the full round trip includes:
- DNS resolution: ~50-100ms
- TLS handshake: ~100-200ms
- Network latency to Supabase EU-West-3: ~200-500ms
- PostgREST processing: ~100-300ms
- Response parsing: ~50-100ms

**Total**: ~500-1200ms per call (can reach 3s with network variability)

This is **NOT fixable in code** - it requires infrastructure changes (CDN, edge caching, regional optimization). However, by reducing the number of calls from 18+ to 3-4, we reduce total wait time significantly.

---

## Success Criteria

✅ **Fix is successful if**:
1. React Query DevTools shows 1 instance per query (not 6)
2. Console shows 1 `[fetchStoreUsers]` call (not 3+)
3. Network tab shows 3-4 total RPC calls (not 18+)
4. Page load completes in 1-2 seconds (not 10-15s)
5. All functionality works correctly (no regressions)

---

## Questions or Issues?

If you encounter problems during implementation:

1. **TypeScript errors**: Check that `usePermissionsNew()` return type matches usage
2. **Infinite loops**: Verify dependency arrays in `useEffect` hooks
3. **Stale data**: Check `staleTime` and `gcTime` settings in React Query config
4. **Missing data**: Ensure `enabled` flags are set correctly in queries

---

## Start Implementation

**Suggested order**:
1. ✅ Start with Fix #2 (useUnifiedSettings) - biggest impact, easiest to verify
2. ✅ Then Fix #3 (auth debouncing) - prevents cascading issues
3. ✅ Finally Fix #1 (replace usePermissions) - most files to touch, but straightforward

**Estimated total time**: 30 minutes

Good luck! 🚀
