import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactElement } from 'react'

/**
 * Create a fresh QueryClient for each test
 * This prevents test pollution and flaky tests
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Turn off retries for tests
        retry: false,
        // Don't cache results between tests
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Wrapper component for React Query tests
 */
interface WrapperProps {
  children: React.ReactNode
}

export function createWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient()

  return function Wrapper({ children }: WrapperProps) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

/**
 * Custom render function that includes React Query provider
 * Use this instead of @testing-library/react's render for components that use React Query
 */
export function renderWithQueryClient(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & { queryClient?: QueryClient },
) {
  const { queryClient, ...renderOptions } = options || {}
  const wrapper = createWrapper(queryClient)

  return render(ui, { wrapper, ...renderOptions })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { renderWithQueryClient as render }