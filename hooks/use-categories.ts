import { useQuery } from '@tanstack/react-query'
import { useLocale } from 'next-intl'
import { getLocalizedCategoryName } from '@/lib/category-translations'
import { type Category, fetchCategories } from '@/lib/queries/products'
import { queryKeys } from '@/lib/queries/query-keys'

/**
 * Reusable hook for fetching and accessing standardized product categories
 * Used across product forms, CSV upload, and other category selection components
 */
export function useCategories() {
  const locale = useLocale()

  const result = useQuery({
    queryKey: queryKeys.categories.list,
    queryFn: () => fetchCategories(),
    staleTime: 5 * 60 * 1000, // 5 minutes - categories don't change often
    retry: 2,
  })

  return {
    categories: result.data || [],
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,

    // Helper functions for common operations
    getCategoryById: (categoryId: string) =>
      result.data?.find((cat: Category) => cat.category_id === categoryId),

    getCategoryByCode: (categoryCode: string) =>
      result.data?.find((cat: Category) => cat.category_code === categoryCode),

    getDefaultCategory: () =>
      result.data?.find((cat: Category) => cat.category_code === 'dry_goods') || result.data?.[0],

    // For dropdown/select components - now localized
    getCategoriesForDropdown: () =>
      result.data?.map((cat: Category) => ({
        value: cat.category_id,
        label: getLocalizedCategoryName(cat, locale),
        code: cat.category_code,
      })) || [],

    // Get localized display name for a category
    getLocalizedName: (category: Category) => getLocalizedCategoryName(category, locale),
  }
}
