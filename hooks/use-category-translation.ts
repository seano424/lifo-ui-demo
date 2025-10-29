import type { Product } from '@/lib/queries/products'
import { useLocale, useTranslations } from 'next-intl'
import { useCallback } from 'react'

/**
 * Custom hook for translating product categories using i18n
 * Provides a clean interface for getting localized category names
 */
export function useCategoryTranslation() {
  const t = useTranslations('productCategories')
  const locale = useLocale()

  const getFallbackName = useCallback(
    (product: Product): string => {
      switch (locale) {
        case 'fr':
          return product.category_display_name_fr || product.category_display_name || ''
        case 'nl':
          return product.category_display_name_nl || product.category_display_name || ''
        default:
          return product.category_display_name || ''
      }
    },
    [locale],
  )

  const getCategoryName = useCallback(
    (product: Product): string => {
      // No category code - use fallback
      if (!product.category_code) {
        return getFallbackName(product)
      }

      try {
        const translation = t(product.category_code)

        // If translation exists and is valid, use it
        if (translation && translation !== product.category_code && translation.length > 0) {
          return translation
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Translation error for category:', product.category_code, error)
        }
      }

      // Translation failed or missing - use fallback
      return getFallbackName(product)
    },
    [t, getFallbackName],
  )

  return { getCategoryName }
}
