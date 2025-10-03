# Query Integration Tests

This directory contains both unit and integration tests for database query functions.

## Test Types

### Unit Tests (`*.test.ts`)
- Fast, isolated tests using mocked Supabase client
- Run by default in CI/CD
- No database connection required
- Example: `store-users.test.ts`

### Integration Tests (`*.integration.test.ts`)
- Can run in two modes: **mock** (default) or **real database**
- Use mocked Supabase client by default for speed
- Can optionally connect to real Supabase instance for E2E testing

## Running Tests

### Run All Tests (Mock Mode - Default)
```bash
npm test
```

### Run Specific Test File
```bash
npm test -- __tests__/lib/queries/store-users.test.ts
```

### Run Integration Tests Against Real Database
```bash
# Start local Supabase instance
npm run supabase:start

# Run integration tests with real database
RUN_INTEGRATION_TESTS=true npm test -- store-users.integration.test.ts
```

## Integration Test Modes

### Mock Mode (Default)
- Uses `jest.mock()` to intercept Supabase client calls
- Fast execution (~200ms)
- No external dependencies
- Verifies code logic and error handling

### Real Database Mode
- Connects to actual Supabase instance
- Tests RLS policies, triggers, and database functions
- Requires:
  - Local Supabase running (`npm run supabase:start`)
  - Test data seeded in database
  - Valid `.env.test.local` configuration

## Test Structure

```typescript
// Mock mode example
it('removes user successfully', async () => {
  if (!RUN_INTEGRATION) {
    // Setup mock response
    mockSupabaseClient.rpc.mockResolvedValue({
      data: { success: true, /* ... */ },
      error: null,
    })
  }

  // Test runs against mock OR real database
  await removeUserFromStore(storeId, userId)

  if (!RUN_INTEGRATION) {
    // Verify mock was called correctly
    expect(mockSupabaseClient.rpc).toHaveBeenCalledWith(/*...*/)
  }
})
```

## Writing Integration Tests

1. **Add conditional mocking**:
   ```typescript
   if (!RUN_INTEGRATION) {
     // Setup mocks
   }
   ```

2. **Use flexible assertions**:
   ```typescript
   if (!RUN_INTEGRATION) {
     expect(result).toMatchObject(expectedMock)
   } else {
     expect(result).toBeDefined()
   }
   ```

3. **Test both success and error paths**

4. **Document prerequisites** for real database mode

## Performance Monitoring

All query functions now include performance tracking:

```typescript
const timer = new PerformanceTimer(context, 'RPC: remove_user_from_store', metadata)
// ... operation ...
timer.end({ success: true, additionalMetadata })
```

Performance logs show:
- ✅ **Success** if <200ms
- ⚠️ **Warning** if 200-300ms
- 🚨 **Error** if >300ms (mobile performance target)

## Test Coverage

Current coverage for `store-users` queries:

- **Unit Tests**: 9 tests (core RPC functionality)
- **Hook Tests**: 24 tests (React Query integration)
- **Integration Tests**: 6 tests (end-to-end workflows)
- **Total**: 39 tests ✅

## CI/CD Integration

Integration tests run in **mock mode** in CI/CD for speed and reliability. Real database tests can be run manually or in a dedicated E2E test environment.
