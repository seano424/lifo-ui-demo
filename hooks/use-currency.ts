import { useMemo } from 'react'
import { useStoreSettings } from '@/hooks/use-store-settings'
import { getCurrencySymbol } from '@/lib/utils/currency'

/**
 * Hook to get the currency symbol for the current store
 *
 * This hook leverages React Query's built-in caching by calling useStoreSettings()
 * and memoizing the currency symbol extraction. All components using this hook
 * will share the same React Query subscription, preventing multiple API requests
 * and unnecessary re-renders.
 *
 * @returns Currency symbol (e.g., '€', '$', '£')
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const currencySymbol = useCurrency()
 *   return <div>Price: {currencySymbol}10.00</div>
 * }
 * ```
 */
export function useCurrency(): string {
  const { data: storeSettings } = useStoreSettings()

  return useMemo(
    () => getCurrencySymbol(storeSettings?.settings?.currency),
    [storeSettings?.settings?.currency],
  )
}
