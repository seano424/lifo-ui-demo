# Frontend Testing Guide

Welcome to the frontend testing guide! This document will help you write and run tests for the Next.js application.

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs when files change)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## What We Test

Focus on testing these areas (in order of priority):

### 1. **Utility Functions** (High Value, Easy)
- Pure functions in `lib/utils/`
- Data transformations
- Validation logic

**Why:** Easy to test, catch bugs early, high confidence

**Example:** `lib/utils/validation-utils.ts`

### 2. **API Query Functions** (High Value, Medium Difficulty)
- Functions in `lib/queries/`
- Supabase interactions
- Data fetching logic

**Why:** Critical business logic, prevent API integration bugs

**Example:** `lib/queries/batches.ts`

### 3. **React Query Hooks** (High Value, Medium Difficulty)
- Custom hooks using React Query
- Mutation logic
- Cache invalidation

**Why:** Test user interactions, state management

**Example:** `components/scanning/scan-out/use-scan-out-actions.ts`

### 4. **Complex Components** (Lower Priority)
- Only test components with complex logic
- Skip simple presentational components

**Why:** Time-consuming, often brittle, less valuable than logic tests

## Test File Organization

```
__tests__/
├── setup/
│   └── test-utils.tsx        # Reusable test utilities
├── mocks/
│   └── supabase.ts            # Supabase mocking helpers
├── lib/
│   ├── utils/
│   │   └── validation-utils.test.ts
│   └── queries/
│       └── batches.test.ts
└── components/
    └── scanning/
        └── use-scan-out-actions.test.tsx
```

**Naming convention:** `[filename].test.ts` or `[filename].test.tsx`

## Writing Tests

### Testing Utility Functions

**✅ Good Example:**

\`\`\`typescript
import { createPostalCodeValidator } from '@/lib/utils/validation-utils'

describe('createPostalCodeValidator', () => {
  it('validates French postal codes correctly', () => {
    const validator = createPostalCodeValidator('France')

    // Valid
    expect(validator.safeParse('75001').success).toBe(true)

    // Invalid
    expect(validator.safeParse('7500').success).toBe(false)
  })
})
\`\`\`

**Key points:**
- Test multiple scenarios (valid, invalid, edge cases)
- Clear test names that describe what's being tested
- Simple assertions

### Testing API Query Functions

**✅ Good Example:**

\`\`\`typescript
import { fetchBatchesPage } from '@/lib/queries/batches'

// Mock Supabase
jest.mock('@/lib/supabase/client')

describe('fetchBatchesPage', () => {
  it('fetches batches with pagination', async () => {
    const mockClient = {
      schema: jest.fn().mockReturnThis(),
      from: jest.fn((table) => {
        if (table === 'batches') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({
              data: [{ batch_id: '1', /* ... */ }],
              error: null,
              count: 1,
            }),
          }
        }
        // Handle products query
        return {
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ product_id: '1', product_name: 'Test' }],
            error: null,
          }),
        }
      }),
    }

    const result = await fetchBatchesPage(
      { page: 0, pageSize: 10 },
      { storeId: 'store-1' },
      mockClient as any
    )

    expect(result.data.length).toBe(1)
    expect(result.count).toBe(1)
  })
})
\`\`\`

**Key points:**
- Mock Supabase client to avoid real database calls
- Handle method chaining (`.schema().from().select()...`)
- Test both success and error cases

### Testing React Query Hooks

**✅ Good Example:**

\`\`\`typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useScanOutActions } from '@/components/scanning/scan-out/use-scan-out-actions'
import { createWrapper } from '@/__tests__/setup/test-utils'

describe('useScanOutActions', () => {
  it('submits checkout successfully', async () => {
    // Mock Supabase responses
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    const { result } = renderHook(() => useScanOutActions(), {
      wrapper: createWrapper(),
    })

    result.current.submitCheckout([{
      batchId: 'batch-1',
      quantityRemoved: 5,
      reason: 'sale',
      storeId: 'store-1',
    }])

    await waitFor(() => expect(result.current.isSubmittingCheckout).toBe(false))

    expect(result.current.checkoutResult?.success).toBe(true)
  })
})
\`\`\`

**Key points:**
- Use `renderHook` from `@testing-library/react`
- Wrap with `createWrapper()` for React Query context
- Use `waitFor` for async operations

## Common Patterns

### Mocking Supabase

\`\`\`typescript
// At the top of your test file
jest.mock('@/lib/supabase/client')

const mockSupabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  // ... other methods
}

;(createClient as jest.Mock).mockReturnValue(mockSupabase)
\`\`\`

### Testing Async Functions

\`\`\`typescript
it('handles async operations', async () => {
  const result = await someAsyncFunction()
  expect(result).toBeDefined()
})
\`\`\`

### Testing Error Cases

\`\`\`typescript
it('throws error on invalid input', async () => {
  await expect(functionThatThrows()).rejects.toThrow('Expected error message')
})
\`\`\`

## What NOT to Test

❌ **Don't test:**
- Next.js framework behavior
- Third-party library internals
- Simple presentational components with no logic
- UI snapshots (they break constantly)
- Every single edge case from day 1

## Common Questions

### Q: Do I need to write tests for every file?

**A:** No. Start with:
1. New features you're adding
2. Critical business logic (inventory, scoring, donations)
3. Complex utility functions

Don't worry about 100% coverage initially. Aim for 40-50%, then gradually increase.

### Q: When should I run tests?

**A:**
- Before committing code
- Before creating a pull request
- In CI/CD pipeline (if you set it up)

Use `npm run test:watch` while developing to catch issues immediately.

### Q: What if my test fails?

**A:**
1. Read the error message carefully
2. Check if your mock is set up correctly
3. Use `console.log` to debug (comment out the suppression in `jest.setup.ts`)
4. Ask for help in team chat

### Q: How do I test API calls to the FastAPI backend?

**A:** Mock them like Supabase:

\`\`\`typescript
jest.mock('@/lib/services/fastapi-client')

mockFastAPIClient.post.mockResolvedValue({
  data: { /* your response */ }
})
\`\`\`

### Q: My test is slow. What do I do?

**A:**
- Make sure you're mocking all external calls (Supabase, APIs)
- Avoid using `setTimeout` or long waits
- Use `jest.useFakeTimers()` for time-based tests

### Q: Should I delete tests after the feature works?

**A:** **No!** Tests are documentation and prevent regressions. Keep them forever (unless the feature is deleted).

## Tips for Success

1. **Write tests as you code** - Don't leave testing for the end
2. **Keep tests simple** - One test should check one thing
3. **Use descriptive names** - "it('validates French postal codes')" not "it('works')"
4. **Don't test implementation details** - Test behavior, not internals
5. **Mock external dependencies** - Keep tests fast and reliable
6. **Test the happy path first** - Then add error cases
7. **Ask for help** - Testing has a learning curve, that's normal!

## Example Test Workflow

1. **Write the function** (or feature)
2. **Create test file** alongside it
3. **Write one simple test** (happy path)
4. **Run test** - `npm run test:watch`
5. **Add more tests** (edge cases, errors)
6. **Refactor** with confidence

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [React Query Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)

## Getting Help

- Check existing tests in `__tests__/` for examples
- Ask in team chat: "How do I test X?"
- Pair with another dev on your first few tests

---

**Remember:** Testing is a skill that improves with practice. Start small, learn as you go, and don't aim for perfection on day 1! 🚀