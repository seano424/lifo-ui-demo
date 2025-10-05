# Remove User from Store RPC Function

**Migration**: `025_add_remove_user_from_store_rpc.sql`
**Created**: 2025-01-03
**Purpose**: Permanently removes users from stores using SECURITY DEFINER to bypass RLS restrictions

## Overview

This RPC function provides a secure way to permanently delete a user's association with a store by removing their row from the `business.store_users` table. It bypasses RLS restrictions while enforcing proper permission checks.

## Problem Solved

Previously, `removeUserFromStore` attempted direct table updates which were blocked by RLS policies that only allow users to update their own records (`user_id = auth.uid()`). When managers/owners tried to remove other users, Supabase returned an empty error object `{}` instead of descriptive errors.

## Function Signature

```sql
public.remove_user_from_store(
  p_store_id UUID,
  p_target_user_id UUID
) RETURNS JSON
```

## Permission Model

- **Owners**: Can remove anyone except themselves
- **Managers**: Can remove employees/staff only (enforced by `user_can_manage_store_users`)
- **Employees/Staff**: Cannot remove anyone
- **Self-protection**: No one can remove themselves

## Security Features

- Uses `SECURITY DEFINER` to bypass RLS restrictions
- Enforces permission checks via `business.user_can_manage_store_users()` function
- Prevents self-removal
- Validates user exists before deletion
- Full audit trail in JSON response
- Exception handling with descriptive error messages

## Usage

### TypeScript (from `lib/queries/store-users.ts`)

```typescript
export async function removeUserFromStore(
  storeId: string,
  userId: string
): Promise<void> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('remove_user_from_store', {
    p_store_id: storeId,
    p_target_user_id: userId,
  })

  if (error) {
    logger.error('removeUserFromStore', 'RPC error', {
      error: error.message,
      code: error.code,
      storeId,
      userId,
    })
    throw new Error(`Failed to remove user from store: ${error.message}`)
  }

  if (!data?.success) {
    logger.error('removeUserFromStore', 'RPC returned failure', {
      rpcError: data?.error,
      storeId,
      userId,
    })
    throw new Error(data?.error || 'Failed to remove user from store')
  }

  logger.log('removeUserFromStore', 'User removed successfully', {
    storeId,
    userId,
    removedBy: data?.removed_by,
    removedUserRole: data?.removed_user_role,
  })
}
```

### SQL (Direct)

```sql
SELECT public.remove_user_from_store(
  'store-uuid-here'::UUID,
  'user-uuid-to-remove'::UUID
);
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "User permanently removed from store",
  "removed_user_id": "097f1906-3da0-4607-b283-2dbfd6893322",
  "removed_user_role": "employee",
  "was_active": true,
  "removed_by": "cfd2c759-576f-4ef4-b2eb-75f1a53c5258",
  "removed_at": "2025-01-03T19:30:00Z"
}
```

### Error Responses

```json
// Not authenticated
{
  "success": false,
  "error": "User must be authenticated"
}

// Insufficient permissions
{
  "success": false,
  "error": "Insufficient permissions to manage this user"
}

// User not found
{
  "success": false,
  "error": "User not found in this store"
}

// Trying to remove self
{
  "success": false,
  "error": "Cannot remove yourself from the store"
}

// Unexpected error
{
  "success": false,
  "error": "An unexpected error occurred: <SQL error message>"
}
```

## Testing

### Unit Tests

See `__tests__/lib/queries/store-users.test.ts` for comprehensive test coverage:

- ✅ Correct RPC parameter passing
- ✅ Successful user removal
- ✅ Supabase RPC errors
- ✅ Permission denied scenarios
- ✅ User not found scenarios
- ✅ Self-removal prevention
- ✅ Network/unexpected errors
- ✅ Missing error message handling

### Integration Tests

See `__tests__/hooks/use-store-users.test.tsx`:

- ✅ RPC permission errors handling
- ✅ RPC user not found errors handling

### Manual Testing

```sql
-- Check current users
SELECT user_id, role_in_store, is_active
FROM business.store_users
WHERE store_id = 'your-store-id';

-- Remove a user
SELECT public.remove_user_from_store(
  'your-store-id'::UUID,
  'user-id-to-remove'::UUID
);

-- Verify removal (should return 0)
SELECT COUNT(*) FROM business.store_users
WHERE store_id = 'your-store-id' AND user_id = 'user-id-to-remove';
```

## Performance

- **Target**: <300ms (mobile performance requirement)
- **Actual**: Single RPC call with minimal database operations
  - Permission check via indexed query
  - Single DELETE operation on indexed columns (store_id, user_id)

## Related Files

- **Migration**: `supabase/migrations/025_add_remove_user_from_store_rpc.sql`
- **TypeScript Implementation**: `lib/queries/store-users.ts`
- **Unit Tests**: `__tests__/lib/queries/store-users.test.ts`
- **Integration Tests**: `__tests__/hooks/use-store-users.test.tsx`

## See Also

- `business.user_can_manage_store_users()` - Permission validation function
- RLS policies on `business.store_users` table
- `updateStoreUser` - For non-destructive updates (e.g., changing roles)
